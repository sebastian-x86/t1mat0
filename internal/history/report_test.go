package history

import (
	"testing"
	"time"
)

func TestBuildReportCoreMetrics(t *testing.T) {
	now := time.Date(2026, 7, 30, 18, 0, 0, 0, time.FixedZone("CEST", 2*3600))
	log := EmptyLog()
	log.Phases = []PhaseEvent{
		{
			ID:             "w1",
			Phase:          "work",
			Start:          "2026-07-30T09:00:00+02:00",
			End:            "2026-07-30T09:25:00+02:00",
			PlannedSeconds: 1500,
			ActualSeconds:  1500,
			PauseCount:     0,
			Outcome:        OutcomeCompleted,
		},
		{
			ID:             "w2",
			Phase:          "work",
			Start:          "2026-07-30T10:00:00+02:00",
			End:            "2026-07-30T10:25:00+02:00",
			PlannedSeconds: 1500,
			ActualSeconds:  1200,
			PausedSeconds:  300,
			PauseCount:     1,
			Outcome:        OutcomeSkipped,
		},
	}
	schedule := Schedule{
		Enabled: true,
		Days: []ScheduleDay{
			{}, // Sunday
			{Enabled: true, StartMinute: 9 * 60, EndMinute: 17 * 60, TargetMinutes: 420}, // Monday
			{Enabled: true, StartMinute: 9 * 60, EndMinute: 17 * 60, TargetMinutes: 420}, // Tuesday
			{Enabled: true, StartMinute: 9 * 60, EndMinute: 17 * 60, TargetMinutes: 420}, // Wednesday
			{Enabled: true, StartMinute: 9 * 60, EndMinute: 17 * 60, TargetMinutes: 420}, // Thursday
			{Enabled: true, StartMinute: 9 * 60, EndMinute: 17 * 60, TargetMinutes: 420}, // Friday
			{}, // Saturday
		},
	}

	report := BuildReport(log, now, schedule, true)
	if report.TomatoesToday != 1 || report.StartedWork != 2 || report.CompletedWork != 1 {
		t.Fatalf("unexpected counters: %+v", report)
	}
	if report.AdherenceRate != 0.5 {
		t.Fatalf("adherence = %v", report.AdherenceRate)
	}
	if report.PauseSeconds != 300 || report.PauseCount != 1 {
		t.Fatalf("pause counters = %d/%d", report.PauseSeconds, report.PauseCount)
	}
	if report.ProductiveHour != 9 {
		t.Fatalf("productive hour = %d", report.ProductiveHour)
	}
}
