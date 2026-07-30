package timer

import (
	"errors"
	"reflect"
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
	if !reflect.DeepEqual(state.Settings, DefaultSettings()) {
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

func TestSetThemeNormalizesUnknownValues(t *testing.T) {
	timer := NewTimer(testSettings())

	if state := timer.SetTheme(ThemeLight); state.Settings.Theme != ThemeLight {
		t.Fatalf("expected the light theme, got %q", state.Settings.Theme)
	}
	if state := timer.SetTheme("neon"); state.Settings.Theme != ThemeAuto {
		t.Fatalf("expected auto for an unknown theme, got %q", state.Settings.Theme)
	}
}

func TestThemeFallsBackToAutoOnLoad(t *testing.T) {
	settings := testSettings()
	settings.Theme = "neon"

	if got := NewTimer(settings).Snapshot().Settings.Theme; got != ThemeAuto {
		t.Fatalf("expected a stored garbage theme to become auto, got %q", got)
	}

	timer := NewTimer(testSettings())
	next := testSettings()
	next.Theme = ""
	state, err := timer.UpdateSettings(next)
	if err != nil {
		t.Fatalf("UpdateSettings: %v", err)
	}
	if state.Settings.Theme != ThemeAuto {
		t.Fatalf("expected an empty theme to become auto, got %q", state.Settings.Theme)
	}
}

func TestSetNotificationsEnabledStoresThePreference(t *testing.T) {
	timer := NewTimer(testSettings())

	if !DefaultSettings().NotificationsEnabled {
		t.Fatal("notifications should be on by default")
	}
	if state := timer.SetNotificationsEnabled(false); state.Settings.NotificationsEnabled {
		t.Fatal("expected notifications to be off")
	}
	if state := timer.SetNotificationsEnabled(true); !state.Settings.NotificationsEnabled {
		t.Fatal("expected notifications to be on")
	}
}

func TestSetCloseToTrayStoresThePreference(t *testing.T) {
	timer := NewTimer(testSettings())

	if !DefaultSettings().CloseToTray {
		t.Fatal("closing into the tray should be the default")
	}
	if state := timer.SetCloseToTray(false); state.Settings.CloseToTray {
		t.Fatal("expected closing to quit the app")
	}
	if state := timer.SetCloseToTray(true); !state.Settings.CloseToTray {
		t.Fatal("expected closing to hide the window")
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
	if got := timer.SetHistoryEnabled(true).Settings.HistoryEnabled; !got {
		t.Fatal("historyEnabled should be true")
	}
	if got := timer.SetHistoryPrompted(true).Settings.HistoryPrompted; !got {
		t.Fatal("historyPrompted should be true")
	}
}

func TestSetHarvestRestoresPersistedCounts(t *testing.T) {
	timer := NewTimer(testSettings())
	want := Harvest{Tomatoes: 5, Total: 9, Day: "2026-07-30", Streak: 2, BestStreak: 9}

	if got := timer.SetHarvest(want).Harvest; got != want {
		t.Fatalf("expected %+v, got %+v", want, got)
	}
}

func TestSetHarvestDayResetsDailyTomatoes(t *testing.T) {
	timer := NewTimer(testSettings())
	timer.SetHarvest(Harvest{Tomatoes: 4, Total: 10, Day: "2026-07-29"})

	state := timer.SetHarvestDay("2026-07-30")
	if state.Harvest.Tomatoes != 0 || state.Harvest.Total != 10 || state.Harvest.Day != "2026-07-30" {
		t.Fatalf("unexpected harvest after day roll: %+v", state.Harvest)
	}
}

func TestValidateRejectsBrokenWorkHoursWhenEnabled(t *testing.T) {
	settings := DefaultSettings()
	settings.WorkHoursEnabled = true
	settings.WorkHours.Days[1].Enabled = true
	settings.WorkHours.Days[1].End = "08:00"
	if err := settings.Validate(); err == nil {
		t.Fatal("expected work hours validation error")
	}
}

// A fresh install must not invent work hours. Every weekday stays off until the
// user adds one, so reports never compare against a schedule nobody entered.
func TestDefaultWorkHoursStartEmpty(t *testing.T) {
	settings := DefaultSettings()
	if settings.WorkHoursEnabled {
		t.Fatal("work hours must be off by default")
	}
	if len(settings.WorkHours.Days) != 7 {
		t.Fatalf("expected 7 weekdays, got %d", len(settings.WorkHours.Days))
	}
	for i, day := range settings.WorkHours.Days {
		if day.Enabled {
			t.Fatalf("weekday %d must be disabled by default", i)
		}
		if len(day.Breaks) != 0 {
			t.Fatalf("weekday %d must start without breaks", i)
		}
	}
	if err := settings.Validate(); err != nil {
		t.Fatalf("default settings must validate: %v", err)
	}
}

// Turning the frame on without any workday stays valid: it simply produces no
// coverage numbers instead of an error the user cannot act on.
func TestEmptyWorkHoursValidateWhenEnabled(t *testing.T) {
	settings := DefaultSettings()
	settings.WorkHoursEnabled = true
	if err := settings.Validate(); err != nil {
		t.Fatalf("empty schedule must validate: %v", err)
	}
}

// Breaks are only allowed inside the workday they belong to.
func TestValidateRejectsBreakOutsideWorkHours(t *testing.T) {
	settings := DefaultSettings()
	settings.WorkHoursEnabled = true
	settings.WorkHours.Days[1].Enabled = true
	settings.WorkHours.Days[1].Start = "08:00"
	settings.WorkHours.Days[1].End = "16:30"
	settings.WorkHours.Days[1].Breaks = []FixedPause{{Start: "17:00", DurationMinutes: 30}}
	if err := settings.Validate(); err == nil {
		t.Fatal("expected break outside work hours to fail")
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

func TestSetHistoryRetentionDaysRejectsOutOfRange(t *testing.T) {
	timer := NewTimer(testSettings())

	state, err := timer.SetHistoryRetentionDays(90)
	if err != nil {
		t.Fatalf("90 days should be accepted: %v", err)
	}
	if state.Settings.HistoryRetentionDays != 90 {
		t.Fatalf("expected 90, got %d", state.Settings.HistoryRetentionDays)
	}

	for _, days := range []int{0, -1, 3651} {
		if _, err := timer.SetHistoryRetentionDays(days); !errors.Is(err, ErrInvalidSettings) {
			t.Fatalf("%d days should be rejected, got %v", days, err)
		}
	}
	if got := timer.Snapshot().Settings.HistoryRetentionDays; got != 90 {
		t.Fatalf("a rejected value must not change the setting, got %d", got)
	}
}

func TestSetWorkHoursEnabledToggles(t *testing.T) {
	timer := NewTimer(testSettings())

	if got := timer.SetWorkHoursEnabled(true).Settings.WorkHoursEnabled; !got {
		t.Fatal("workHoursEnabled should be true")
	}
	if got := timer.SetWorkHoursEnabled(false).Settings.WorkHoursEnabled; got {
		t.Fatal("workHoursEnabled should be false")
	}
}
