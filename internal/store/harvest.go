package store

import (
	"encoding/json"
	"os"
	"path/filepath"

	"t1m/internal/timer"
)

// HarvestFileName is the name of the harvest file inside the config directory.
const HarvestFileName = "harvest.json"

// HarvestPath resolves the harvest file next to the settings file.
func HarvestPath() (string, error) {
	path, err := SettingsPath()
	if err != nil {
		return "", err
	}
	return filepath.Join(filepath.Dir(path), HarvestFileName), nil
}

// LoadHarvest reads the persisted harvest, falling back to an empty one.
func LoadHarvest() timer.Harvest {
	path, err := HarvestPath()
	if err != nil {
		return timer.Harvest{}
	}

	data, err := os.ReadFile(path)
	if err != nil {
		return timer.Harvest{}
	}

	var harvest timer.Harvest
	if err := json.Unmarshal(data, &harvest); err != nil {
		return timer.Harvest{}
	}
	if harvest.Tomatoes < 0 || harvest.Total < 0 || harvest.Streak < 0 || harvest.BestStreak < 0 {
		return timer.Harvest{}
	}
	if harvest.Total < harvest.Tomatoes {
		harvest.Total = harvest.Tomatoes
	}
	return harvest
}

// SaveHarvest writes the harvest to disk.
func SaveHarvest(harvest timer.Harvest) error {
	path, err := HarvestPath()
	if err != nil {
		return err
	}
	if err := os.MkdirAll(filepath.Dir(path), 0o755); err != nil {
		return err
	}

	data, err := json.MarshalIndent(harvest, "", "  ")
	if err != nil {
		return err
	}
	return os.WriteFile(path, data, 0o644)
}
