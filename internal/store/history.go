package store

import (
	"encoding/json"
	"os"
	"path/filepath"
	"time"

	"t1m/internal/history"
)

// HistoryFileName is the name of the persisted phase history.
const HistoryFileName = "history.json"

// HistoryPath resolves the history file next to settings and harvest.
func HistoryPath() (string, error) {
	path, err := SettingsPath()
	if err != nil {
		return "", err
	}
	return filepath.Join(filepath.Dir(path), HistoryFileName), nil
}

// LoadHistory returns stored history or an empty model.
func LoadHistory() history.Log {
	path, err := HistoryPath()
	if err != nil {
		return history.EmptyLog()
	}
	data, err := os.ReadFile(path)
	if err != nil {
		return history.EmptyLog()
	}
	var log history.Log
	if err := json.Unmarshal(data, &log); err != nil {
		return history.EmptyLog()
	}
	return history.Compact(log, historyNow(), 30)
}

// SaveHistory writes the full history model atomically.
func SaveHistory(log history.Log) error {
	path, err := HistoryPath()
	if err != nil {
		return err
	}
	if err := os.MkdirAll(filepath.Dir(path), 0o755); err != nil {
		return err
	}

	data, err := json.MarshalIndent(log, "", "  ")
	if err != nil {
		return err
	}

	temp := path + ".tmp"
	if err := os.WriteFile(temp, data, 0o644); err != nil {
		return err
	}
	return os.Rename(temp, path)
}

// DeleteHistory removes the history file if it exists.
func DeleteHistory() error {
	path, err := HistoryPath()
	if err != nil {
		return err
	}
	if err := os.Remove(path); err != nil && !os.IsNotExist(err) {
		return err
	}
	return nil
}

// HasHistory reports whether history.json is present.
func HasHistory() bool {
	path, err := HistoryPath()
	if err != nil {
		return false
	}
	_, err = os.Stat(path)
	return err == nil
}

var historyNow = func() time.Time {
	return time.Now()
}
