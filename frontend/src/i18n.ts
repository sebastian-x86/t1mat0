export type Language = "en" | "de";

/**
 * Every string the UI shows. The Go side sends the resolved language with each
 * state update, so the frontend never has to guess the locale itself.
 */
const strings = {
    en: {
        loading: "Loading…",

        statusIdle: "idle",
        statusRunning: "running",
        statusPaused: "paused",

        start: "Start",
        pause: "Pause",
        resume: "Resume",
        reset: "Reset",
        skip: "Skip",

        toggleTitle: (label: string, hint: string) => `${label} the timer${hint}`,
        resetTitle: (hint: string) => `Reset this phase${hint}`,
        skipTitle: (hint: string) => `Skip to the next phase${hint}`,

        clockTitle:
            "Type the minutes, then the seconds — arrows or scroll adjust, Enter sets, Esc cancels",
        clockEditTitle: "Edit the duration of this phase (F2)",
        clockAria: (remaining: string) =>
            `${remaining} remaining — edit the duration of this phase`,
        clockDurationAria: "Phase duration",
        clockHint: "type mm ss · ↑↓ or scroll · Enter to set, Esc to cancel",
        progressAria: (phase: string) => `${phase} progress`,
        progressValue: (percent: number, remaining: string) =>
            `${percent} percent, ${remaining} remaining`,
        liveStatus: (phase: string, status: string, remaining: string) =>
            `${phase}, ${status}, ${remaining} remaining`,

        settings: "Settings",
        settingsTitle: "Settings (Ctrl+,)",
        work: "Work",
        shortBreak: "Short break",
        longBreak: "Long break",
        workTitle:
            "Work phase: focus on one task until the timer runs out. Finishing it earns a tomato.",
        shortBreakTitle: "Short break: step away for a moment. It follows every work phase.",
        longBreakTitle: "Long break: the longer rest after several work phases in a row.",
        longBreakEvery: "Long break every",
        longBreakEveryTitle: "Number of work phases before a long break — scroll to change",
        durationTitle: (label: string) =>
            `${label} duration — mm:ss, "45s" or plain minutes; scroll to change`,
        durationHint: 'mm:ss, "45s" or plain minutes (e.g. 0:30).',
        invalidDuration: (label: string) =>
            `Invalid duration for "${label}" — use mm:ss, "45s" or minutes.`,
        save: "Save",
        saveTitle: "Save settings",
        alwaysOnTop: "Always on Top",
        alwaysOnTopTitle: "Keep the window above all other windows",
        sound: "Sound",
        soundTitle: "Play a chime when a phase ends",
        singleKey: "Single-key shortcuts",
        singleKeyTitle: "Single letter shortcuts such as R, S or E (Ctrl+, and F1/F2 always work)",
        language: "Language",
        languageTitle: "Language of the interface, the tray menu and the notifications",
        languageAuto: "Auto (system)",

        shortcuts: "Keyboard shortcuts",
        shortcutsTitle: "Keyboard shortcuts (F1)",
        scSettings: "Settings",
        scList: "This list",
        scEdit: "Edit duration",
        scFocus: "Move focus",
        scClose: "Close / cancel",
        scToggle: "Start / Pause",
        scReset: "Reset phase",
        scSkip: "Skip phase",
        scOff: "Single-key shortcuts are off — see settings.",

        harvestTitle: (count: number) =>
            `Harvested tomatoes: ${count}\nEvery work phase that runs out on its own earns one. Skipping or resetting never takes them away.`,
        streakLabel: (streak: number) => `${streak}× streak`,
        streakTitle: (streak: number, best: number) =>
            `Streak: ${streak} work phases in a row (best: ${best})\nSkipping or resetting a work phase drops it back to zero.`,
        harvestAria: (count: number, streak: number, best: number) =>
            `${count} tomatoes harvested, current streak ${streak}, best streak ${best}`,
    },

    de: {
        loading: "Lädt…",

        statusIdle: "bereit",
        statusRunning: "läuft",
        statusPaused: "pausiert",

        start: "Start",
        pause: "Pause",
        resume: "Weiter",
        reset: "Zurücksetzen",
        skip: "Überspringen",

        toggleTitle: (label: string, hint: string) => `Timer: ${label}${hint}`,
        resetTitle: (hint: string) => `Diese Phase zurücksetzen${hint}`,
        skipTitle: (hint: string) => `Zur nächsten Phase springen${hint}`,

        clockTitle:
            "Erst die Minuten tippen, dann die Sekunden — Pfeiltasten oder Mausrad ändern, Enter übernimmt, Esc bricht ab",
        clockEditTitle: "Dauer dieser Phase bearbeiten (F2)",
        clockAria: (remaining: string) =>
            `${remaining} verbleibend — Dauer dieser Phase bearbeiten`,
        clockDurationAria: "Dauer der Phase",
        clockHint: "mm ss tippen · ↑↓ oder Mausrad · Enter übernimmt, Esc bricht ab",
        progressAria: (phase: string) => `Fortschritt: ${phase}`,
        progressValue: (percent: number, remaining: string) =>
            `${percent} Prozent, ${remaining} verbleibend`,
        liveStatus: (phase: string, status: string, remaining: string) =>
            `${phase}, ${status}, ${remaining} verbleibend`,

        settings: "Einstellungen",
        settingsTitle: "Einstellungen (Strg+,)",
        work: "Arbeit",
        shortBreak: "Kurze Pause",
        longBreak: "Lange Pause",
        workTitle:
            "Arbeitsphase: konzentriert an einer Aufgabe arbeiten, bis die Zeit abl\u00e4uft. Daf\u00fcr gibt es eine Tomate.",
        shortBreakTitle: "Kurze Pause: kurz durchatmen. Sie folgt auf jede Arbeitsphase.",
        longBreakTitle:
            "Lange Pause: die l\u00e4ngere Erholung nach mehreren Arbeitsphasen am St\u00fcck.",
        longBreakEvery: "Lange Pause alle",
        longBreakEveryTitle:
            "Anzahl der Arbeitsphasen bis zur langen Pause — Mausrad ändert den Wert",
        durationTitle: (label: string) =>
            `Dauer \u201e${label}\u201c — mm:ss, \u201e45s\u201c oder ganze Minuten; Mausrad ändert den Wert`,
        durationHint: "mm:ss, \u201e45s\u201c oder ganze Minuten (z. B. 0:30).",
        invalidDuration: (label: string) =>
            `Ungültige Dauer für \u201e${label}\u201c — nutze mm:ss, \u201e45s\u201c oder Minuten.`,
        save: "Speichern",
        saveTitle: "Einstellungen speichern",
        alwaysOnTop: "Immer im Vordergrund",
        alwaysOnTopTitle: "Fenster über allen anderen Fenstern halten",
        sound: "Ton",
        soundTitle: "Ton abspielen, wenn eine Phase endet",
        singleKey: "Ein-Tasten-Kürzel",
        singleKeyTitle: "Buchstaben-Kürzel wie R, S oder E (Strg+, und F1/F2 gehen immer)",
        language: "Sprache",
        languageTitle: "Sprache der Oberfläche, des Tray-Menüs und der Benachrichtigungen",
        languageAuto: "Automatisch (System)",

        shortcuts: "Tastaturkürzel",
        shortcutsTitle: "Tastaturkürzel (F1)",
        scSettings: "Einstellungen",
        scList: "Diese Liste",
        scEdit: "Dauer bearbeiten",
        scFocus: "Fokus weiterschalten",
        scClose: "Schließen / abbrechen",
        scToggle: "Start / Pause",
        scReset: "Phase zurücksetzen",
        scSkip: "Phase überspringen",
        scOff: "Ein-Tasten-Kürzel sind aus — siehe Einstellungen.",

        harvestTitle: (count: number) =>
            `Geerntete Tomaten: ${count}\nJede Arbeitsphase, die von selbst ausläuft, bringt eine. Überspringen oder Zurücksetzen nimmt keine weg.`,
        streakLabel: (streak: number) => `${streak}× Serie`,
        streakTitle: (streak: number, best: number) =>
            `Serie: ${streak} Arbeitsphasen am Stück (Bestwert: ${best})\nÜberspringen oder Zurücksetzen einer Arbeitsphase setzt sie auf null.`,
        harvestAria: (count: number, streak: number, best: number) =>
            `${count} Tomaten geerntet, aktuelle Serie ${streak}, beste Serie ${best}`,
    },
} as const;

export type Strings = (typeof strings)["en"];

/** Returns the string table for a language, defaulting to English. */
export function texts(language: string): Strings {
    return language === "de" ? (strings.de as unknown as Strings) : strings.en;
}
