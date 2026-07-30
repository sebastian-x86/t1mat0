package main

import (
	"testing"
	"time"

	"t1m/internal/history"
	"t1m/internal/store"
	"t1m/internal/timer"
)

// Turning recording on has to survive a restart, so the flag lands in
// settings.json right away instead of waiting for the next phase change.
func TestAppSetHistoryEnabledPersists(t *testing.T) {
	isolateConfig(t)
	app := NewApp()

	state := app.SetHistoryEnabled(true)
	if !state.Settings.HistoryEnabled {
		t.Fatal("expected history to be enabled")
	}
	if !readSettingsFile(t).HistoryEnabled {
		t.Fatal("expected the enabled flag on disk")
	}

	state = app.SetHistoryEnabled(false)
	if state.Settings.HistoryEnabled {
		t.Fatal("expected history to be disabled")
	}
	if readSettingsFile(t).HistoryEnabled {
		t.Fatal("expected the disabled flag on disk")
	}
}

// Declining the opt-in must still be remembered, otherwise the dialog would
// ask again on every start.
func TestAppSetHistoryConsentRemembersDecline(t *testing.T) {
	isolateConfig(t)
	app := NewApp()

	state := app.SetHistoryConsent(false)
	if state.Settings.HistoryEnabled {
		t.Fatal("declining must not enable recording")
	}
	if !state.Settings.HistoryPrompted {
		t.Fatal("expected the prompt to be marked as shown")
	}

	saved := readSettingsFile(t)
	if saved.HistoryEnabled || !saved.HistoryPrompted {
		t.Fatalf("unexpected settings on disk: %+v", saved)
	}
}

// Accepting enables recording and marks the prompt as answered in one go.
func TestAppSetHistoryConsentAccepts(t *testing.T) {
	isolateConfig(t)
	app := NewApp()

	state := app.SetHistoryConsent(true)
	if !state.Settings.HistoryEnabled || !state.Settings.HistoryPrompted {
		t.Fatalf("unexpected state after consent: %+v", state.Settings)
	}
}

// Deleting drops the file and the in-memory log, so a report built right after
// cannot resurrect what the user asked to remove.
func TestAppDeleteHistoryDataClearsFileAndLog(t *testing.T) {
	isolateConfig(t)
	app := NewApp()
	app.SetHistoryConsent(true)
	app.compactAndSaveHistory(30, true)

	if !store.HasHistory() {
		t.Fatal("expected history.json to exist")
	}

	app.DeleteHistoryData()

	if store.HasHistory() {
		t.Fatal("expected history.json to be gone")
	}
	if len(app.GetReport().Phases) != 0 {
		t.Fatal("expected an empty report after deleting")
	}
}

// Without a runtime context the export cannot open a save dialog, so it has to
// fail loudly instead of writing somewhere unexpected.
func TestAppExportHistoryWithoutRuntimeFails(t *testing.T) {
	isolateConfig(t)
	app := NewApp()

	if err := app.ExportHistory("csv"); err == nil {
		t.Fatal("expected an error without a runtime context")
	}
}

// The report mirrors the recording flag so the view can explain why it is
// empty instead of showing zeros as if they were measured.
func TestAppGetReportReportsTheRecordingFlag(t *testing.T) {
	isolateConfig(t)
	app := NewApp()

	if app.GetReport().HistoryEnabled {
		t.Fatal("expected recording to be off by default")
	}

	app.SetHistoryEnabled(true)

	report := app.GetReport()
	if !report.HistoryEnabled {
		t.Fatal("expected the report to know recording is on")
	}
	if report.HasData {
		t.Fatal("expected no data before a phase finished")
	}
}

// Compaction must not create history.json on its own: a user who never opted
// in should not find the file after a restart.
func TestAppCompactHistoryKeepsOptOutClean(t *testing.T) {
	isolateConfig(t)
	app := NewApp()

	app.compactAndSaveHistory(30, false)

	if store.HasHistory() {
		t.Fatal("expected no history file without consent")
	}
}

// Tracking restarts from scratch, so a phase left open by the previous session
// cannot leak into the next one.
func TestAppResetTrackingDropsTheOpenPhase(t *testing.T) {
	isolateConfig(t)
	app := NewApp()
	app.SetHistoryEnabled(true)
	app.Start()

	app.resetTracking()

	if app.historyTracker.Active() {
		t.Fatal("expected no tracked phase after a reset")
	}
}

// The report works in minutes since midnight, so the HH:MM settings have to be
// translated including the fixed breaks.
func TestToHistoryScheduleConvertsClockValues(t *testing.T) {
	settings := timer.DefaultSettings()
	settings.WorkHoursEnabled = true
	settings.WorkHours.Days[1] = timer.Workday{
		Enabled:       true,
		Start:         "08:00",
		End:           "16:30",
		TargetMinutes: 480,
		Breaks:        []timer.FixedPause{{Start: "12:00", DurationMinutes: 30}},
	}

	schedule := toHistorySchedule(settings)

	if !schedule.Enabled {
		t.Fatal("expected the schedule to be enabled")
	}
	if len(schedule.Days) != 7 {
		t.Fatalf("expected 7 days, got %d", len(schedule.Days))
	}
	monday := schedule.Days[1]
	if monday.StartMinute != 8*60 || monday.EndMinute != 16*60+30 {
		t.Fatalf("unexpected work window: %+v", monday)
	}
	if len(monday.Breaks) != 1 || monday.Breaks[0].StartMinute != 12*60 {
		t.Fatalf("unexpected breaks: %+v", monday.Breaks)
	}
}

// A short schedule is padded to a full week so weekday lookups never run past
// the end of the slice.
func TestToHistorySchedulePadsMissingDays(t *testing.T) {
	settings := timer.DefaultSettings()
	settings.WorkHours.Days = settings.WorkHours.Days[:2]

	if got := len(toHistorySchedule(settings).Days); got != 7 {
		t.Fatalf("expected 7 padded days, got %d", got)
	}
}

// Broken clock values must not panic the report; midnight is the safe answer.
func TestMustParseClockFallsBackToMidnight(t *testing.T) {
	cases := map[string]int{
		"00:00": 0,
		"09:05": 545,
		"23:59": 1439,
		"nope":  0,
		"9":     0,
		"aa:bb": 0,
		"09:xx": 0,
	}
	for value, want := range cases {
		if got := mustParseClock(value); got != want {
			t.Fatalf("mustParseClock(%q) = %d, want %d", value, got, want)
		}
	}
}

// GetVersion feeds the about line, so it must report the build-time value.
func TestAppGetVersionReturnsTheBuildValue(t *testing.T) {
	if NewApp().GetVersion() != version {
		t.Fatal("expected the linker-provided version")
	}
}

// Saving keeps the log the caller passed, so a later report reads what was
// written rather than an empty file.
func TestAppCompactHistoryWritesTheLog(t *testing.T) {
	isolateConfig(t)
	app := NewApp()
	now := time.Now()
	app.historyLog = history.Log{
		Version: history.FileVersion,
		Phases: []history.PhaseEvent{{
			ID:             "abc",
			Phase:          "work",
			Start:          now.Add(-time.Hour).Format(time.RFC3339),
			End:            now.Add(-30 * time.Minute).Format(time.RFC3339),
			PlannedSeconds: 1500,
			ActualSeconds:  1500,
			Outcome:        history.OutcomeCompleted,
		}},
	}

	app.compactAndSaveHistory(30, true)

	loaded := store.LoadHistory()
	if len(loaded.Phases) != 1 || loaded.Phases[0].ID != "abc" {
		t.Fatalf("unexpected history on disk: %+v", loaded.Phases)
	}
}
