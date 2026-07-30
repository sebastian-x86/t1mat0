package main

import (
	"context"
	"encoding/json"
	"errors"
	"os"
	"path/filepath"
	"testing"

	"t1m/internal/i18n"
	"t1m/internal/store"
	"t1m/internal/timer"
)

// The App methods are exercised without a Wails context. Everything that talks
// to the runtime is guarded by a nil check, so what is left is exactly the part
// worth testing: state transitions plus persistence.

// isolateConfig points the settings and harvest files at a throwaway directory
// so the tests never touch the real configuration of the machine they run on.
func isolateConfig(t *testing.T) string {
	t.Helper()
	dir := t.TempDir()
	t.Setenv("XDG_CONFIG_HOME", dir)
	t.Setenv("AppData", dir)
	t.Setenv("HOME", dir)
	path, err := store.SettingsPath()
	if err != nil {
		t.Fatalf("settings path: %v", err)
	}
	return filepath.Dir(path)
}

func readSettingsFile(t *testing.T) timer.Settings {
	t.Helper()
	path, err := store.SettingsPath()
	if err != nil {
		t.Fatalf("settings path: %v", err)
	}
	data, err := os.ReadFile(path)
	if err != nil {
		t.Fatalf("read settings: %v", err)
	}
	settings := timer.DefaultSettings()
	if err := json.Unmarshal(data, &settings); err != nil {
		t.Fatalf("parse settings: %v", err)
	}
	return settings
}

func readHarvestFile(t *testing.T) timer.Harvest {
	t.Helper()
	path, err := store.HarvestPath()
	if err != nil {
		t.Fatalf("harvest path: %v", err)
	}
	data, err := os.ReadFile(path)
	if err != nil {
		t.Fatalf("read harvest: %v", err)
	}
	var harvest timer.Harvest
	if err := json.Unmarshal(data, &harvest); err != nil {
		t.Fatalf("parse harvest: %v", err)
	}
	return harvest
}

func TestNewAppRestoresPersistedState(t *testing.T) {
	isolateConfig(t)

	settings := timer.DefaultSettings()
	settings.WorkSeconds = 90
	settings.Language = i18n.LangGerman
	if err := store.SaveSettings(settings); err != nil {
		t.Fatalf("save settings: %v", err)
	}
	if err := store.SaveHarvest(timer.Harvest{Tomatoes: 4, Streak: 2, BestStreak: 6}); err != nil {
		t.Fatalf("save harvest: %v", err)
	}

	state := NewApp().GetState()
	if state.Settings.WorkSeconds != 90 {
		t.Fatalf("expected the persisted duration, got %d", state.Settings.WorkSeconds)
	}
	if state.Harvest.Tomatoes != 4 || state.Harvest.BestStreak != 6 {
		t.Fatalf("expected the persisted harvest, got %+v", state.Harvest)
	}
	if state.PhaseLabel != "Arbeit" {
		t.Fatalf("expected the german label, got %q", state.PhaseLabel)
	}
}

func TestAppToggleSwitchesStatus(t *testing.T) {
	isolateConfig(t)
	app := NewApp()

	if got := app.Toggle().Status; got != timer.StatusRunning {
		t.Fatalf("expected running, got %q", got)
	}
	if got := app.Toggle().Status; got != timer.StatusPaused {
		t.Fatalf("expected paused, got %q", got)
	}
	if got := app.Pause().Status; got != timer.StatusPaused {
		t.Fatalf("pausing twice should stay paused, got %q", got)
	}
	if got := app.Start().Status; got != timer.StatusRunning {
		t.Fatalf("expected running, got %q", got)
	}
}

func TestAppSkipPersistsTheBrokenStreak(t *testing.T) {
	isolateConfig(t)
	if err := store.SaveHarvest(timer.Harvest{Tomatoes: 3, Streak: 3, BestStreak: 3}); err != nil {
		t.Fatalf("save harvest: %v", err)
	}

	app := NewApp()
	app.Start()
	app.Skip() // skipping a work phase squashes the streak

	stored := readHarvestFile(t)
	if stored.Streak != 0 {
		t.Fatalf("streak should be persisted as zero, got %d", stored.Streak)
	}
	if stored.Tomatoes != 3 || stored.BestStreak != 3 {
		t.Fatalf("tomatoes and best streak should survive, got %+v", stored)
	}
}

func TestAppResetPersistsTheHarvest(t *testing.T) {
	isolateConfig(t)
	if err := store.SaveHarvest(timer.Harvest{Tomatoes: 2, Streak: 2, BestStreak: 5}); err != nil {
		t.Fatalf("save harvest: %v", err)
	}

	app := NewApp()
	state := app.Reset()

	if state.Status != timer.StatusIdle || state.Phase != timer.PhaseWork {
		t.Fatalf("reset should return to an idle work phase, got %q/%q", state.Status, state.Phase)
	}
	stored := readHarvestFile(t)
	if stored.Streak != 0 || stored.Tomatoes != 2 {
		t.Fatalf("unexpected stored harvest: %+v", stored)
	}
}

func TestAppSettersPersistImmediately(t *testing.T) {
	isolateConfig(t)
	app := NewApp()

	app.SetLanguage(i18n.LangGerman)
	app.SetSoundEnabled(false)
	app.SetSingleKeyShortcuts(false)
	app.SetAlwaysOnTop(true)

	stored := readSettingsFile(t)
	if stored.Language != i18n.LangGerman {
		t.Fatalf("language not persisted: %q", stored.Language)
	}
	if stored.SoundEnabled || stored.SingleKeyShortcuts {
		t.Fatalf("toggles not persisted: %+v", stored)
	}
	if !stored.AlwaysOnTop {
		t.Fatal("alwaysOnTop not persisted")
	}
}

func TestAppUpdateSettingsRejectsInvalidInput(t *testing.T) {
	isolateConfig(t)
	app := NewApp()

	broken := timer.DefaultSettings()
	broken.WorkSeconds = 0

	if _, err := app.UpdateSettings(broken); !errors.Is(err, timer.ErrInvalidSettings) {
		t.Fatalf("expected timer.ErrInvalidSettings, got %v", err)
	}

	path, err := store.SettingsPath()
	if err != nil {
		t.Fatalf("settings path: %v", err)
	}
	if _, err := os.Stat(path); !os.IsNotExist(err) {
		t.Fatalf("invalid settings must not be written, stat err: %v", err)
	}
}

func TestAppSetCurrentDurationPersistsThePhaseDefault(t *testing.T) {
	isolateConfig(t)
	app := NewApp()
	app.Start()

	state, err := app.SetCurrentDuration(30)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if state.RemainingSeconds != 30 {
		t.Fatalf("expected 30 seconds left, got %d", state.RemainingSeconds)
	}
	if got := readSettingsFile(t).WorkSeconds; got != 30 {
		t.Fatalf("expected the work default to be persisted, got %d", got)
	}
}

func TestAppSetCurrentDurationRejectsOutOfRange(t *testing.T) {
	isolateConfig(t)
	app := NewApp()

	if _, err := app.SetCurrentDuration(0); !errors.Is(err, timer.ErrInvalidSettings) {
		t.Fatalf("expected timer.ErrInvalidSettings, got %v", err)
	}
}

// Without a runtime context the window helpers must stay quiet instead of
// panicking; the tray calls them before Wails is up.
func TestAppWindowHelpersAreSafeWithoutRuntime(t *testing.T) {
	isolateConfig(t)
	app := NewApp()

	app.ShowWindow()
	app.HideWindow()
	app.ToggleWindow()
	app.Quit()

	app.mu.Lock()
	visible, quitting := app.windowVisible, app.quitting
	app.mu.Unlock()

	if !visible {
		t.Fatal("visibility must not change without a runtime")
	}
	if quitting {
		t.Fatal("quit without a runtime must not arm the quitting flag")
	}
}

func TestAppShutdownPersistsSettings(t *testing.T) {
	dir := isolateConfig(t)
	app := NewApp()
	if _, err := app.SetCurrentDuration(120); err != nil {
		t.Fatalf("set duration: %v", err)
	}
	if err := os.Remove(filepath.Join(dir, store.SettingsFileName)); err != nil {
		t.Fatalf("remove settings: %v", err)
	}

	// Absichtlich ohne Kontext: shutdown muss die Einstellungen auch dann
	// schreiben, wenn die Wails-Runtime nie gestartet wurde.
	var withoutRuntime context.Context
	app.shutdown(withoutRuntime)

	if got := readSettingsFile(t).WorkSeconds; got != 120 {
		t.Fatalf("shutdown should write the current settings, got %d", got)
	}
}
