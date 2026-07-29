package main

import "testing"

func TestHarvestEarnedOnCompletedWork(t *testing.T) {
	settings := DefaultSettings()
	settings.WorkSeconds = 2
	settings.AutoStartNext = false
	timer := NewTimer(settings)
	timer.Start()

	timer.Tick()
	result := timer.Tick()
	if !result.Harvested {
		t.Fatalf("expected a harvested tomato")
	}
	if got := result.State.Harvest; got.Tomatoes != 1 || got.Streak != 1 || got.BestStreak != 1 {
		t.Fatalf("unexpected harvest: %+v", got)
	}
}

func TestSkippedWorkBreaksStreakButKeepsTomatoes(t *testing.T) {
	settings := DefaultSettings()
	settings.WorkSeconds = 1
	settings.AutoStartNext = false
	timer := NewTimer(settings)
	timer.Start()
	timer.Tick()

	timer.Skip() // leave the break, back to a work phase
	state, _ := timer.Skip()
	if state.Harvest.Tomatoes != 1 {
		t.Fatalf("tomatoes should survive a skip, got %d", state.Harvest.Tomatoes)
	}
	if state.Harvest.Streak != 0 {
		t.Fatalf("streak should reset on skip, got %d", state.Harvest.Streak)
	}
	if state.Harvest.BestStreak != 1 {
		t.Fatalf("best streak should be kept, got %d", state.Harvest.BestStreak)
	}
}
