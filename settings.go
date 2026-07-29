package main

import (
	"encoding/json"
	"os"
	"path/filepath"
)

const (
	settingsDirName  = "t1mat0"
	settingsFileName = "settings.json"
)

// settingsPath resolves the per-user settings file location. When a portable
// marker file sits next to the executable, settings are stored alongside the
// binary instead so the app stays self-contained on a USB stick.
func settingsPath() (string, error) {
	if dir, ok := portableDir(); ok {
		return filepath.Join(dir, settingsFileName), nil
	}

	configDir, err := os.UserConfigDir()
	if err != nil {
		return "", err
	}
	return filepath.Join(configDir, settingsDirName, settingsFileName), nil
}

// portableDir returns the executable directory when the app runs in portable
// mode, signalled by a "portable.txt" file next to the executable.
func portableDir() (string, bool) {
	exe, err := os.Executable()
	if err != nil {
		return "", false
	}
	dir := filepath.Dir(exe)
	if _, err := os.Stat(filepath.Join(dir, "portable.txt")); err != nil {
		return "", false
	}
	return dir, true
}

// LoadSettings reads persisted settings, falling back to defaults when the file
// is missing or unreadable.
func LoadSettings() Settings {
	path, err := settingsPath()
	if err != nil {
		return DefaultSettings()
	}

	data, err := os.ReadFile(path)
	if err != nil {
		return DefaultSettings()
	}

	settings := DefaultSettings()
	if err := json.Unmarshal(data, &settings); err != nil {
		return DefaultSettings()
	}
	if err := settings.Validate(); err != nil {
		return DefaultSettings()
	}
	return settings
}

// SaveSettings persists settings to disk.
func SaveSettings(settings Settings) error {
	path, err := settingsPath()
	if err != nil {
		return err
	}
	if err := os.MkdirAll(filepath.Dir(path), 0o755); err != nil {
		return err
	}

	data, err := json.MarshalIndent(settings, "", "  ")
	if err != nil {
		return err
	}
	return os.WriteFile(path, data, 0o644)
}
