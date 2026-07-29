package main

import "strings"

// Supported UI languages. "auto" is only valid as a setting; it resolves to one
// of the concrete languages via the operating system.
const (
	LangAuto    = "auto"
	LangEnglish = "en"
	LangGerman  = "de"
)

// ResolveLanguage turns the stored preference into a concrete language.
func ResolveLanguage(preference string) string {
	switch preference {
	case LangGerman, LangEnglish:
		return preference
	default:
		return normalizeLanguage(detectSystemLanguage())
	}
}

// normalizeLanguage maps a locale such as "de-DE" or "de_DE.UTF-8" onto a
// supported language, defaulting to English.
func normalizeLanguage(locale string) string {
	locale = strings.ToLower(strings.TrimSpace(locale))
	if strings.HasPrefix(locale, "de") {
		return LangGerman
	}
	return LangEnglish
}

// translations holds every string the Go side shows: tray menu, tooltips,
// notifications and the phase labels handed to the frontend.
var translations = map[string]map[string]string{
	"phase.work":            {LangEnglish: "Work", LangGerman: "Arbeit"},
	"phase.shortBreak":      {LangEnglish: "Short Break", LangGerman: "Kurze Pause"},
	"phase.longBreak":       {LangEnglish: "Long Break", LangGerman: "Lange Pause"},
	"tray.title":            {LangEnglish: "Pomodoro", LangGerman: "Pomodoro"},
	"tray.tooltip":          {LangEnglish: "Pomodoro Timer", LangGerman: "Pomodoro-Timer"},
	"tray.start":            {LangEnglish: "Start", LangGerman: "Start"},
	"tray.pause":            {LangEnglish: "Pause", LangGerman: "Pause"},
	"tray.resume":           {LangEnglish: "Resume", LangGerman: "Weiter"},
	"tray.startTip":         {LangEnglish: "Start or pause the timer", LangGerman: "Timer starten oder pausieren"},
	"tray.reset":            {LangEnglish: "Reset", LangGerman: "Zurücksetzen"},
	"tray.resetTip":         {LangEnglish: "Reset the timer", LangGerman: "Timer zurücksetzen"},
	"tray.skip":             {LangEnglish: "Skip Phase", LangGerman: "Phase überspringen"},
	"tray.skipTip":          {LangEnglish: "Jump to the next phase", LangGerman: "Zur nächsten Phase springen"},
	"tray.alwaysOnTop":      {LangEnglish: "Always on Top", LangGerman: "Immer im Vordergrund"},
	"tray.alwaysOnTopTip":   {LangEnglish: "Keep the window above others", LangGerman: "Fenster über allen anderen halten"},
	"tray.sound":            {LangEnglish: "Sound", LangGerman: "Ton"},
	"tray.soundTip":         {LangEnglish: "Play a sound on phase change", LangGerman: "Ton beim Phasenwechsel abspielen"},
	"tray.showHide":         {LangEnglish: "Show / Hide", LangGerman: "Anzeigen / Verbergen"},
	"tray.showHideTip":      {LangEnglish: "Toggle the window", LangGerman: "Fenster ein- oder ausblenden"},
	"tray.quit":             {LangEnglish: "Quit", LangGerman: "Beenden"},
	"tray.quitTip":          {LangEnglish: "Exit the application", LangGerman: "Anwendung beenden"},
	"notify.finished":       {LangEnglish: "finished", LangGerman: "beendet"},
	"notify.next":           {LangEnglish: "Next up", LangGerman: "Als Nächstes"},
	"notify.harvested":      {LangEnglish: "Tomato harvested", LangGerman: "Tomate geerntet"},
	"notify.harvestedCount": {LangEnglish: "tomatoes", LangGerman: "Tomaten"},
}

// T looks up a translated string, falling back to English.
func T(lang, key string) string {
	entry, ok := translations[key]
	if !ok {
		return key
	}
	if value, ok := entry[lang]; ok {
		return value
	}
	return entry[LangEnglish]
}

// PhaseLabelIn returns the phase name in the given language.
func PhaseLabelIn(lang string, phase Phase) string {
	switch phase {
	case PhaseShortBreak:
		return T(lang, "phase.shortBreak")
	case PhaseLongBreak:
		return T(lang, "phase.longBreak")
	default:
		return T(lang, "phase.work")
	}
}

// PhaseLabel returns the English phase name.
func PhaseLabel(phase Phase) string {
	return PhaseLabelIn(LangEnglish, phase)
}
