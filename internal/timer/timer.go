// Package timer holds the pomodoro state machine and the settings it runs on.
// It knows nothing about Wails, the tray or the disk.
package timer

import (
	"encoding/json"
	"errors"
	"fmt"
	"sync"

	"t1m/internal/i18n"
)

// Phase is one segment of a pomodoro cycle.
type Phase string

const (
	PhaseWork       Phase = "work"
	PhaseShortBreak Phase = "shortBreak"
	PhaseLongBreak  Phase = "longBreak"
)

// Status is the run state of the timer.
type Status string

const (
	StatusIdle    Status = "idle"
	StatusRunning Status = "running"
	StatusPaused  Status = "paused"
)

// Theme selects the colour scheme of the window. "auto" follows the operating
// system, which the frontend resolves through prefers-color-scheme.
const (
	ThemeAuto  = "auto"
	ThemeLight = "light"
	ThemeDark  = "dark"
)

// NormalizeTheme maps anything unknown back onto "auto", so a hand edited or
// outdated settings file can never leave the window without a colour scheme.
func NormalizeTheme(theme string) string {
	switch theme {
	case ThemeLight, ThemeDark:
		return theme
	default:
		return ThemeAuto
	}
}

// MaxPhaseSeconds caps a single phase at 600 minutes.
const MaxPhaseSeconds = 600 * 60

// Settings holds the user configurable options. Phase durations are stored in
// seconds so sub-minute timers are possible.
type Settings struct {
	WorkSeconds       int  `json:"workSeconds"`
	ShortBreakSeconds int  `json:"shortBreakSeconds"`
	LongBreakSeconds  int  `json:"longBreakSeconds"`
	LongBreakEvery    int  `json:"longBreakEvery"`
	AlwaysOnTop       bool `json:"alwaysOnTop"`
	SoundEnabled      bool `json:"soundEnabled"`
	AutoStartNext     bool `json:"autoStartNext"`
	// Language is "auto", "en" or "de".
	Language string `json:"language"`
	// Theme is "auto", "light" or "dark".
	Theme string `json:"theme"`
	// SingleKeyShortcuts enables the letter shortcuts (space, n, r, ...).
	// WCAG 2.1.4 requires them to be switchable off, because speech input
	// and screen readers trigger bare character keys unintentionally.
	SingleKeyShortcuts bool `json:"singleKeyShortcuts"`
}

// legacySettings mirrors the pre-seconds settings file format.
type legacySettings struct {
	WorkMinutes       *int `json:"workMinutes"`
	ShortBreakMinutes *int `json:"shortBreakMinutes"`
	LongBreakMinutes  *int `json:"longBreakMinutes"`
}

// UnmarshalJSON accepts both the current seconds-based format and settings
// files written by older versions that stored whole minutes.
func (s *Settings) UnmarshalJSON(data []byte) error {
	type alias Settings
	tmp := alias(*s)
	if err := json.Unmarshal(data, &tmp); err != nil {
		return err
	}
	*s = Settings(tmp)

	var legacy legacySettings
	if err := json.Unmarshal(data, &legacy); err != nil {
		return err
	}
	if legacy.WorkMinutes != nil && !hasKey(data, "workSeconds") {
		s.WorkSeconds = *legacy.WorkMinutes * 60
	}
	if legacy.ShortBreakMinutes != nil && !hasKey(data, "shortBreakSeconds") {
		s.ShortBreakSeconds = *legacy.ShortBreakMinutes * 60
	}
	if legacy.LongBreakMinutes != nil && !hasKey(data, "longBreakSeconds") {
		s.LongBreakSeconds = *legacy.LongBreakMinutes * 60
	}
	return nil
}

func hasKey(data []byte, key string) bool {
	var raw map[string]json.RawMessage
	if err := json.Unmarshal(data, &raw); err != nil {
		return false
	}
	_, ok := raw[key]
	return ok
}

// DefaultSettings returns the classic pomodoro configuration.
func DefaultSettings() Settings {
	return Settings{
		WorkSeconds:        25 * 60,
		ShortBreakSeconds:  5 * 60,
		LongBreakSeconds:   15 * 60,
		LongBreakEvery:     4,
		AlwaysOnTop:        false,
		SoundEnabled:       true,
		AutoStartNext:      true,
		Language:           i18n.LangAuto,
		Theme:              ThemeAuto,
		SingleKeyShortcuts: true,
	}
}

// Validate reports whether the settings can be used by the timer.
func (s Settings) Validate() error {
	durations := map[string]int{
		"workSeconds":       s.WorkSeconds,
		"shortBreakSeconds": s.ShortBreakSeconds,
		"longBreakSeconds":  s.LongBreakSeconds,
	}
	for name, value := range durations {
		if value < 1 {
			return fmt.Errorf("%s must be at least 1, got %d", name, value)
		}
		if value > MaxPhaseSeconds {
			return fmt.Errorf("%s must be at most %d, got %d", name, MaxPhaseSeconds, value)
		}
	}
	if s.LongBreakEvery < 1 {
		return fmt.Errorf("longBreakEvery must be at least 1, got %d", s.LongBreakEvery)
	}
	if s.LongBreakEvery > 600 {
		return fmt.Errorf("longBreakEvery must be at most 600, got %d", s.LongBreakEvery)
	}
	return nil
}

// State is the snapshot handed to the frontend.
type State struct {
	Status             Status   `json:"status"`
	Phase              Phase    `json:"phase"`
	PhaseLabel         string   `json:"phaseLabel"`
	CompletedWork      int      `json:"completedWork"`
	RemainingSeconds   int      `json:"remainingSeconds"`
	TotalSeconds       int      `json:"totalSeconds"`
	FormattedRemaining string   `json:"formattedRemaining"`
	Settings           Settings `json:"settings"`
	Harvest            Harvest  `json:"harvest"`
	// Language is the resolved UI language ("en" or "de").
	Language string `json:"language"`
}

// Timer implements the pomodoro state machine. It is safe for concurrent use.
type Timer struct {
	mu               sync.Mutex
	settings         Settings
	status           Status
	phase            Phase
	completedWork    int
	remainingSeconds int
	harvest          Harvest
}

// NewTimer creates a timer in idle state at the start of a work phase.
func NewTimer(settings Settings) *Timer {
	if err := settings.Validate(); err != nil {
		settings = DefaultSettings()
	}
	settings.Theme = NormalizeTheme(settings.Theme)
	t := &Timer{
		settings: settings,
		status:   StatusIdle,
		phase:    PhaseWork,
	}
	t.remainingSeconds = t.phaseDurationSeconds(PhaseWork)
	return t
}

func (t *Timer) phaseDurationSeconds(phase Phase) int {
	switch phase {
	case PhaseShortBreak:
		return t.settings.ShortBreakSeconds
	case PhaseLongBreak:
		return t.settings.LongBreakSeconds
	default:
		return t.settings.WorkSeconds
	}
}

// FormatSeconds renders seconds as mm:ss (or hh:mm:ss beyond an hour).
func FormatSeconds(total int) string {
	if total < 0 {
		total = 0
	}
	hours := total / 3600
	minutes := (total % 3600) / 60
	seconds := total % 60
	if hours > 0 {
		return fmt.Sprintf("%02d:%02d:%02d", hours, minutes, seconds)
	}
	return fmt.Sprintf("%02d:%02d", minutes, seconds)
}

func (t *Timer) snapshotLocked() State {
	return State{
		Status:             t.status,
		Phase:              t.phase,
		PhaseLabel:         PhaseLabelIn(i18n.Resolve(t.settings.Language), t.phase),
		CompletedWork:      t.completedWork,
		RemainingSeconds:   t.remainingSeconds,
		TotalSeconds:       t.phaseDurationSeconds(t.phase),
		FormattedRemaining: FormatSeconds(t.remainingSeconds),
		Settings:           t.settings,
		Harvest:            t.harvest,
		Language:           i18n.Resolve(t.settings.Language),
	}
}

// Snapshot returns the current state.
func (t *Timer) Snapshot() State {
	t.mu.Lock()
	defer t.mu.Unlock()
	return t.snapshotLocked()
}

// Start begins or resumes the current phase.
func (t *Timer) Start() State {
	t.mu.Lock()
	defer t.mu.Unlock()
	if t.remainingSeconds <= 0 {
		t.remainingSeconds = t.phaseDurationSeconds(t.phase)
	}
	t.status = StatusRunning
	return t.snapshotLocked()
}

// Pause halts a running timer, keeping the remaining time.
func (t *Timer) Pause() State {
	t.mu.Lock()
	defer t.mu.Unlock()
	if t.status == StatusRunning {
		t.status = StatusPaused
	}
	return t.snapshotLocked()
}

// Toggle starts the timer when it is not running and pauses it otherwise.
func (t *Timer) Toggle() State {
	t.mu.Lock()
	running := t.status == StatusRunning
	t.mu.Unlock()
	if running {
		return t.Pause()
	}
	return t.Start()
}

// Reset returns the timer to an idle work phase and clears the cycle counter.
func (t *Timer) Reset() State {
	t.mu.Lock()
	defer t.mu.Unlock()
	t.status = StatusIdle
	t.phase = PhaseWork
	t.completedWork = 0
	t.harvest.Streak = 0
	t.remainingSeconds = t.phaseDurationSeconds(PhaseWork)
	return t.snapshotLocked()
}

// advanceLocked moves to the next phase in the cycle.
func (t *Timer) advanceLocked() {
	if t.phase == PhaseWork {
		t.completedWork++
		if t.settings.LongBreakEvery > 0 && t.completedWork%t.settings.LongBreakEvery == 0 {
			t.phase = PhaseLongBreak
		} else {
			t.phase = PhaseShortBreak
		}
	} else {
		t.phase = PhaseWork
	}
	t.remainingSeconds = t.phaseDurationSeconds(t.phase)
	if t.settings.AutoStartNext {
		t.status = StatusRunning
	} else {
		t.status = StatusIdle
	}
}

// Skip jumps to the next phase immediately.
func (t *Timer) Skip() (State, Phase) {
	t.mu.Lock()
	defer t.mu.Unlock()
	previous := t.phase
	if previous == PhaseWork {
		t.harvest.Streak = 0
	}
	t.advanceLocked()
	return t.snapshotLocked(), previous
}

// TickResult describes the outcome of a single one-second tick.
type TickResult struct {
	State         State
	PhaseChanged  bool
	FinishedPhase Phase
	// Harvested reports that this tick earned a tomato.
	Harvested bool
}

// Tick advances the timer by one second. It only has an effect while running.
func (t *Timer) Tick() TickResult {
	t.mu.Lock()
	defer t.mu.Unlock()

	if t.status != StatusRunning {
		return TickResult{State: t.snapshotLocked()}
	}

	if t.remainingSeconds > 0 {
		t.remainingSeconds--
	}

	if t.remainingSeconds > 0 {
		return TickResult{State: t.snapshotLocked()}
	}

	finished := t.phase
	harvested := false
	if finished == PhaseWork {
		t.harvest.Tomatoes++
		t.harvest.Streak++
		if t.harvest.Streak > t.harvest.BestStreak {
			t.harvest.BestStreak = t.harvest.Streak
		}
		harvested = true
	}
	t.advanceLocked()
	return TickResult{
		State:         t.snapshotLocked(),
		PhaseChanged:  true,
		FinishedPhase: finished,
		Harvested:     harvested,
	}
}

// ErrInvalidSettings is returned when new settings fail validation.
var ErrInvalidSettings = errors.New("invalid settings")

// UpdateSettings validates and applies new settings. Durations of a phase that
// is not currently running are re-applied immediately.
func (t *Timer) UpdateSettings(next Settings) (State, error) {
	if err := next.Validate(); err != nil {
		return t.Snapshot(), fmt.Errorf("%w: %s", ErrInvalidSettings, err)
	}

	t.mu.Lock()
	defer t.mu.Unlock()

	next.Theme = NormalizeTheme(next.Theme)
	t.settings = next
	if t.status == StatusIdle {
		t.remainingSeconds = t.phaseDurationSeconds(t.phase)
	} else if max := t.phaseDurationSeconds(t.phase); t.remainingSeconds > max {
		t.remainingSeconds = max
	}
	return t.snapshotLocked(), nil
}

// SetCurrentPhaseSeconds changes the duration of the phase that is currently
// active and restarts its countdown from the new value. The status (idle,
// running, paused) is kept so editing the clock never steals a running timer.
func (t *Timer) SetCurrentPhaseSeconds(seconds int) (State, error) {
	if seconds < 1 || seconds > MaxPhaseSeconds {
		return t.Snapshot(), fmt.Errorf("%w: duration must be between 1 and %d seconds, got %d", ErrInvalidSettings, MaxPhaseSeconds, seconds)
	}

	t.mu.Lock()
	defer t.mu.Unlock()

	switch t.phase {
	case PhaseShortBreak:
		t.settings.ShortBreakSeconds = seconds
	case PhaseLongBreak:
		t.settings.LongBreakSeconds = seconds
	default:
		t.settings.WorkSeconds = seconds
	}
	t.remainingSeconds = seconds
	return t.snapshotLocked(), nil
}

// SetAlwaysOnTop stores the always-on-top preference.
func (t *Timer) SetAlwaysOnTop(enabled bool) State {
	t.mu.Lock()
	defer t.mu.Unlock()
	t.settings.AlwaysOnTop = enabled
	return t.snapshotLocked()
}

// SetSoundEnabled stores the sound preference.
func (t *Timer) SetSoundEnabled(enabled bool) State {
	t.mu.Lock()
	defer t.mu.Unlock()
	t.settings.SoundEnabled = enabled
	return t.snapshotLocked()
}

// SetLanguage stores the UI language preference ("auto", "en" or "de").
func (t *Timer) SetLanguage(language string) State {
	t.mu.Lock()
	defer t.mu.Unlock()
	switch language {
	case i18n.LangGerman, i18n.LangEnglish:
		t.settings.Language = language
	default:
		t.settings.Language = i18n.LangAuto
	}
	return t.snapshotLocked()
}

// SetTheme stores the colour scheme preference ("auto", "light" or "dark").
func (t *Timer) SetTheme(theme string) State {
	t.mu.Lock()
	defer t.mu.Unlock()
	t.settings.Theme = NormalizeTheme(theme)
	return t.snapshotLocked()
}

// SetHarvest restores a persisted harvest.
func (t *Timer) SetHarvest(harvest Harvest) State {
	t.mu.Lock()
	defer t.mu.Unlock()
	t.harvest = harvest
	return t.snapshotLocked()
}

// SetSingleKeyShortcuts stores the single character shortcut preference.
func (t *Timer) SetSingleKeyShortcuts(enabled bool) State {
	t.mu.Lock()
	defer t.mu.Unlock()
	t.settings.SingleKeyShortcuts = enabled
	return t.snapshotLocked()
}

// PhaseLabelIn returns the phase name in the given language.
func PhaseLabelIn(lang string, phase Phase) string {
	switch phase {
	case PhaseShortBreak:
		return i18n.T(lang, "phase.shortBreak")
	case PhaseLongBreak:
		return i18n.T(lang, "phase.longBreak")
	default:
		return i18n.T(lang, "phase.work")
	}
}

// PhaseLabel returns the English phase name.
func PhaseLabel(phase Phase) string {
	return PhaseLabelIn(i18n.LangEnglish, phase)
}
