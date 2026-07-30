import {useEffect, useRef, useState} from "react";
import {
    DeleteHistoryData,
    OpenDataDirectory,
    SetAlwaysOnTop,
    SetCloseToTray,
    SetHistoryEnabled,
    SetLanguage,
    SetNotificationsEnabled,
    SetSingleKeyShortcuts,
    SetSoundEnabled,
    SetTheme,
    UpdateSettings,
} from "../../wailsjs/go/main/App";
import {timer} from "../../wailsjs/go/models";
import {parseDuration, stepDuration, toDuration} from "../duration";
import {useWheel} from "../hooks/useWheel";
import {wheelStep} from "../lib/clockPointer";
import type {Strings} from "../i18n";
import ConfirmDialog from "./ConfirmDialog";
import LanguagePicker from "./LanguagePicker";
import ThemePicker from "./ThemePicker";
import "./SettingsPanel.css";

type SettingsForm = {
    workSeconds: string;
    shortBreakSeconds: string;
    longBreakSeconds: string;
    longBreakEvery: string;
};

const DURATION_KEYS = {
    workSeconds: "work",
    shortBreakSeconds: "shortBreak",
    longBreakSeconds: "longBreak",
} as const;

function toForm(settings: timer.Settings): SettingsForm {
    return {
        workSeconds: toDuration(settings.workSeconds),
        shortBreakSeconds: toDuration(settings.shortBreakSeconds),
        longBreakSeconds: toDuration(settings.longBreakSeconds),
        longBreakEvery: String(settings.longBreakEvery),
    };
}

/** Identity of the stored durations, used to spot changes made elsewhere. */
function formKey(settings: timer.Settings): string {
    return [
        settings.workSeconds,
        settings.shortBreakSeconds,
        settings.longBreakSeconds,
        settings.longBreakEvery,
    ].join("|");
}

type Props = {
    t: Strings;
    settings: timer.Settings;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    /** Hands a fresh state from any of the backend calls back to the app. */
    onApplied: (state: timer.State) => void;
};

/** Gear button plus the popover holding every setting. */
export default function SettingsPanel({t, settings, open, onOpenChange, onApplied}: Props) {
    const [form, setForm] = useState<SettingsForm>(() => toForm(settings));
    const [storedKey, setStoredKey] = useState(() => formKey(settings));
    const [error, setError] = useState("");
    const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

    // The clock can change a duration too, so the draft follows the stored
    // values whenever they really changed instead of on every tick.
    if (storedKey !== formKey(settings)) {
        setStoredKey(formKey(settings));
        setForm(toForm(settings));
    }

    const panelRef = useRef<HTMLDivElement>(null);
    const buttonRef = useRef<HTMLButtonElement>(null);
    useEffect(() => {
        if (!open) {
            return;
        }
        // Move focus into the panel so keyboard and screen reader users land
        // where the popover opened.
        panelRef.current?.querySelector<HTMLElement>("input, button")?.focus();
        const onPointerDown = (event: PointerEvent) => {
            if (!panelRef.current?.contains(event.target as Node)) {
                onOpenChange(false);
            }
        };
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape") {
                onOpenChange(false);
                buttonRef.current?.focus();
            }
        };
        window.addEventListener("pointerdown", onPointerDown);
        window.addEventListener("keydown", onKeyDown);
        return () => {
            window.removeEventListener("pointerdown", onPointerDown);
            window.removeEventListener("keydown", onKeyDown);
        };
    }, [open, onOpenChange]);

    // Mouse wheel nudges the segment under the pointer: minutes on the left of
    // the colon, seconds on the right. Shift always steps in seconds.
    const adjustDuration = (key: keyof SettingsForm, event: WheelEvent) => {
        const stepSeconds = wheelStep(event);
        setForm((current) => {
            const seconds = parseDuration(current[key]);
            if (seconds === null) {
                return current;
            }
            const next = stepDuration(seconds, event.deltaY < 0 ? stepSeconds : -stepSeconds);
            return {...current, [key]: toDuration(next)};
        });
    };

    const workWheelRef = useWheel<HTMLInputElement>((event) =>
        adjustDuration("workSeconds", event),
    );
    const shortWheelRef = useWheel<HTMLInputElement>((event) =>
        adjustDuration("shortBreakSeconds", event),
    );
    const longWheelRef = useWheel<HTMLInputElement>((event) =>
        adjustDuration("longBreakSeconds", event),
    );
    const everyWheelRef = useWheel<HTMLInputElement>((event) => {
        setForm((current) => {
            const count = Number(current.longBreakEvery);
            if (!Number.isFinite(count)) {
                return current;
            }
            const next = Math.min(600, Math.max(1, count + (event.deltaY < 0 ? 1 : -1)));
            return {...current, longBreakEvery: String(next)};
        });
    });

    const updateField =
        (key: keyof SettingsForm) => (event: React.ChangeEvent<HTMLInputElement>) => {
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

        try {
            const next = timer.Settings.createFrom({
                ...settings,
                workSeconds: durations.workSeconds as number,
                shortBreakSeconds: durations.shortBreakSeconds as number,
                longBreakSeconds: durations.longBreakSeconds as number,
                longBreakEvery: Number(form.longBreakEvery),
            });
            setError("");
            onApplied(timer.State.createFrom(await UpdateSettings(next)));
        } catch (err) {
            setError(String(err));
        }
    };

    const apply = (updated: timer.State) => onApplied(timer.State.createFrom(updated));

    return (
        <div className="gear" ref={panelRef}>
            <button
                ref={buttonRef}
                className={`gear__button${open ? " gear__button--open" : ""}`}
                onClick={() => onOpenChange(!open)}
                aria-label={t.settings}
                aria-expanded={open}
                aria-haspopup="dialog"
                title={t.settingsTitle}
            >
                <svg viewBox="0 0 24 24" className="gear__icon" aria-hidden="true">
                    <path d="M18.2 10.2 L21.2 10.5 L21.2 13.5 L18.2 13.8 L17.7 15.1 L19.6 17.4 L17.4 19.6 L15.1 17.7 L13.8 18.2 L13.5 21.2 L10.5 21.2 L10.2 18.2 L8.9 17.7 L6.6 19.6 L4.4 17.4 L6.3 15.1 L5.8 13.8 L2.8 13.5 L2.8 10.5 L5.8 10.2 L6.3 8.9 L4.4 6.6 L6.6 4.4 L8.9 6.3 L10.2 5.8 L10.5 2.8 L13.5 2.8 L13.8 5.8 L15.1 6.3 L17.4 4.4 L19.6 6.6 L17.7 8.9 Z" />
                    <circle cx="12" cy="12" r="3.3" />
                </svg>
            </button>

            {open && (
                <div className="gear__panel" role="dialog" aria-label={t.settings}>
                    <label className="field">
                        <span>{t.work}</span>
                        <input
                            type="text"
                            placeholder="25:00"
                            ref={workWheelRef}
                            title={t.durationTitle(t.work)}
                            value={form.workSeconds}
                            onChange={updateField("workSeconds")}
                        />
                    </label>
                    <label className="field">
                        <span>{t.shortBreak}</span>
                        <input
                            type="text"
                            placeholder="5:00"
                            ref={shortWheelRef}
                            title={t.durationTitle(t.shortBreak)}
                            value={form.shortBreakSeconds}
                            onChange={updateField("shortBreakSeconds")}
                        />
                    </label>
                    <label className="field">
                        <span>{t.longBreak}</span>
                        <input
                            type="text"
                            placeholder="15:00"
                            ref={longWheelRef}
                            title={t.durationTitle(t.longBreak)}
                            value={form.longBreakSeconds}
                            onChange={updateField("longBreakSeconds")}
                        />
                    </label>
                    <label className="field">
                        <span>{t.longBreakEvery}</span>
                        <input
                            type="number"
                            min={1}
                            max={600}
                            ref={everyWheelRef}
                            title={t.longBreakEveryTitle}
                            value={form.longBreakEvery}
                            onChange={updateField("longBreakEvery")}
                        />
                    </label>

                    <p className="settings__hint">{t.durationHint}</p>

                    <button className="btn btn--primary" onClick={saveSettings} title={t.saveTitle}>
                        {t.save}
                    </button>

                    <div className="gear__divider" />

                    <div className="field" title={t.languageTitle}>
                        <span>{t.language}</span>
                        <LanguagePicker
                            value={settings.language}
                            autoLabel={t.languageAuto}
                            onChange={(value) => SetLanguage(value).then(apply)}
                        />
                    </div>

                    <div className="field" title={t.themeTitle}>
                        <span>{t.theme}</span>
                        <ThemePicker
                            value={settings.theme}
                            autoLabel={t.themeAuto}
                            lightLabel={t.themeLight}
                            darkLabel={t.themeDark}
                            onChange={(value) => SetTheme(value).then(apply)}
                        />
                    </div>

                    <label className="toggle" title={t.alwaysOnTopTitle}>
                        <input
                            type="checkbox"
                            checked={settings.alwaysOnTop}
                            onChange={(e) => SetAlwaysOnTop(e.target.checked).then(apply)}
                        />
                        {t.alwaysOnTop}
                    </label>
                    <label className="toggle" title={t.soundTitle}>
                        <input
                            type="checkbox"
                            checked={settings.soundEnabled}
                            onChange={(e) => SetSoundEnabled(e.target.checked).then(apply)}
                        />
                        {t.sound}
                    </label>
                    <label className="toggle" title={t.notificationsTitle}>
                        <input
                            type="checkbox"
                            checked={settings.notificationsEnabled}
                            onChange={(e) => SetNotificationsEnabled(e.target.checked).then(apply)}
                        />
                        {t.notifications}
                    </label>
                    <label className="toggle" title={t.historyEnabledTitle}>
                        <input
                            type="checkbox"
                            checked={settings.historyEnabled}
                            onChange={(e) => SetHistoryEnabled(e.target.checked).then(apply)}
                        />
                        {t.historyEnabled}
                    </label>
                    <p className="settings__hint">{t.historyHint}</p>
                    <button
                        className="btn"
                        title={t.historyDeleteTitle}
                        onClick={() => setConfirmDeleteOpen(true)}
                    >
                        {t.historyDelete}
                    </button>
                    <button
                        className="btn"
                        title={t.openDataDirTitle}
                        onClick={() => OpenDataDirectory().catch((err) => setError(String(err)))}
                    >
                        {t.openDataDir}
                    </button>

                    <label className="toggle" title={t.closeToTrayTitle}>
                        <input
                            type="checkbox"
                            checked={settings.closeToTray}
                            onChange={(e) => SetCloseToTray(e.target.checked).then(apply)}
                        />
                        {t.closeToTray}
                    </label>
                    <label className="toggle" title={t.singleKeyTitle}>
                        <input
                            type="checkbox"
                            checked={settings.singleKeyShortcuts}
                            onChange={(e) => SetSingleKeyShortcuts(e.target.checked).then(apply)}
                        />
                        {t.singleKey}
                    </label>

                    {error && (
                        <p className="settings__error" role="alert">
                            {error}
                        </p>
                    )}
                </div>
            )}
            {confirmDeleteOpen && (
                <ConfirmDialog
                    title={t.historyDeleteTitle}
                    body={<p>{t.historyDeleteConfirm}</p>}
                    confirmLabel={t.historyDelete}
                    cancelLabel={t.historyConsentDecline}
                    onCancel={() => setConfirmDeleteOpen(false)}
                    onConfirm={() => {
                        setConfirmDeleteOpen(false);
                        DeleteHistoryData().then(apply);
                    }}
                />
            )}
        </div>
    );
}
