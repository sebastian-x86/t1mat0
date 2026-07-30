package timer

import (
	"errors"
	"testing"

	"t1m/internal/i18n"
)

func TestValidateRejectsOutOfRangeValues(t *testing.T) {
	cases := map[string]func(s *Settings){
		"work too short":        func(s *Settings) { s.WorkSeconds = 0 },
		"work too long":         func(s *Settings) { s.WorkSeconds = MaxPhaseSeconds + 1 },
		"short break too short": func(s *Settings) { s.ShortBreakSeconds = -1 },
		"short break too long":  func(s *Settings) { s.ShortBreakSeconds = MaxPhaseSeconds + 1 },
		"long break too short":  func(s *Settings) { s.LongBreakSeconds = 0 },
		"long break too long":   func(s *Settings) { s.LongBreakSeconds = MaxPhaseSeconds + 1 },
		"cycle too small":       func(s *Settings) { s.LongBreakEvery = 0 },
		"cycle too large":       func(s *Settings) { s.LongBreakEvery = 601 },
	}

	for name, mutate := range cases {
		t.Run(name, func(t *testing.T) {
			settings := DefaultSettings()
			mutate(&settings)
			if err := settings.Validate(); err == nil {
				t.Fatalf("expected an error for %+v", settings)
			}
		})
	}
}

func TestValidateAcceptsBoundaries(t *testing.T) {
	settings := DefaultSettings()
	settings.WorkSeconds = 1
	settings.ShortBreakSeconds = MaxPhaseSeconds
	settings.LongBreakSeconds = 1
	settings.LongBreakEvery = 600

	if err := settings.Validate(); err != nil {
		t.Fatalf("boundaries should be valid: %v", err)
	}
}

func TestNewTimerFallsBackToDefaultsOnInvalidSettings(t *testing.T) {
	broken := DefaultSettings()
	broken.WorkSeconds = 0

	state := NewTimer(broken).Snapshot()
	if state.Settings != DefaultSettings() {
		t.Fatalf("expected default settings, got %+v", state.Settings)
	}
}

func TestUpdateSettingsRejectsInvalidAndKeepsState(t *testing.T) {
	timer := NewTimer(testSettings())
	broken := testSettings()
	broken.LongBreakEvery = 0

	state, err := timer.UpdateSettings(broken)
	if !errors.Is(err, ErrInvalidSettings) {
		t.Fatalf("expected ErrInvalidSettings, got %v", err)
	}
	if state.Settings.LongBreakEvery != testSettings().LongBreakEvery {
		t.Fatalf("settings should be untouched, got %+v", state.Settings)
	}
}

func TestSetCurrentPhaseSecondsAppliesToActivePhase(t *testing.T) {
	timer := NewTimer(testSettings())
	timer.Start()

	state, err := timer.SetCurrentPhaseSeconds(45)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if state.RemainingSeconds != 45 || state.TotalSeconds != 45 {
		t.Fatalf("expected 45 seconds, got %d of %d", state.RemainingSeconds, state.TotalSeconds)
	}
	if state.Settings.WorkSeconds != 45 {
		t.Fatalf("expected the work default to follow, got %d", state.Settings.WorkSeconds)
	}
	if state.Status != StatusRunning {
		t.Fatalf("editing the clock must not stop the timer, got %q", state.Status)
	}
}

func TestSetCurrentPhaseSecondsTargetsTheBreakDuringABreak(t *testing.T) {
	timer := NewTimer(testSettings())
	timer.Start()
	timer.Skip() // now in a short break

	state, err := timer.SetCurrentPhaseSeconds(20)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if state.Settings.ShortBreakSeconds != 20 {
		t.Fatalf("expected the short break to change, got %d", state.Settings.ShortBreakSeconds)
	}
	if state.Settings.WorkSeconds != testSettings().WorkSeconds {
		t.Fatalf("work duration should be untouched, got %d", state.Settings.WorkSeconds)
	}
}

func TestSetCurrentPhaseSecondsRejectsOutOfRange(t *testing.T) {
	timer := NewTimer(testSettings())

	for _, seconds := range []int{0, -5, MaxPhaseSeconds + 1} {
		if _, err := timer.SetCurrentPhaseSeconds(seconds); !errors.Is(err, ErrInvalidSettings) {
			t.Fatalf("expected ErrInvalidSettings for %d, got %v", seconds, err)
		}
	}
	if got := timer.Snapshot().RemainingSeconds; got != testSettings().WorkSeconds {
		t.Fatalf("remaining time should be untouched, got %d", got)
	}
}

func TestSetLanguageNormalizesUnknownValues(t *testing.T) {
	timer := NewTimer(testSettings())

	if state := timer.SetLanguage(i18n.LangGerman); state.Settings.Language != i18n.LangGerman || state.Language != i18n.LangGerman {
		t.Fatalf("expected german, got %+v", state.Settings.Language)
	}
	if state := timer.SetLanguage("klingon"); state.Settings.Language != i18n.LangAuto {
		t.Fatalf("expected auto for an unknown language, got %q", state.Settings.Language)
	}
}

func TestSetLanguageTranslatesThePhaseLabel(t *testing.T) {
	timer := NewTimer(testSettings())

	if got := timer.SetLanguage(i18n.LangGerman).PhaseLabel; got != "Arbeit" {
		t.Fatalf("expected the german label, got %q", got)
	}
	if got := timer.SetLanguage(i18n.LangEnglish).PhaseLabel; got != "Work" {
		t.Fatalf("expected the english label, got %q", got)
	}
}

func TestTogglesStorePreferences(t *testing.T) {
	timer := NewTimer(testSettings())

	if got := timer.SetAlwaysOnTop(true).Settings.AlwaysOnTop; !got {
		t.Fatal("alwaysOnTop should be true")
	}
	if got := timer.SetSoundEnabled(false).Settings.SoundEnabled; got {
		t.Fatal("soundEnabled should be false")
	}
	if got := timer.SetSingleKeyShortcuts(false).Settings.SingleKeyShortcuts; got {
		t.Fatal("singleKeyShortcuts should be false")
	}
}

func TestSetHarvestRestoresPersistedCounts(t *testing.T) {
	timer := NewTimer(testSettings())
	want := Harvest{Tomatoes: 5, Streak: 2, BestStreak: 9}

	if got := timer.SetHarvest(want).Harvest; got != want {
		t.Fatalf("expected %+v, got %+v", want, got)
	}
}

// A finished phase leaves the timer at zero. Starting again has to refill the
// clock instead of running into negative time.
func TestStartRefillsAnExpiredPhase(t *testing.T) {
	settings := testSettings()
	settings.AutoStartNext = false
	timer := NewTimer(settings)
	timer.Start()
	tickN(t, timer, settings.WorkSeconds)

	if got := timer.Snapshot().Status; got == StatusRunning {
		t.Fatalf("timer should have stopped after the phase, got %q", got)
	}

	state := timer.Start()
	if state.RemainingSeconds <= 0 {
		t.Fatalf("expected a refilled phase, got %d", state.RemainingSeconds)
	}
	if state.Status != StatusRunning {
		t.Fatalf("expected a running timer, got %q", state.Status)
	}
}
