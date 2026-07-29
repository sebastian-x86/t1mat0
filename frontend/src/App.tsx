import {useCallback, useEffect, useMemo, useRef, useState} from "react";
import {EventsOn} from "../wailsjs/runtime/runtime";
import {
    GetState,
    GetVersion,
    Reset,
    SetAlwaysOnTop,
    SetCurrentDuration,
    SetLanguage,
    SetSingleKeyShortcuts,
    SetSoundEnabled,
    Skip,
    Toggle,
    UpdateSettings,
} from "../wailsjs/go/main/App";
import {main} from "../wailsjs/go/models";
import {texts} from "./i18n";
import {
    clockParts,
    joinClockParts,
    nudgeClockSegment as nudgeSegment,
    parseDuration,
    stepDuration,
    toDuration,
    typeClockDigit as typeDigit,
} from "./duration";
import {playChime, unlockAudio} from "./sound";
import TomatoDrip from "./TomatoDrip";
import BeachScene from "./BeachScene";
import LanguagePicker from "./LanguagePicker";
import HarvestHud from "./HarvestHud";
import "./App.css";

type SettingsForm = {
    workSeconds: string;
    shortBreakSeconds: string;
    longBreakSeconds: string;
    longBreakEvery: string;
};

function toForm(settings: main.Settings): SettingsForm {
    return {
        workSeconds: toDuration(settings.workSeconds),
        shortBreakSeconds: toDuration(settings.shortBreakSeconds),
        longBreakSeconds: toDuration(settings.longBreakSeconds),
        longBreakEvery: String(settings.longBreakEvery),
    };
}

const DURATION_KEYS = {
    workSeconds: "work",
    shortBreakSeconds: "shortBreak",
    longBreakSeconds: "longBreak",
} as const;

/**
 * React registers onWheel passively, so the browser still scrolls the element
 * a little before the handler runs. A native non-passive listener lets us
 * swallow the scroll and only change the value.
 */
function useWheel<T extends HTMLElement>(handler: (event: WheelEvent) => void) {
    const ref = useRef<T | null>(null);
    const latest = useRef(handler);
    latest.current = handler;

    useEffect(() => {
        const element = ref.current;
        if (!element) {
            return;
        }
        const onWheel = (event: WheelEvent) => {
            event.preventDefault();
            latest.current(event);
        };
        element.addEventListener("wheel", onWheel, {passive: false});
        return () => element.removeEventListener("wheel", onWheel);
    });

    return ref;
}

/**
 * Works out whether the pointer sits on the minutes or the seconds part of a
 * mm:ss input, so the wheel changes the segment under the cursor. The text is
 * measured on a canvas because an input has no per-character geometry.
 */
const textMetrics = document.createElement("canvas").getContext("2d");

function segmentAtPointer(input: HTMLInputElement, clientX: number): "minutes" | "seconds" {
    const colon = input.value.indexOf(":");
    if (colon < 0 || !textMetrics) {
        return "minutes";
    }

    const style = window.getComputedStyle(input);
    textMetrics.font = `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
    const width = (text: string) => textMetrics.measureText(text).width;

    const rect = input.getBoundingClientRect();
    const left =
        rect.left + parseFloat(style.borderLeftWidth || "0") + parseFloat(style.paddingLeft || "0");
    const inner =
        rect.width -
        parseFloat(style.borderLeftWidth || "0") -
        parseFloat(style.borderRightWidth || "0") -
        parseFloat(style.paddingLeft || "0") -
        parseFloat(style.paddingRight || "0");

    const total = width(input.value);
    let start = left;
    if (style.textAlign === "right" || style.textAlign === "end") {
        start = left + inner - total;
    } else if (style.textAlign === "center") {
        start = left + (inner - total) / 2;
    }

    const divider = start + width(input.value.slice(0, colon)) + width(":") / 2;
    return clientX < divider ? "minutes" : "seconds";
}

/**
 * True when the OS asks for less movement. The squeeze gag is pure motion, so
 * it is skipped entirely instead of being played at high speed (WCAG 2.1
 * SC 2.3.3).
 */
function prefersReducedMotion(): boolean {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function App() {
    const [state, setState] = useState<main.State | null>(null);
    const [form, setForm] = useState<SettingsForm | null>(null);
    const [error, setError] = useState("");
    const [settingsOpen, setSettingsOpen] = useState(false);
    const [clockDraft, setClockDraft] = useState<string | null>(null);
    const [clockError, setClockError] = useState(false);
    // Which half of mm:ss the keyboard is currently filling.
    const [clockSegment, setClockSegment] = useState<0 | 1>(0);
    // Digits typed into the active segment since it was entered.
    const clockTyped = useRef("");
    const [squeezing, setSqueezing] = useState(false);
    const [helpOpen, setHelpOpen] = useState(false);
    const [appVersion, setAppVersion] = useState("dev");
    // Escape unmounts the input, which also fires blur — the ref keeps that
    // blur from committing the discarded draft.
    const clockCancelled = useRef(false);

    const applyState = useCallback((next: main.State) => {
        setState(next);
        setForm((current) => current ?? toForm(next.settings));
    }, []);

    useEffect(() => {
        GetState().then(applyState);
        GetVersion().then(setAppVersion);

        const offState = EventsOn("timer:state", (next: main.State) => {
            applyState(main.State.createFrom(next));
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

    const settingsRef = useRef<HTMLDivElement>(null);
    const gearButtonRef = useRef<HTMLButtonElement>(null);
    useEffect(() => {
        if (!settingsOpen) {
            return;
        }
        // Move focus into the panel so keyboard and screen reader users land
        // where the popover opened.
        settingsRef.current?.querySelector<HTMLElement>("input, button")?.focus();
        const onPointerDown = (event: PointerEvent) => {
            if (!settingsRef.current?.contains(event.target as Node)) {
                setSettingsOpen(false);
            }
        };
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape") {
                setSettingsOpen(false);
                gearButtonRef.current?.focus();
            }
        };
        window.addEventListener("pointerdown", onPointerDown);
        window.addEventListener("keydown", onKeyDown);
        return () => {
            window.removeEventListener("pointerdown", onPointerDown);
            window.removeEventListener("keydown", onKeyDown);
        };
    }, [settingsOpen]);

    const toggleTimer = useCallback(() => {
        Toggle().then((s) => applyState(main.State.createFrom(s)));
    }, [applyState]);

    const resetTimer = useCallback(() => {
        Reset().then((s) => applyState(main.State.createFrom(s)));
    }, [applyState]);

    const startClockEdit = () => {
        if (!state) {
            return;
        }
        clockCancelled.current = false;
        setClockError(false);
        setClockSegment(0);
        clockTyped.current = "";
        setClockDraft(toDuration(state.remainingSeconds));
    };

    // The mm:ss rules live in duration.ts; this only feeds React state.
    const typeClockDigit = (digit: string) => {
        if (clockDraft === null) {
            return;
        }
        const next = typeDigit({draft: clockDraft, segment: clockSegment, typed: clockTyped.current}, digit);
        clockTyped.current = next.typed;
        setClockSegment(next.segment);
        setClockDraft(next.draft);
    };

    const nudgeClockSegment = (delta: number) => {
        if (clockDraft === null) {
            return;
        }
        clockTyped.current = "";
        setClockDraft(nudgeSegment(clockDraft, clockSegment, delta));
    };

    // Same wheel handling as the settings fields, but on the draft above the
    // tomato.
    const clockWheelRef = useWheel<HTMLInputElement>((event) => {
        if (clockDraft === null) {
            return;
        }
        const current = parseDuration(clockDraft);
        if (current === null) {
            return;
        }
        const target = event.currentTarget as HTMLInputElement;
        const step = event.shiftKey || segmentAtPointer(target, event.clientX) === "seconds" ? 1 : 60;
        const next = stepDuration(current, event.deltaY < 0 ? step : -step);
        clockTyped.current = "";
        setClockError(false);
        setClockDraft(toDuration(next));
    });

    const cancelClockEdit = () => {
        clockCancelled.current = true;
        setClockDraft(null);
        setClockError(false);
    };

    const commitClockEdit = async () => {
        if (clockDraft === null || clockCancelled.current) {
            return;
        }
        const parsed = parseDuration(clockDraft);
        if (parsed === null) {
            setClockError(true);
            return;
        }
        const seconds = Math.max(1, parsed);
        try {
            const updated = await SetCurrentDuration(seconds);
            applyState(main.State.createFrom(updated));
            setForm(toForm(main.State.createFrom(updated).settings));
            cancelClockEdit();
        } catch (err) {
            setError(String(err));
            setClockError(true);
        }
    };

    // Skipping a work phase squeezes the tomato into the glass. The scene has
    // to stay on screen for the whole gag, even though the timer already
    // switched over to the break. With reduced motion the gag is dropped and
    // the break scene appears right away.
    const skip = async () => {
        const wasWork = state?.phase === "work" && !prefersReducedMotion();
        if (wasWork) {
            setSqueezing(true);
        }
        const next = await Skip();
        applyState(main.State.createFrom(next));
        if (wasWork) {
            window.setTimeout(() => setSqueezing(false), 2600);
        }
    };

    const progress = useMemo(() => {
        if (!state || state.totalSeconds <= 0) {
            return 0;
        }
        return 1 - state.remainingSeconds / state.totalSeconds;
    }, [state]);

    // Keyboard shortcuts are registered once; the ref keeps them pointing at
    // the current handlers without re-binding the listener on every tick.
    const shortcuts = useRef({
        toggleTimer,
        resetTimer,
        skip,
        startClockEdit,
        editing: clockDraft !== null,
        singleKey: state?.settings.singleKeyShortcuts ?? true,
    });
    shortcuts.current = {
        toggleTimer,
        resetTimer,
        skip,
        startClockEdit,
        editing: clockDraft !== null,
        singleKey: state?.settings.singleKeyShortcuts ?? true,
    };

    useEffect(() => {
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.repeat || event.altKey || event.metaKey) {
                return;
            }
            const target = event.target as HTMLElement | null;
            const typing =
                !!target && (target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName));
            if (typing || shortcuts.current.editing) {
                return;
            }

            const handled = () => {
                event.preventDefault();
                // A focused button would otherwise react to Space/Enter too.
                target?.blur?.();
            };

            // Shortcuts with a modifier or function key stay available even
            // when the single character keys are switched off (WCAG 2.1.4).
            if (event.ctrlKey) {
                if (event.key === ",") {
                    handled();
                    setSettingsOpen((open) => !open);
                }
                return;
            }

            switch (event.key) {
                case "F1":
                    handled();
                    setHelpOpen((open) => !open);
                    return;
                case "F2":
                    handled();
                    shortcuts.current.startClockEdit();
                    return;
                case "Escape":
                    setHelpOpen(false);
                    return;
            }

            if (!shortcuts.current.singleKey) {
                return;
            }

            switch (event.key.toLowerCase()) {
                case " ":
                case "k":
                    handled();
                    shortcuts.current.toggleTimer();
                    break;
                case "r":
                    handled();
                    shortcuts.current.resetTimer();
                    break;
                case "n":
                case "s":
                    handled();
                    void shortcuts.current.skip();
                    break;
                case "e":
                    handled();
                    shortcuts.current.startClockEdit();
                    break;
                case ",":
                    handled();
                    setSettingsOpen((open) => !open);
                    break;
                case "?":
                    handled();
                    setHelpOpen((open) => !open);
                    break;
            }
        };
        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
    }, []);

    // Highlight the segment that the next digit will overwrite.
    useEffect(() => {
        const input = clockWheelRef.current;
        if (clockDraft === null || !input) {
            return;
        }
        const colon = clockDraft.indexOf(":");
        const [from, to] = clockSegment === 0 ? [0, colon] : [colon + 1, clockDraft.length];
        input.setSelectionRange(from, to);
    }, [clockDraft, clockSegment, clockWheelRef]);

    // Mouse wheel nudges the segment under the pointer: minutes on the left of
    // the colon, seconds on the right. Shift always steps in seconds.
    const adjustDuration = (key: keyof SettingsForm, event: WheelEvent) => {
        const input = event.currentTarget as HTMLInputElement;
        const stepSeconds = event.shiftKey || segmentAtPointer(input, event.clientX) === "seconds" ? 1 : 60;
        setForm((current) => {
            if (!current) {
                return current;
            }
            const seconds = parseDuration(current[key]);
            if (seconds === null) {
                return current;
            }
            const next = stepDuration(seconds, event.deltaY < 0 ? stepSeconds : -stepSeconds);
            return {...current, [key]: toDuration(next)};
        });
    };

    const workWheelRef = useWheel<HTMLInputElement>((event) => adjustDuration("workSeconds", event));
    const shortWheelRef = useWheel<HTMLInputElement>((event) => adjustDuration("shortBreakSeconds", event));
    const longWheelRef = useWheel<HTMLInputElement>((event) => adjustDuration("longBreakSeconds", event));
    const everyWheelRef = useWheel<HTMLInputElement>((event) => {
        setForm((current) => {
            if (!current) {
                return current;
            }
            const count = Number(current.longBreakEvery);
            if (!Number.isFinite(count)) {
                return current;
            }
            const next = Math.min(600, Math.max(1, count + (event.deltaY < 0 ? 1 : -1)));
            return {...current, longBreakEvery: String(next)};
        });
    });

    if (!state || !form) {
        const fallback = texts(navigator.language.toLowerCase().startsWith("de") ? "de" : "en");
        return <div className="app app--loading">{fallback.loading}</div>;
    }

    const t = texts(state.language);
    const running = state.status === "running";
    const toggleLabel = running ? t.pause : state.status === "paused" ? t.resume : t.start;
    const statusLabel =
        state.status === "running" ? t.statusRunning : state.status === "paused" ? t.statusPaused : t.statusIdle;

    // Only advertise the letter shortcuts while they are actually enabled.
    const keyHint = (key: string) => (state.settings.singleKeyShortcuts ? ` (${key})` : "");

    // Work fills the bar as the tomato drains; a break empties it again.
    const barFraction = state.phase === "work" ? progress : 1 - progress;

    const phaseTitle =
        state.phase === "work" ? t.workTitle : state.phase === "longBreak" ? t.longBreakTitle : t.shortBreakTitle;

    const updateField = (key: keyof SettingsForm) => (event: React.ChangeEvent<HTMLInputElement>) => {
        setForm({...form, [key]: event.target.value});
    };

    const saveSettings = async () => {
        const durations = {
            workSeconds: parseDuration(form.workSeconds),
            shortBreakSeconds: parseDuration(form.shortBreakSeconds),
            longBreakSeconds: parseDuration(form.longBreakSeconds),
        };

        const invalid = Object.entries(durations).find(([, value]) => value === null);
        if (invalid) {
            setError(t.invalidDuration(t[DURATION_KEYS[invalid[0] as keyof typeof DURATION_KEYS]]));
            return;
        }

        const next = main.Settings.createFrom({
            ...state.settings,
            workSeconds: durations.workSeconds as number,
            shortBreakSeconds: durations.shortBreakSeconds as number,
            longBreakSeconds: durations.longBreakSeconds as number,
            longBreakEvery: Number(form.longBreakEvery),
        });

        try {
            setError("");
            const updated = await UpdateSettings(next);
            applyState(main.State.createFrom(updated));
            setForm(toForm(main.State.createFrom(updated).settings));
        } catch (err) {
            setError(String(err));
        }
    };

    return (
        <div className={`app app--${state.phase}`}>
            <header className="app__header">
                <HarvestHud
                    language={state.language}
                    tomatoes={state.harvest.tomatoes}
                    streak={state.harvest.streak}
                    bestStreak={state.harvest.bestStreak}
                />

                <span className="app__phase" title={phaseTitle}>{state.phaseLabel}</span>
            </header>

            <div className="clock">
                {clockDraft === null ? (
                    <button
                        className="clock__value clock__value--button"
                        onClick={startClockEdit}
                        title={t.clockEditTitle}
                        aria-label={t.clockAria(state.formattedRemaining)}
                    >
                        {state.formattedRemaining}
                    </button>
                ) : (
                    <input
                        className={`clock__value clock__input${clockError ? " clock__input--error" : ""}`}
                        value={clockDraft}
                        autoFocus
                        spellCheck={false}
                        aria-label={t.clockDurationAria}
                        aria-invalid={clockError}
                        title={t.clockTitle}
                        ref={clockWheelRef}
                        readOnly
                        onBlur={commitClockEdit}
                        onMouseUp={(e) => {
                            // Clicking a half of the field starts editing there.
                            const input = e.currentTarget;
                            clockTyped.current = "";
                            setClockSegment(segmentAtPointer(input, e.clientX) === "seconds" ? 1 : 0);
                        }}
                        onKeyDown={(e) => {
                            if (e.key === "Enter") {
                                e.preventDefault();
                                void commitClockEdit();
                                return;
                            }
                            if (e.key === "Escape") {
                                e.preventDefault();
                                cancelClockEdit();
                                return;
                            }
                            if (/^[0-9]$/.test(e.key)) {
                                e.preventDefault();
                                typeClockDigit(e.key);
                                return;
                            }
                            if (e.key === "ArrowUp" || e.key === "ArrowDown") {
                                e.preventDefault();
                                nudgeClockSegment(e.key === "ArrowUp" ? 1 : -1);
                                return;
                            }
                            if (e.key === "ArrowLeft" || e.key === "ArrowRight" || e.key === "Tab") {
                                e.preventDefault();
                                clockTyped.current = "";
                                setClockSegment(e.key === "ArrowLeft" ? 0 : 1);
                                return;
                            }
                            if (e.key === "Backspace" || e.key === "Delete") {
                                e.preventDefault();
                                clockTyped.current = "";
                                const [minutes, seconds] = clockParts(clockDraft ?? "00:00");
                                setClockDraft(
                                    clockSegment === 0
                                        ? joinClockParts(0, seconds)
                                        : joinClockParts(minutes, 0),
                                );
                                return;
                            }
                            // Everything else — letters, the colon, punctuation —
                            // has no meaning in a mm:ss field.
                            if (e.key.length === 1) {
                                e.preventDefault();
                            }
                        }}
                    />
                )}
                <div className="clock__status">
                    {clockDraft === null ? statusLabel : t.clockHint}
                </div>
                <div
                    className="clock__progress"
                    role="progressbar"
                    aria-label={t.progressAria(state.phaseLabel)}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={Math.round(progress * 100)}
                    aria-valuetext={t.progressValue(Math.round(progress * 100), state.formattedRemaining)}
                >
                    <div className="clock__progress-bar" style={{width: `${Math.round(barFraction * 100)}%`}}/>
                </div>
            </div>

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

            <div className="actions-bar">
                {helpOpen && (
                    <div className="shortcuts" role="dialog" aria-label={t.shortcuts}>
                        <dl className="shortcuts__list">
                            <dt><kbd>{state.language === "de" ? "Strg" : "Ctrl"}</kbd>+<kbd>,</kbd></dt><dd>{t.scSettings}</dd>
                            <dt><kbd>F1</kbd></dt><dd>{t.scList}</dd>
                            <dt><kbd>F2</kbd></dt><dd>{t.scEdit}</dd>
                            <dt><kbd>Tab</kbd></dt><dd>{t.scFocus}</dd>
                            <dt><kbd>Esc</kbd></dt><dd>{t.scClose}</dd>
                        </dl>
                        {state.settings.singleKeyShortcuts ? (
                            <dl className="shortcuts__list shortcuts__list--single">
                                <dt><kbd>{state.language === "de" ? "Leer" : "Space"}</kbd> / <kbd>K</kbd></dt><dd>{t.scToggle}</dd>
                                <dt><kbd>R</kbd></dt><dd>{t.scReset}</dd>
                                <dt><kbd>N</kbd> / <kbd>S</kbd></dt><dd>{t.scSkip}</dd>
                                <dt><kbd>E</kbd></dt><dd>{t.scEdit}</dd>
                                <dt><kbd>,</kbd></dt><dd>{t.scSettings}</dd>
                                <dt><kbd>?</kbd></dt><dd>{t.scList}</dd>
                            </dl>
                        ) : (
                            <p className="shortcuts__hint">{t.scOff}</p>
                        )}
                        <p className="shortcuts__meta">
                            t1mat0 {appVersion} · GPL-3.0
                        </p>
                    </div>
                )}

                <div className="actions">
                <button
                    className="btn btn--primary"
                    onClick={toggleTimer}
                    title={t.toggleTitle(toggleLabel, keyHint("Space"))}
                >
                    <svg className="btn__icon" viewBox="0 0 24 24" aria-hidden="true">
                        {running ? (
                            <>
                                <rect x="6" y="4.5" width="4.4" height="15" rx="1.4"/>
                                <rect x="13.6" y="4.5" width="4.4" height="15" rx="1.4"/>
                            </>
                        ) : (
                            <path d="M7.5 4.9c0-1 1.1-1.6 2-1.1l10.2 6.6c.8.5.8 1.7 0 2.2L9.5 19.2c-.9.5-2-.1-2-1.1V4.9Z"/>
                        )}
                    </svg>
                    {toggleLabel}
                </button>
                <button
                    className="btn btn--icon"
                    onClick={resetTimer}
                    title={t.resetTitle(keyHint("R"))}
                    aria-label={t.reset}
                >
                    <svg className="btn__icon" viewBox="0 0 24 24" aria-hidden="true">
                        <path d="M12 5.5a6.5 6.5 0 1 0 6.2 8.5" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round"/>
                        <path d="M12 2.2v6.6l-4.6-3.3L12 2.2Z"/>
                    </svg>
                </button>
                <button
                    className="btn btn--icon"
                    onClick={skip}
                    title={t.skipTitle(keyHint("N"))}
                    aria-label={t.skip}
                >
                    <svg className="btn__icon" viewBox="0 0 24 24" aria-hidden="true">
                        <path d="M6 5.6c0-.9 1-1.4 1.7-.9l8 6.4c.6.5.6 1.3 0 1.8l-8 6.4c-.7.5-1.7 0-1.7-.9V5.6Z"/>
                        <rect x="17.2" y="4.6" width="2.6" height="14.8" rx="1.2"/>
                    </svg>
                </button>
                <button
                    className={`btn btn--ghost${helpOpen ? " btn--active" : ""}`}
                    onClick={() => setHelpOpen((open) => !open)}
                    aria-expanded={helpOpen}
                    aria-haspopup="dialog"
                    title={t.shortcutsTitle}
                    aria-label="Keyboard shortcuts"
                >
                    ?
                </button>

                <div className="gear" ref={settingsRef}>
                    <button
                        ref={gearButtonRef}
                        className={`gear__button${settingsOpen ? " gear__button--open" : ""}`}
                        onClick={() => setSettingsOpen((open) => !open)}
                        aria-label={t.settings}
                        aria-expanded={settingsOpen}
                        aria-haspopup="dialog"
                        title={t.settingsTitle}
                    >
                        <svg viewBox="0 0 24 24" className="gear__icon" aria-hidden="true">
                            <path d="M18.2 10.2 L21.2 10.5 L21.2 13.5 L18.2 13.8 L17.7 15.1 L19.6 17.4 L17.4 19.6 L15.1 17.7 L13.8 18.2 L13.5 21.2 L10.5 21.2 L10.2 18.2 L8.9 17.7 L6.6 19.6 L4.4 17.4 L6.3 15.1 L5.8 13.8 L2.8 13.5 L2.8 10.5 L5.8 10.2 L6.3 8.9 L4.4 6.6 L6.6 4.4 L8.9 6.3 L10.2 5.8 L10.5 2.8 L13.5 2.8 L13.8 5.8 L15.1 6.3 L17.4 4.4 L19.6 6.6 L17.7 8.9 Z"/>
                            <circle cx="12" cy="12" r="3.3"/>
                        </svg>
                    </button>

                    {settingsOpen && (
                        <div className="gear__panel" role="dialog" aria-label={t.settings}>
                            <label className="field">
                                <span>{t.work}</span>
                                <input type="text" placeholder="25:00" ref={workWheelRef} title={t.durationTitle(t.work)} value={form.workSeconds} onChange={updateField("workSeconds")}/>
                            </label>
                            <label className="field">
                                <span>{t.shortBreak}</span>
                                <input type="text" placeholder="5:00" ref={shortWheelRef} title={t.durationTitle(t.shortBreak)} value={form.shortBreakSeconds} onChange={updateField("shortBreakSeconds")}/>
                            </label>
                            <label className="field">
                                <span>{t.longBreak}</span>
                                <input type="text" placeholder="15:00" ref={longWheelRef} title={t.durationTitle(t.longBreak)} value={form.longBreakSeconds} onChange={updateField("longBreakSeconds")}/>
                            </label>
                            <label className="field">
                                <span>{t.longBreakEvery}</span>
                                <input type="number" min={1} max={600} ref={everyWheelRef} title={t.longBreakEveryTitle} value={form.longBreakEvery} onChange={updateField("longBreakEvery")}/>
                            </label>

                            <p className="settings__hint">{t.durationHint}</p>

                            <button className="btn btn--primary" onClick={saveSettings} title={t.saveTitle}>
                                {t.save}
                            </button>

                            <div className="gear__divider"/>

                            <div className="field" title={t.languageTitle}>
                                <span>{t.language}</span>
                                <LanguagePicker
                                    value={state.settings.language}
                                    autoLabel={t.languageAuto}
                                    onChange={(value) => SetLanguage(value).then((s) => applyState(main.State.createFrom(s)))}
                                />
                            </div>

                            <label className="toggle" title={t.alwaysOnTopTitle}>
                                <input
                                    type="checkbox"
                                    checked={state.settings.alwaysOnTop}
                                    onChange={(e) => SetAlwaysOnTop(e.target.checked).then((s) => applyState(main.State.createFrom(s)))}
                                />
                                {t.alwaysOnTop}
                            </label>
                            <label className="toggle" title={t.soundTitle}>
                                <input
                                    type="checkbox"
                                    checked={state.settings.soundEnabled}
                                    onChange={(e) => SetSoundEnabled(e.target.checked).then((s) => applyState(main.State.createFrom(s)))}
                                />
                                {t.sound}
                            </label>
                            <label className="toggle" title={t.singleKeyTitle}>
                                <input
                                    type="checkbox"
                                    checked={state.settings.singleKeyShortcuts}
                                    onChange={(e) => SetSingleKeyShortcuts(e.target.checked).then((s) => applyState(main.State.createFrom(s)))}
                                />
                                {t.singleKey}
                            </label>

                            {error && <p className="settings__error" role="alert">{error}</p>}
                        </div>
                    )}
                </div>
                </div>
            </div>

        </div>
    );
}

export default App;
