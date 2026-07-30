package history

import (
	"strings"
	"testing"
	"time"
)

func TestTrackerRecordsPauseAndOutcome(t *testing.T) {
	now := time.Date(2026, 7, 30, 9, 0, 0, 0, time.FixedZone("CEST", 2*3600))
	tracker := NewTracker(func() time.Time { return now })
	tracker.StartPhase("work", 1500)

	now = now.Add(30 * time.Second)
	tracker.Pause()
	now = now.Add(10 * time.Second)
	tracker.Resume()
	now = now.Add(20 * time.Second)

	event, ok := tracker.EndPhase(OutcomeSkipped)
	if !ok {
		t.Fatal("expected event")
	}
	if event.Phase != "work" || event.Outcome != OutcomeSkipped {
		t.Fatalf("unexpected event: %+v", event)
	}
	if event.PauseCount != 1 || event.PausedSeconds != 10 {
		t.Fatalf("unexpected pause counters: %+v", event)
	}
	if event.ActualSeconds != 50 {
		t.Fatalf("expected 50 active seconds, got %d", event.ActualSeconds)
	}
}

func TestCompactMovesOldPhasesIntoDays(t *testing.T) {
	now := time.Date(2026, 7, 30, 10, 0, 0, 0, time.FixedZone("CEST", 2*3600))
	oldDay := now.AddDate(0, 0, -31)
	recentDay := now.AddDate(0, 0, -5)

	log := EmptyLog()
	log.Phases = []PhaseEvent{
		{
			ID:             "old-work",
			Phase:          "work",
			Start:          oldDay.Format(time.RFC3339),
			End:            oldDay.Add(25 * time.Minute).Format(time.RFC3339),
			ActualSeconds:  1500,
			PlannedSeconds: 1500,
			Outcome:        OutcomeCompleted,
		},
		{
			ID:             "recent-work",
			Phase:          "work",
			Start:          recentDay.Format(time.RFC3339),
			End:            recentDay.Add(25 * time.Minute).Format(time.RFC3339),
			ActualSeconds:  1500,
			PlannedSeconds: 1500,
			Outcome:        OutcomeCompleted,
		},
	}

	compacted := Compact(log, now, 30)
	if len(compacted.Phases) != 1 {
		t.Fatalf("expected 1 fresh phase, got %d", len(compacted.Phases))
	}
	if compacted.Phases[0].ID != "recent-work" {
		t.Fatalf("wrong phase kept: %+v", compacted.Phases[0])
	}
	if len(compacted.Days) != 1 {
		t.Fatalf("expected one compacted day, got %d", len(compacted.Days))
	}
	day := compacted.Days[0]
	if day.Tomatoes != 1 || day.WorkSeconds != 1500 || day.CompletedWork != 1 {
		t.Fatalf("unexpected day summary: %+v", day)
	}
}

func TestCSVIncludesHeaderAndEscapes(t *testing.T) {
	log := EmptyLog()
	log.Phases = append(log.Phases, PhaseEvent{
		ID:             "p1",
		Phase:          "work",
		Start:          "2026-07-30T09:00:00+02:00",
		End:            "2026-07-30T09:25:00+02:00",
		PlannedSeconds: 1500,
		ActualSeconds:  1400,
		PausedSeconds:  100,
		PauseCount:     1,
		Outcome:        OutcomeCompleted,
		Note:           `foo, "bar"`,
	})
	data, err := CSV(log)
	if err != nil {
		t.Fatalf("csv: %v", err)
	}
	text := string(data)
	if !strings.HasPrefix(text, "\uFEFFid,phase,start,end,plannedSeconds") {
		t.Fatalf("missing header/BOM: %q", text)
	}
	if !strings.Contains(text, "\"foo, \"\"bar\"\"\"") {
		t.Fatalf("note not escaped: %q", text)
	}
}
