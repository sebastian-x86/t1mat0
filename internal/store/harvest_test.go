package store

import (
	"os"
	"path/filepath"
	"testing"

	"t1m/internal/timer"
)

func TestSaveAndLoadHarvestRoundTrip(t *testing.T) {
	isolateConfig(t)

	want := timer.Harvest{Tomatoes: 12, Streak: 3, BestStreak: 7}
	if err := SaveHarvest(want); err != nil {
		t.Fatalf("save: %v", err)
	}
	if got := LoadHarvest(); got != want {
		t.Fatalf("round trip mismatch: got %+v, want %+v", got, want)
	}
}

func TestLoadHarvestEmptyWhenMissing(t *testing.T) {
	isolateConfig(t)

	if got := LoadHarvest(); got != (timer.Harvest{}) {
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
			if err := os.WriteFile(filepath.Join(dir, HarvestFileName), []byte(content), 0o644); err != nil {
				t.Fatalf("write: %v", err)
			}
			if got := LoadHarvest(); got != (timer.Harvest{}) {
				t.Fatalf("expected empty harvest, got %+v", got)
			}
		})
	}
}

// The harvest lives next to the settings so a portable install carries both.
func TestHarvestSitsNextToSettings(t *testing.T) {
	isolateConfig(t)

	settings, err := SettingsPath()
	if err != nil {
		t.Fatalf("settings path: %v", err)
	}
	harvest, err := HarvestPath()
	if err != nil {
		t.Fatalf("harvest path: %v", err)
	}
	if filepath.Dir(settings) != filepath.Dir(harvest) {
		t.Fatalf("harvest %q is not next to settings %q", harvest, settings)
	}
}
