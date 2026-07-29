import {useCallback, useEffect, useMemo, useRef, useState} from "react";
import {EventsOn} from "../wailsjs/runtime/runtime";
import {
    GetState,
    Reset,
    SetAlwaysOnTop,
    SetCurrentDuration,
    SetSoundEnabled,
    Skip,
    Toggle,
    UpdateSettings,
} from "../wailsjs/go/main/App";
import {main} from "../wailsjs/go/models";
import {playChime, unlockAudio} from "./sound";
import TomatoDrip from "./TomatoDrip";
import BeachScene from "./BeachScene";
import "./App.css";

type SettingsForm = {
    workSeconds: string;
    shortBreakSeconds: string;
    longBreakSeconds: string;
    longBreakEvery: string;
};

/** Renders seconds as the mm:ss the duration inputs expect. */
function toDuration(seconds: number): string {
    const total = Math.max(0, Math.round(seconds));
    return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}

/**
 * Parses a duration input. "1:30" is 90 seconds, "45s" is 45 seconds and a
 * bare number stays minutes so existing muscle memory keeps working.
 */
function parseDuration(input: string): number | null {
    const value = input.trim().toLowerCase();
    if (value === "") {
        return null;
    }

    const clock = value.match(/^(\d+):([0-5]?\d)$/);
    if (clock) {
        return Number(clock[1]) * 60 + Number(clock[2]);
    }

    const seconds = value.match(/^(\d+(?:[.,]\d+)?)\s*s$/);
    if (seconds) {
        return Math.round(Number(seconds[1].replace(",", ".")));
    }

    const minutes = value.match(/^(\d+(?:[.,]\d+)?)\s*(?:m|min)?$/);
    if (minutes) {
        return Math.round(Number(minutes[1].replace(",", ".")) * 60);
    }

    return null;
}

function toForm(settings: main.Settings): SettingsForm {
    return {
        workSeconds: toDuration(settings.workSeconds),
        shortBreakSeconds: toDuration(settings.shortBreakSeconds),
        longBreakSeconds: toDuration(settings.longBreakSeconds),
        longBreakEvery: String(settings.longBreakEvery),
    };
}

const DURATION_LABELS = {
    workSeconds: "Work",
    shortBreakSeconds: "Short break",
    longBreakSeconds: "Long break",
} as const;

function App() {
    const [state, setState] = useState<main.State | null>(null);
    const [form, setForm] = useState<SettingsForm | null>(null);
    const [error, setError] = useState("");
    const [settingsOpen, setSettingsOpen] = useState(false);
    const [clockDraft, setClockDraft] = useState<string | null>(null);
    const [clockError, setClockError] = useState(false);
    const [squeezing, setSqueezing] = useState(false);
    // Escape unmounts the input, which also fires blur — the ref keeps that
    // blur from committing the discarded draft.
    const clockCancelled = useRef(false);

    const applyState = useCallback((next: main.State) => {
        setState(next);
        setForm((current) => current ?? toForm(next.settings));
    }, []);

    useEffect(() => {
        GetState().then(applyState);

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

    const startClockEdit = () => {
        if (!state) {
            return;
        }
        clockCancelled.current = false;
        setClockError(false);
        setClockDraft(toDuration(state.remainingSeconds));
    };

    const cancelClockEdit = () => {
        clockCancelled.current = true;
        setClockDraft(null);
        setClockError(false);
    };

    const commitClockEdit = async () => {
        if (clockDraft === null || clockCancelled.current) {
            return;
        }
        const seconds = parseDuration(clockDraft);
        if (seconds === null || seconds < 1) {
            setClockError(true);
            return;
        }
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
    // switched over to the break.
    const skip = async () => {
        const wasWork = state?.phase === "work";
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

    if (!state || !form) {
        return <div className="app app--loading">Loading…</div>;
    }

    const toggleLabel =
        state.status === "running" ? "Pause" : state.status === "paused" ? "Resume" : "Start";

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
            setError(`Invalid duration for "${DURATION_LABELS[invalid[0] as keyof typeof DURATION_LABELS]}" — use mm:ss, "45s" or minutes.`);
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
                <span className="app__phase">{state.phaseLabel}</span>
                <span className="app__cycles">Completed: {state.completedWork}</span>
            </header>

            <div className="clock">
                {clockDraft === null ? (
                    <button
                        className="clock__value clock__value--button"
                        onClick={startClockEdit}
                        title="Click to edit the duration of this phase"
                    >
                        {state.formattedRemaining}
                    </button>
                ) : (
                    <input
                        className={`clock__value clock__input${clockError ? " clock__input--error" : ""}`}
                        value={clockDraft}
                        autoFocus
                        spellCheck={false}
                        onChange={(e) => {
                            setClockDraft(e.target.value);
                            setClockError(false);
                        }}
                        onBlur={commitClockEdit}
                        onKeyDown={(e) => {
                            if (e.key === "Enter") {
                                e.preventDefault();
                                void commitClockEdit();
                            } else if (e.key === "Escape") {
                                e.preventDefault();
                                cancelClockEdit();
                            }
                        }}
                    />
                )}
                <div className="clock__status">
                    {clockDraft === null ? state.status : "mm:ss · Enter to set, Esc to cancel"}
                </div>
                <div className="clock__progress">
                    <div className="clock__progress-bar" style={{width: `${Math.round(progress * 100)}%`}}/>
                </div>
            </div>

            {state.phase === "work" || squeezing ? (
                <TomatoDrip
                    progress={progress}
                    running={state.status === "running"}
                    squeezing={squeezing}
                />
            ) : (
                <BeachScene
                    progress={progress}
                    running={state.status === "running"}
                    long={state.phase === "longBreak"}
                />
            )}

            <div className="actions">
                <button className="btn btn--primary" onClick={() => Toggle().then((s) => applyState(main.State.createFrom(s)))}>
                    {toggleLabel}
                </button>
                <button className="btn" onClick={() => Reset().then((s) => applyState(main.State.createFrom(s)))}>
                    Reset
                </button>
                <button className="btn" onClick={skip}>
                    Skip
                </button>
            </div>

            <div className="toggles">
                <label className="toggle">
                    <input
                        type="checkbox"
                        checked={state.settings.alwaysOnTop}
                        onChange={(e) => SetAlwaysOnTop(e.target.checked).then((s) => applyState(main.State.createFrom(s)))}
                    />
                    Always on Top
                </label>
                <label className="toggle">
                    <input
                        type="checkbox"
                        checked={state.settings.soundEnabled}
                        onChange={(e) => SetSoundEnabled(e.target.checked).then((s) => applyState(main.State.createFrom(s)))}
                    />
                    Sound
                </label>
            </div>

            <section className="settings">
                <button className="settings__header" onClick={() => setSettingsOpen((open) => !open)}>
                    Settings {settingsOpen ? "▲" : "▼"}
                </button>

                {settingsOpen && (
                    <div className="settings__body">
                        <label className="field">
                            <span>{DURATION_LABELS.workSeconds}</span>
                            <input type="text" inputMode="text" placeholder="25:00" value={form.workSeconds} onChange={updateField("workSeconds")}/>
                        </label>
                        <label className="field">
                            <span>{DURATION_LABELS.shortBreakSeconds}</span>
                            <input type="text" inputMode="text" placeholder="5:00" value={form.shortBreakSeconds} onChange={updateField("shortBreakSeconds")}/>
                        </label>
                        <label className="field">
                            <span>{DURATION_LABELS.longBreakSeconds}</span>
                            <input type="text" inputMode="text" placeholder="15:00" value={form.longBreakSeconds} onChange={updateField("longBreakSeconds")}/>
                        </label>
                        <label className="field">
                            <span>Long break every</span>
                            <input type="number" min={1} max={600} value={form.longBreakEvery} onChange={updateField("longBreakEvery")}/>
                        </label>

                        <p className="settings__hint">mm:ss, "45s" or plain minutes (e.g. 0:30 for half a minute).</p>

                        {error && <p className="settings__error">{error}</p>}

                        <button className="btn btn--primary" onClick={saveSettings}>
                            Save
                        </button>
                    </div>
                )}
            </section>
        </div>
    );
}

export default App;
