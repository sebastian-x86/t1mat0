package timer

import (
	"encoding/json"
	"testing"
)

func testSettings() Settings {
	s := DefaultSettings()
	s.WorkSeconds = 60
	s.ShortBreakSeconds = 60
	s.LongBreakSeconds = 120
	s.LongBreakEvery = 2
	s.AutoStartNext = false
	return s
}

func tickN(t *testing.T, timer *Timer, n int) []TickResult {
	t.Helper()
	results := make([]TickResult, 0, n)
	for i := 0; i < n; i++ {
		results = append(results, timer.Tick())
	}
	return results
}

func TestNewTimerStartsIdleInWorkPhase(t *testing.T) {
	timer := NewTimer(testSettings())
	state := timer.Snapshot()

	if state.Status != StatusIdle {
		t.Fatalf("expected idle status, got %q", state.Status)
	}
	if state.Phase != PhaseWork {
		t.Fatalf("expected work phase, got %q", state.Phase)
	}
	if state.RemainingSeconds != 60 {
		t.Fatalf("expected 60 remaining seconds, got %d", state.RemainingSeconds)
	}
	if state.FormattedRemaining != "01:00" {
		t.Fatalf("expected formatted 01:00, got %q", state.FormattedRemaining)
	}
}

func TestTickOnlyRunsWhenStarted(t *testing.T) {
	timer := NewTimer(testSettings())

	tickN(t, timer, 5)
	if got := timer.Snapshot().RemainingSeconds; got != 60 {
		t.Fatalf("idle timer must not tick, remaining %d", got)
	}

	timer.Start()
	tickN(t, timer, 5)
	if got := timer.Snapshot().RemainingSeconds; got != 55 {
		t.Fatalf("expected 55 remaining seconds, got %d", got)
	}
}

func TestPauseKeepsRemainingTime(t *testing.T) {
	timer := NewTimer(testSettings())
	timer.Start()
	tickN(t, timer, 10)
	timer.Pause()
	tickN(t, timer, 10)

	state := timer.Snapshot()
	if state.Status != StatusPaused {
		t.Fatalf("expected paused status, got %q", state.Status)
	}
	if state.RemainingSeconds != 50 {
		t.Fatalf("expected 50 remaining seconds, got %d", state.RemainingSeconds)
	}
}

func TestToggleStartsAndPauses(t *testing.T) {
	timer := NewTimer(testSettings())

	if state := timer.Toggle(); state.Status != StatusRunning {
		t.Fatalf("expected running after first toggle, got %q", state.Status)
	}
	if state := timer.Toggle(); state.Status != StatusPaused {
		t.Fatalf("expected paused after second toggle, got %q", state.Status)
	}
}

func TestPhaseTransitionsFollowLongBreakCadence(t *testing.T) {
	timer := NewTimer(testSettings())
	timer.Start()

	results := tickN(t, timer, 60)
	last := results[len(results)-1]
	if !last.PhaseChanged {
		t.Fatal("expected phase change after work phase elapsed")
	}
	if last.FinishedPhase != PhaseWork {
		t.Fatalf("expected finished work phase, got %q", last.FinishedPhase)
	}
	if last.State.Phase != PhaseShortBreak {
		t.Fatalf("expected short break after first work phase, got %q", last.State.Phase)
	}
	if last.State.CompletedWork != 1 {
		t.Fatalf("expected 1 completed work phase, got %d", last.State.CompletedWork)
	}

	// Short break -> work
	timer.Start()
	tickN(t, timer, 60)
	if got := timer.Snapshot().Phase; got != PhaseWork {
		t.Fatalf("expected work phase after short break, got %q", got)
	}

	// Second work phase completes -> long break (LongBreakEvery = 2)
	timer.Start()
	tickN(t, timer, 60)
	state := timer.Snapshot()
	if state.Phase != PhaseLongBreak {
		t.Fatalf("expected long break after second work phase, got %q", state.Phase)
	}
	if state.RemainingSeconds != 120 {
		t.Fatalf("expected 120 seconds long break, got %d", state.RemainingSeconds)
	}
}

func TestAutoStartNextKeepsTimerRunning(t *testing.T) {
	settings := testSettings()
	settings.AutoStartNext = true
	timer := NewTimer(settings)
	timer.Start()

	last := tickN(t, timer, 60)[59]
	if last.State.Status != StatusRunning {
		t.Fatalf("expected running status with auto start, got %q", last.State.Status)
	}

	settings.AutoStartNext = false
	timer2 := NewTimer(settings)
	timer2.Start()
	last2 := tickN(t, timer2, 60)[59]
	if last2.State.Status != StatusIdle {
		t.Fatalf("expected idle status without auto start, got %q", last2.State.Status)
	}
}

func TestSkipAdvancesPhaseImmediately(t *testing.T) {
	timer := NewTimer(testSettings())
	state, previous := timer.Skip()

	if previous != PhaseWork {
		t.Fatalf("expected previous phase work, got %q", previous)
	}
	if state.Phase != PhaseShortBreak {
		t.Fatalf("expected short break after skip, got %q", state.Phase)
	}
	if state.CompletedWork != 1 {
		t.Fatalf("expected completed work counter to increase, got %d", state.CompletedWork)
	}
}

func TestResetClearsProgress(t *testing.T) {
	timer := NewTimer(testSettings())
	timer.Start()
	tickN(t, timer, 30)
	timer.Skip()

	state := timer.Reset()
	if state.Status != StatusIdle || state.Phase != PhaseWork {
		t.Fatalf("expected idle work phase after reset, got %q/%q", state.Status, state.Phase)
	}
	if state.CompletedWork != 0 {
		t.Fatalf("expected cycle counter reset, got %d", state.CompletedWork)
	}
	if state.RemainingSeconds != 60 {
		t.Fatalf("expected full work duration after reset, got %d", state.RemainingSeconds)
	}
}

func TestUpdateSettingsRejectsInvalidValues(t *testing.T) {
	timer := NewTimer(testSettings())
	invalid := testSettings()
	invalid.WorkSeconds = 0

	if _, err := timer.UpdateSettings(invalid); err == nil {
		t.Fatal("expected error for zero work minutes")
	}
	if got := timer.Snapshot().Settings.WorkSeconds; got != 60 {
		t.Fatalf("settings must stay unchanged after failed update, got %d", got)
	}
}

func TestUpdateSettingsAppliesToIdlePhase(t *testing.T) {
	timer := NewTimer(testSettings())
	next := testSettings()
	next.WorkSeconds = 180

	state, err := timer.UpdateSettings(next)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if state.RemainingSeconds != 180 {
		t.Fatalf("expected updated duration applied while idle, got %d", state.RemainingSeconds)
	}
}

func TestUpdateSettingsClampsRunningPhase(t *testing.T) {
	timer := NewTimer(testSettings())
	timer.Start()

	next := testSettings()
	next.WorkSeconds = 60
	shorter := next
	shorter.WorkSeconds = 1

	// Shrink the phase below the currently remaining time.
	state, err := timer.UpdateSettings(shorter)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if state.RemainingSeconds > state.TotalSeconds {
		t.Fatalf("remaining %d must not exceed total %d", state.RemainingSeconds, state.TotalSeconds)
	}
}

func TestFormatSeconds(t *testing.T) {
	cases := map[int]string{
		0:    "00:00",
		59:   "00:59",
		60:   "01:00",
		1500: "25:00",
		3600: "01:00:00",
		-5:   "00:00",
	}
	for input, expected := range cases {
		if got := FormatSeconds(input); got != expected {
			t.Fatalf("FormatSeconds(%d) = %q, want %q", input, got, expected)
		}
	}
}

func TestPhaseLabel(t *testing.T) {
	if got := PhaseLabel(PhaseWork); got != "Work" {
		t.Fatalf("unexpected work label %q", got)
	}
	if got := PhaseLabel(PhaseShortBreak); got != "Short Break" {
		t.Fatalf("unexpected short break label %q", got)
	}
	if got := PhaseLabel(PhaseLongBreak); got != "Long Break" {
		t.Fatalf("unexpected long break label %q", got)
	}
}

func TestSettingsUnmarshalMigratesLegacyMinutes(t *testing.T) {
	settings := DefaultSettings()
	raw := []byte(`{"workMinutes":30,"shortBreakMinutes":7,"longBreakMinutes":20,"longBreakEvery":3}`)
	if err := json.Unmarshal(raw, &settings); err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if settings.WorkSeconds != 1800 || settings.ShortBreakSeconds != 420 || settings.LongBreakSeconds != 1200 {
		t.Fatalf("legacy minutes not migrated: %+v", settings)
	}
	if err := settings.Validate(); err != nil {
		t.Fatalf("migrated settings must be valid: %v", err)
	}
}

func TestSettingsUnmarshalPrefersSeconds(t *testing.T) {
	settings := DefaultSettings()
	raw := []byte(`{"workMinutes":30,"workSeconds":45}`)
	if err := json.Unmarshal(raw, &settings); err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if settings.WorkSeconds != 45 {
		t.Fatalf("expected seconds to win, got %d", settings.WorkSeconds)
	}
}
