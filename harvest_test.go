package main

import (
	"os"
	"path/filepath"
	"testing"
)

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

func TestSaveAndLoadHarvestRoundTrip(t *testing.T) {
	isolateConfig(t)

	want := Harvest{Tomatoes: 12, Streak: 3, BestStreak: 7}
	if err := SaveHarvest(want); err != nil {
		t.Fatalf("save: %v", err)
	}
	if got := LoadHarvest(); got != want {
		t.Fatalf("round trip mismatch: got %+v, want %+v", got, want)
	}
}

func TestLoadHarvestEmptyWhenMissing(t *testing.T) {
	isolateConfig(t)

	if got := LoadHarvest(); got != (Harvest{}) {
		t.Fatalf("expected empty harvest, got %+v", got)
	}
}

func TestLoadHarvestRejectsBrokenOrNegativeFile(t *testing.T) {
	for name, content := range map[string]string{
		"broken":   "{oops",
		"negative": `{"tomatoes": -3}`,
	} {
		t.Run(name, func(t *testing.T) {
			dir := isolateConfig(t)
			if err := os.MkdirAll(dir, 0o755); err != nil {
				t.Fatalf("mkdir: %v", err)
			}
			if err := os.WriteFile(filepath.Join(dir, harvestFileName), []byte(content), 0o644); err != nil {
				t.Fatalf("write: %v", err)
			}
			if got := LoadHarvest(); got != (Harvest{}) {
				t.Fatalf("expected empty harvest, got %+v", got)
			}
		})
	}
}

// The harvest lives next to the settings so a portable install carries both.
func TestHarvestSitsNextToSettings(t *testing.T) {
	isolateConfig(t)

	settings, err := settingsPath()
	if err != nil {
		t.Fatalf("settings path: %v", err)
	}
	harvest, err := harvestPath()
	if err != nil {
		t.Fatalf("harvest path: %v", err)
	}
	if filepath.Dir(settings) != filepath.Dir(harvest) {
		t.Fatalf("harvest %q is not next to settings %q", harvest, settings)
	}
}
