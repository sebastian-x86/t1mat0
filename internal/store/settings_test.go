package store

import (
	"encoding/json"
	"os"
	"path/filepath"
	"reflect"
	"testing"

	"t1m/internal/i18n"
	"t1m/internal/timer"
)

// isolateConfig points the settings and harvest files at a throwaway directory
// so the tests never touch the real configuration of the machine they run on.
func isolateConfig(t *testing.T) string {
	t.Helper()
	dir := t.TempDir()
	t.Setenv("XDG_CONFIG_HOME", dir)
	t.Setenv("AppData", dir)
	t.Setenv("HOME", dir)
	return filepath.Join(dir, settingsDirName)
}

func writeSettingsFile(t *testing.T, dir, content string) {
	t.Helper()
	if err := os.MkdirAll(dir, 0o755); err != nil {
		t.Fatalf("mkdir: %v", err)
	}
	if err := os.WriteFile(filepath.Join(dir, SettingsFileName), []byte(content), 0o644); err != nil {
		t.Fatalf("write settings: %v", err)
	}
}

func TestLoadSettingsFallsBackToDefaultsWhenMissing(t *testing.T) {
	isolateConfig(t)

	if got, want := LoadSettings(), timer.DefaultSettings(); !reflect.DeepEqual(got, want) {
		t.Fatalf("expected defaults, got %+v", got)
	}
}

func TestSaveAndLoadSettingsRoundTrip(t *testing.T) {
	isolateConfig(t)

	want := timer.DefaultSettings()
	want.WorkSeconds = 42
	want.ShortBreakSeconds = 30
	want.Language = i18n.LangGerman
	want.SingleKeyShortcuts = false
	want.AlwaysOnTop = true

	if err := SaveSettings(want); err != nil {
		t.Fatalf("save: %v", err)
	}
	if got := LoadSettings(); !reflect.DeepEqual(got, want) {
		t.Fatalf("round trip mismatch:\n got %+v\nwant %+v", got, want)
	}
}

// A settings file written before these flags existed must not read as false,
// which is what a plain unmarshal into a zero value would produce.
func TestLoadSettingsKeepsDefaultsForMissingFlags(t *testing.T) {
	dir := isolateConfig(t)
	writeSettingsFile(t, dir, `{"workSeconds":60}`)

	settings := LoadSettings()
	if !settings.CloseToTray {
		t.Fatal("expected closeToTray to stay on for an old settings file")
	}
	if !settings.NotificationsEnabled {
		t.Fatal("expected notificationsEnabled to stay on for an old settings file")
	}
	if settings.Theme != timer.ThemeAuto {
		t.Fatalf("expected the auto theme, got %q", settings.Theme)
	}
	if !settings.SoundEnabled {
		t.Fatal("expected soundEnabled to stay on")
	}
}

func TestLoadSettingsIgnoresBrokenFile(t *testing.T) {
	dir := isolateConfig(t)
	writeSettingsFile(t, dir, "{not json")

	if got, want := LoadSettings(), timer.DefaultSettings(); !reflect.DeepEqual(got, want) {
		t.Fatalf("expected defaults for broken file, got %+v", got)
	}
}

func TestLoadSettingsIgnoresInvalidValues(t *testing.T) {
	dir := isolateConfig(t)
	writeSettingsFile(t, dir, `{"workSeconds": 0}`)

	if got, want := LoadSettings(), timer.DefaultSettings(); !reflect.DeepEqual(got, want) {
		t.Fatalf("expected defaults for invalid values, got %+v", got)
	}
}

// A settings file written by an older version misses the newer keys. They have
// to keep their default, which for booleans must not silently become false.
func TestLoadSettingsKeepsDefaultsForMissingKeys(t *testing.T) {
	dir := isolateConfig(t)
	writeSettingsFile(t, dir, `{"workSeconds": 90}`)

	got := LoadSettings()
	if got.WorkSeconds != 90 {
		t.Fatalf("expected 90 work seconds, got %d", got.WorkSeconds)
	}
	if !got.SingleKeyShortcuts {
		t.Fatal("singleKeyShortcuts should default to true")
	}
	if !got.SoundEnabled {
		t.Fatal("soundEnabled should default to true")
	}
	if got.Language != i18n.LangAuto {
		t.Fatalf("language should default to auto, got %q", got.Language)
	}
}

func TestLoadSettingsUpgradesLegacyMinutes(t *testing.T) {
	dir := isolateConfig(t)
	writeSettingsFile(t, dir, `{"workMinutes": 30, "shortBreakMinutes": 7, "longBreakMinutes": 20}`)

	got := LoadSettings()
	if got.WorkSeconds != 30*60 || got.ShortBreakSeconds != 7*60 || got.LongBreakSeconds != 20*60 {
		t.Fatalf("legacy minutes not converted: %+v", got)
	}
}

// Both formats in one file: the seconds are authoritative, because they are
// what the current version writes.
func TestSettingsSecondsWinOverLegacyMinutes(t *testing.T) {
	var settings timer.Settings
	if err := json.Unmarshal([]byte(`{"workMinutes": 30, "workSeconds": 61}`), &settings); err != nil {
		t.Fatalf("unmarshal: %v", err)
	}
	if settings.WorkSeconds != 61 {
		t.Fatalf("expected 61 seconds, got %d", settings.WorkSeconds)
	}
}

func TestSaveSettingsWritesReadableJSON(t *testing.T) {
	dir := isolateConfig(t)

	if err := SaveSettings(timer.DefaultSettings()); err != nil {
		t.Fatalf("save: %v", err)
	}

	data, err := os.ReadFile(filepath.Join(dir, SettingsFileName))
	if err != nil {
		t.Fatalf("read: %v", err)
	}
	var raw map[string]any
	if err := json.Unmarshal(data, &raw); err != nil {
		t.Fatalf("written file is not valid json: %v", err)
	}
	for _, key := range []string{"workSeconds", "language", "singleKeyShortcuts"} {
		if _, ok := raw[key]; !ok {
			t.Fatalf("key %q missing from written settings", key)
		}
	}
}
