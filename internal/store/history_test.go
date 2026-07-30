package store

import (
	"os"
	"path/filepath"
	"testing"

	"t1m/internal/history"
)

func TestHistoryRoundTrip(t *testing.T) {
	isolateConfig(t)
	log := history.EmptyLog()
	log.Phases = append(log.Phases, history.PhaseEvent{
		ID:      "p1",
		Phase:   "work",
		Start:   "2026-07-30T09:00:00+02:00",
		End:     "2026-07-30T09:25:00+02:00",
		Outcome: history.OutcomeCompleted,
	})
	if err := SaveHistory(log); err != nil {
		t.Fatalf("save history: %v", err)
	}
	if !HasHistory() {
		t.Fatal("expected history file")
	}
	got := LoadHistory()
	if len(got.Phases) != 1 || got.Phases[0].ID != "p1" {
		t.Fatalf("unexpected history payload: %+v", got)
	}
}

func TestLoadHistoryFallsBackToEmpty(t *testing.T) {
	dir := isolateConfig(t)
	if got := LoadHistory(); len(got.Phases) != 0 || len(got.Days) != 0 {
		t.Fatalf("expected empty history, got %+v", got)
	}
	if err := os.MkdirAll(dir, 0o755); err != nil {
		t.Fatalf("mkdir: %v", err)
	}
	if err := os.WriteFile(filepath.Join(dir, HistoryFileName), []byte("{oops"), 0o644); err != nil {
		t.Fatalf("write: %v", err)
	}
	if got := LoadHistory(); len(got.Phases) != 0 || len(got.Days) != 0 {
		t.Fatalf("expected empty history from broken file, got %+v", got)
	}
}

func TestDeleteHistory(t *testing.T) {
	isolateConfig(t)
	if err := SaveHistory(history.EmptyLog()); err != nil {
		t.Fatalf("save: %v", err)
	}
	if err := DeleteHistory(); err != nil {
		t.Fatalf("delete: %v", err)
	}
	if HasHistory() {
		t.Fatal("history should be gone")
	}
}
