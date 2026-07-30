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
        theme: "Theme",
        themeTitle: "Colour scheme of the window",
        themeAuto: "Auto (system)",
        themeLight: "Light",
        themeDark: "Dark",
        notifications: "Notifications",
        notificationsTitle: "Show a desktop notification when a phase ends",
        historyEnabled: "Record history",
        historyEnabledTitle: "Store finished phases locally for reports and exports",
        historyHint:
            "Opt-in. Stored locally in history.json next to settings.json. Raw events kept for 30 days by default.",
        historyDelete: "Delete history",
        historyDeleteTitle: "Delete history.json permanently",
        exportCsv: "Export CSV",
        exportCsvTitle: "Export phase history as CSV",
        exportJson: "Export JSON",
        exportJsonTitle: "Export raw history.json",
        openDataDir: "Open data folder",
        openDataDirTitle: "Open folder containing settings.json and history.json",
        reportOpenTitle: "Open adherence report",
        reportTitle: "Daily adherence",
        reportBack: "Back",
        reportTabOverview: "Overview",
        reportTabWorkHours: "Work hours",
        reportNoData: "No history yet. Enable recording in settings to build your daily timeline.",
        reportTomatoesToday: "Tomatoes today",
        reportAvg7: "7-day avg",
        reportAdherence: "Adherence",
        reportSkippedBreaks: "Skipped breaks",
        reportPaused: "Paused",
        reportStreak: "Streak",
        reportProductiveHour: "Productive hour",
        reportCoverage: "Coverage",
        reportAfterHours: "After hours",
        reportWorkInBreaks: "Work in fixed breaks",
        reportTimeline: "Timeline",
        reportTable: "Phases",
        reportStartedAt: "Started",
        reportEndedAt: "Ended",
        reportTimelineLegend: "work/red · short break/green · long break/blue",
        reportPhase: "Phase",
        reportDuration: "Duration",
        reportDurationHint: (duration: string) => `Duration: ${duration}`,
        reportOutcome: "Outcome",
        workHoursEnabled: "Consider work hours",
        workHoursEnabledTitle: "Compute coverage, break-time work and after-hours work",
        workHoursEnabledHelp:
            "If enabled, the report compares tracked work against your planned schedule.",
        workHoursWeekday: "Day",
        workHoursTimeRange: "Work time",
        workHoursBreaks: "Fixed breaks",
        workHoursBreaksHint: "Ranges like 12-12:30 or 12:00-13, separated by ; or ,",
        workHoursTableCaption: "Work hours per weekday",
        workHoursStartFor: (day: string) => `Work start on ${day}`,
        workHoursEndFor: (day: string) => `Work end on ${day}`,
        workHoursBreaksFor: (day: string) => `Fixed breaks on ${day}`,
        workHoursRemoveDayFor: (day: string) => `Remove ${day}`,
        workHoursAddDay: "Add day",
        workHoursRemoveDay: "Remove day",
        workHoursInvalidBreaks:
            "Fixed breaks must use HH:MM-HH:MM and stay inside the configured work time.",
        reportActions: "Actions",
        weekdaySun: "Sun",
        weekdayMon: "Mon",
        weekdayTue: "Tue",
        weekdayWed: "Wed",
        weekdayThu: "Thu",
        weekdayFri: "Fri",
        weekdaySat: "Sat",
        historyDeleteConfirm:
            "Delete your saved history now? This removes history.json and cannot be undone.",
        historyConsentTitle: "Enable local history recording?",
        historyConsentEnable: "Enable recording",
        historyConsentDecline: "Not now",
        historyConsentPrompt:
            "Enable local history recording for reports and export?\n\nSaved data: phase timings only.\nStorage: history.json next to settings.json.\nRetention: raw events for 30 days.\nNo data leaves your device.",
        closeToTray: "Close to notification area",
        closeToTrayTitle:
            "Closing the window keeps the timer running in the notification area instead of quitting",

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

        harvestTitle: (today: number, total: number) =>
            `Today: ${today} tomato(es)\nTotal: ${total}\nEvery work phase that runs out on its own earns one. Skipping or resetting never takes them away.`,
        streakLabel: (streak: number) => `${streak}× streak`,
        streakTitle: (streak: number, best: number) =>
            `Streak: ${streak} work phases in a row (best: ${best})\nSkipping or resetting a work phase drops it back to zero.`,
        harvestAria: (today: number, total: number, streak: number, best: number) =>
            `${today} tomatoes today, ${total} total, current streak ${streak}, best streak ${best}`,
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
        theme: "Design",
        themeTitle: "Farbschema des Fensters",
        themeAuto: "Automatisch (System)",
        themeLight: "Hell",
        themeDark: "Dunkel",
        notifications: "Benachrichtigungen",
        notificationsTitle: "Beim Phasenende eine Desktop-Benachrichtigung zeigen",
        historyEnabled: "Verlauf aufzeichnen",
        historyEnabledTitle: "Abgeschlossene Phasen lokal für Auswertung und Export speichern",
        historyHint:
            "Opt-in. Speicherung lokal in history.json neben settings.json. Rohdaten bleiben standardmäßig 30 Tage.",
        historyDelete: "Verlauf löschen",
        historyDeleteTitle: "history.json dauerhaft löschen",
        exportCsv: "CSV exportieren",
        exportCsvTitle: "Phasenverlauf als CSV exportieren",
        exportJson: "JSON exportieren",
        exportJsonTitle: "Rohdaten aus history.json exportieren",
        openDataDir: "Datenordner öffnen",
        openDataDirTitle: "Ordner mit settings.json und history.json öffnen",
        reportOpenTitle: "Auswertung öffnen",
        reportTitle: "Tagesauswertung",
        reportBack: "Zurück",
        reportTabOverview: "Übersicht",
        reportTabWorkHours: "Arbeitszeit",
        reportNoData:
            "Noch kein Verlauf vorhanden. In den Einstellungen Verlauf aktivieren, dann entsteht die Tagesansicht.",
        reportTomatoesToday: "Tomaten heute",
        reportAvg7: "Ø 7 Tage",
        reportAdherence: "Durchhaltequote",
        reportSkippedBreaks: "Pausen übersprungen",
        reportPaused: "Pausiert",
        reportStreak: "Serie",
        reportProductiveHour: "Produktivste Stunde",
        reportCoverage: "Abdeckung",
        reportAfterHours: "Nach Feierabend",
        reportWorkInBreaks: "Arbeit in festen Pausen",
        reportTimeline: "Zeitband",
        reportTable: "Phasen",
        reportStartedAt: "Start",
        reportEndedAt: "Ende",
        reportTimelineLegend: "Arbeit/rot · kurze Pause/grün · lange Pause/blau",
        reportPhase: "Phase",
        reportDuration: "Dauer",
        reportDurationHint: (duration: string) => `Dauer: ${duration}`,
        reportOutcome: "Ausgang",
        workHoursEnabled: "Arbeitszeiten berücksichtigen",
        workHoursEnabledTitle:
            "Abdeckung, Arbeit in Pausenzeit und Arbeit nach Feierabend berechnen",
        workHoursEnabledHelp:
            "Wenn aktiv, vergleicht die Auswertung erfasste Arbeit mit deinem geplanten Rahmen.",
        workHoursWeekday: "Tag",
        workHoursTimeRange: "Arbeitszeit",
        workHoursBreaks: "Feste Pausen",
        workHoursBreaksHint: "Bereiche wie 12-12:30 oder 12:00-13, getrennt mit ; oder ,",
        workHoursTableCaption: "Arbeitszeiten je Wochentag",
        workHoursStartFor: (day: string) => `Arbeitsbeginn am ${day}`,
        workHoursEndFor: (day: string) => `Arbeitsende am ${day}`,
        workHoursBreaksFor: (day: string) => `Feste Pausen am ${day}`,
        workHoursRemoveDayFor: (day: string) => `${day} entfernen`,
        workHoursAddDay: "Tag hinzufügen",
        workHoursRemoveDay: "Tag entfernen",
        workHoursInvalidBreaks:
            "Feste Pausen müssen HH:MM-HH:MM nutzen und innerhalb der Arbeitszeit liegen.",
        reportActions: "Aktionen",
        weekdaySun: "So",
        weekdayMon: "Mo",
        weekdayTue: "Di",
        weekdayWed: "Mi",
        weekdayThu: "Do",
        weekdayFri: "Fr",
        weekdaySat: "Sa",
        historyDeleteConfirm:
            "Gespeicherten Verlauf jetzt löschen? Das entfernt history.json endgültig.",
        historyConsentTitle: "Lokale Verlaufserfassung aktivieren?",
        historyConsentEnable: "Aufzeichnung aktivieren",
        historyConsentDecline: "Jetzt nicht",
        historyConsentPrompt:
            "Lokale Verlaufserfassung für Auswertung und Export aktivieren?\n\nGespeichert werden nur Phasenzeiten.\nAblage: history.json neben settings.json.\nAufbewahrung: Rohdaten 30 Tage.\nKeine Übertragung vom Gerät.",
        closeToTray: "Schließen in den Infobereich",
        closeToTrayTitle:
            "Beim Schließen läuft der Timer im Infobereich weiter, statt sich zu beenden",

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

        harvestTitle: (today: number, total: number) =>
            `Heute: ${today} Tomate(n)\nGesamt: ${total}\nJede Arbeitsphase, die von selbst ausläuft, bringt eine. Überspringen oder Zurücksetzen nimmt keine weg.`,
        streakLabel: (streak: number) => `${streak}× Serie`,
        streakTitle: (streak: number, best: number) =>
            `Serie: ${streak} Arbeitsphasen am Stück (Bestwert: ${best})\nÜberspringen oder Zurücksetzen einer Arbeitsphase setzt sie auf null.`,
        harvestAria: (today: number, total: number, streak: number, best: number) =>
            `${today} Tomaten heute, ${total} gesamt, aktuelle Serie ${streak}, beste Serie ${best}`,
    },
} as const;

export type Strings = (typeof strings)["en"];

/** Returns the string table for a language, defaulting to English. */
export function texts(language: string): Strings {
    return language === "de" ? (strings.de as unknown as Strings) : strings.en;
}
