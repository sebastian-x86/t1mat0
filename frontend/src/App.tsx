import {useCallback, useEffect, useMemo, useRef, useState} from "react";
import {EventsOn} from "../wailsjs/runtime/runtime";
import {
    GetReport,
    GetState,
    GetVersion,
    Reset,
    SetHistoryConsent,
    Skip,
    Toggle,
} from "../wailsjs/go/main/App";
import {history, timer} from "../wailsjs/go/models";
import {texts} from "./i18n";
import {playChime, unlockAudio} from "./sound";
import {useClockEdit} from "./hooks/useClockEdit";
import {useShortcuts} from "./hooks/useShortcuts";
import {prefersReducedMotion} from "./lib/motion";
import {applyTheme, watchSystemTheme} from "./lib/theme";
import ActionBar from "./components/ActionBar";
import BeachScene from "./components/BeachScene";
import Clock from "./components/Clock";
import ConfirmDialog from "./components/ConfirmDialog";
import HarvestHud from "./components/HarvestHud";
import ReportView, {type ReportData} from "./components/ReportView";
import SettingsPanel from "./components/SettingsPanel";
import ShortcutHelp from "./components/ShortcutHelp";
import TomatoDrip from "./components/TomatoDrip";
import "./styles/theme.css";
import "./styles/base.css";
import "./styles/a11y.css";

function App() {
    const [state, setState] = useState<timer.State | null>(null);
    const [settingsOpen, setSettingsOpen] = useState(false);
    const [helpOpen, setHelpOpen] = useState(false);
    const [squeezing, setSqueezing] = useState(false);
    const [appVersion, setAppVersion] = useState("dev");
    const [error, setError] = useState("");
    const [view, setView] = useState<"timer" | "report">("timer");
    const [report, setReport] = useState<ReportData | null>(null);
    const [historyConsentOpen, setHistoryConsentOpen] = useState(false);
    const historyPromptShown = useRef(false);

    const applyState = useCallback((next: timer.State) => setState(next), []);

    useEffect(() => {
        GetState().then(applyState);
        GetVersion().then(setAppVersion);

        const offState = EventsOn("timer:state", (next: timer.State) => {
            applyState(timer.State.createFrom(next));
        });
        const offSound = EventsOn("timer:sound", (phase: string) => {
            playChime(phase);
        });

        return () => {
            offState();
            offSound();
        };
    }, [applyState]);

    useEffect(() => {
        const unlock = () => unlockAudio();
        window.addEventListener("pointerdown", unlock, {once: true});
        window.addEventListener("keydown", unlock, {once: true});
        return () => {
            window.removeEventListener("pointerdown", unlock);
            window.removeEventListener("keydown", unlock);
        };
    }, []);

    // "auto" is resolved against the OS scheme, so a system flip has to be
    // picked up while the window stays open.
    const theme = state?.settings.theme ?? "auto";
    useEffect(() => {
        applyTheme(theme);
        if (theme !== "auto") {
            return;
        }
        return watchSystemTheme(() => applyTheme(theme));
    }, [theme]);

    const clock = useClockEdit(state?.remainingSeconds, applyState, setError);

    useEffect(() => {
        if (!state || state.settings.historyPrompted || historyPromptShown.current) {
            return;
        }
        historyPromptShown.current = true;
        setHistoryConsentOpen(true);
    }, [state, applyState]);

    const toggleTimer = useCallback(() => {
        Toggle().then((s) => applyState(timer.State.createFrom(s)));
    }, [applyState]);

    const resetTimer = useCallback(() => {
        Reset().then((s) => applyState(timer.State.createFrom(s)));
    }, [applyState]);

    // Skipping a work phase squeezes the tomato into the glass. The scene has
    // to stay on screen for the whole gag, even though the timer already
    // switched over to the break. With reduced motion the gag is dropped and
    // the break scene appears right away.
    const skip = useCallback(async () => {
        const wasWork = state?.phase === "work" && !prefersReducedMotion();
        if (wasWork) {
            setSqueezing(true);
        }
        applyState(timer.State.createFrom(await Skip()));
        if (wasWork) {
            window.setTimeout(() => setSqueezing(false), 2600);
        }
    }, [applyState, state?.phase]);

    useShortcuts({
        toggleTimer: () => {
            if (view === "timer") {
                toggleTimer();
            }
        },
        resetTimer: () => {
            if (view === "timer") {
                resetTimer();
            }
        },
        skip: () => {
            if (view === "timer") {
                skip();
            }
        },
        startClockEdit: clock.start,
        toggleSettings: () => {
            if (view === "timer") {
                setSettingsOpen((open) => !open);
            }
        },
        toggleHelp: () => setHelpOpen((open) => !open),
        closeHelp: () => setHelpOpen(false),
        editing: clock.draft !== null,
        singleKey: state?.settings.singleKeyShortcuts ?? true,
    });

    const progress = useMemo(() => {
        if (!state || state.totalSeconds <= 0) {
            return 0;
        }
        return 1 - state.remainingSeconds / state.totalSeconds;
    }, [state]);

    const openReport = useCallback(() => {
        GetReport().then((data) => {
            setReport(history.Report.createFrom(data) as unknown as ReportData);
            setView("report");
        });
    }, []);

    const refreshReport = useCallback(() => {
        GetReport().then((data) => {
            setReport(history.Report.createFrom(data) as unknown as ReportData);
        });
    }, []);

    const closeReport = useCallback(() => {
        setView("timer");
    }, []);

    useEffect(() => {
        if (view !== "report") {
            return;
        }
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape") {
                closeReport();
            }
        };
        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
    }, [view, closeReport]);

    if (!state) {
        const fallback = texts(navigator.language.toLowerCase().startsWith("de") ? "de" : "en");
        return <div className="app app--loading">{fallback.loading}</div>;
    }

    const t = texts(state.language);
    const running = state.status === "running";
    const toggleLabel = running ? t.pause : state.status === "paused" ? t.resume : t.start;
    const statusLabel =
        state.status === "running"
            ? t.statusRunning
            : state.status === "paused"
              ? t.statusPaused
              : t.statusIdle;

    // Only advertise the letter shortcuts while they are actually enabled.
    const keyHint = (key: string) => (state.settings.singleKeyShortcuts ? ` (${key})` : "");

    const phaseTitle =
        state.phase === "work"
            ? t.workTitle
            : state.phase === "longBreak"
              ? t.longBreakTitle
              : t.shortBreakTitle;

    if (view === "report") {
        return (
            <div className={`app app--${state.phase} app--report`}>
                <ReportView
                    t={t}
                    report={report}
                    settings={state.settings}
                    onApplied={applyState}
                    onRefresh={refreshReport}
                    onClose={closeReport}
                />
            </div>
        );
    }

    return (
        <div className={`app app--${state.phase}`}>
            <header className="app__header">
                <HarvestHud
                    language={state.language}
                    tomatoes={state.harvest.tomatoes}
                    total={state.harvest.total}
                    streak={state.harvest.streak}
                    bestStreak={state.harvest.bestStreak}
                    onOpenReport={openReport}
                />

                <span className="app__phase" title={phaseTitle}>
                    {state.phaseLabel}
                </span>
            </header>

            <Clock
                t={t}
                formattedRemaining={state.formattedRemaining}
                phaseLabel={state.phaseLabel}
                statusLabel={statusLabel}
                progress={progress}
                // Work fills the bar as the tomato drains; a break empties it again.
                barFraction={state.phase === "work" ? progress : 1 - progress}
                edit={clock}
            />

            <p className="sr-only" role="status" aria-live="polite">
                {t.liveStatus(state.phaseLabel, statusLabel, state.formattedRemaining)}
            </p>

            <div className="scene" style={{display: "contents"}}>
                {state.phase === "work" || squeezing ? (
                    <TomatoDrip
                        progress={progress}
                        running={running}
                        squeezing={squeezing}
                        paused={state.status === "paused"}
                    />
                ) : (
                    <BeachScene
                        progress={progress}
                        running={running}
                        long={state.phase === "longBreak"}
                        paused={state.status === "paused"}
                    />
                )}
            </div>

            <ActionBar
                t={t}
                running={running}
                toggleLabel={toggleLabel}
                keyHint={keyHint}
                onToggle={toggleTimer}
                onReset={resetTimer}
                onSkip={() => void skip()}
                helpOpen={helpOpen}
                onHelpToggle={() => setHelpOpen((open) => !open)}
                help={
                    helpOpen && (
                        <ShortcutHelp
                            t={t}
                            language={state.language}
                            singleKey={state.settings.singleKeyShortcuts}
                            version={appVersion}
                        />
                    )
                }
                settings={
                    <SettingsPanel
                        t={t}
                        settings={state.settings}
                        open={settingsOpen}
                        onOpenChange={setSettingsOpen}
                        onApplied={applyState}
                    />
                }
            />

            {error && (
                <p className="sr-only" role="alert">
                    {error}
                </p>
            )}
            {historyConsentOpen && (
                <ConfirmDialog
                    title={t.historyConsentTitle}
                    body={<p>{t.historyConsentPrompt}</p>}
                    confirmLabel={t.historyConsentEnable}
                    cancelLabel={t.historyConsentDecline}
                    onCancel={() => {
                        setHistoryConsentOpen(false);
                        SetHistoryConsent(false).then((s) => applyState(timer.State.createFrom(s)));
                    }}
                    onConfirm={() => {
                        setHistoryConsentOpen(false);
                        SetHistoryConsent(true).then((s) => applyState(timer.State.createFrom(s)));
                    }}
                />
            )}
        </div>
    );
}

export default App;
