package main

import (
	"encoding/json"
	"os"
	"path/filepath"
)

const harvestFileName = "harvest.json"

// Harvest is the little gamification layer: every work phase that runs out on
// its own earns a tomato. Skipping or resetting squashes the current streak,
// so the number rewards actually sitting the phase out.
type Harvest struct {
	Tomatoes   int `json:"tomatoes"`
	Streak     int `json:"streak"`
	BestStreak int `json:"bestStreak"`
}

// harvestPath resolves the harvest file next to the settings file.
func harvestPath() (string, error) {
	path, err := settingsPath()
	if err != nil {
		return "", err
	}
	return filepath.Join(filepath.Dir(path), harvestFileName), nil
}

// LoadHarvest reads the persisted harvest, falling back to an empty one.
func LoadHarvest() Harvest {
	path, err := harvestPath()
	if err != nil {
		return Harvest{}
	}

	data, err := os.ReadFile(path)
	if err != nil {
		return Harvest{}
	}

	var harvest Harvest
	if err := json.Unmarshal(data, &harvest); err != nil {
		return Harvest{}
	}
	if harvest.Tomatoes < 0 || harvest.Streak < 0 || harvest.BestStreak < 0 {
		return Harvest{}
	}
	return harvest
}

// SaveHarvest writes the harvest to disk.
func SaveHarvest(harvest Harvest) error {
	path, err := harvestPath()
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
