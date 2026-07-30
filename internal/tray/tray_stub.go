//go:build !windows && !darwin

package tray

import "t1m/internal/timer"

// Tray support is only wired up for Windows and macOS, which are the release
// targets. On other platforms the app runs without a tray icon.

// Available always reports false here.
func Available() bool { return false }

// Start does nothing without a tray.
func Start(_ Controller, _ []byte) {}

// Stop does nothing without a tray.
func Stop() {}

// Update does nothing without a tray.
func Update(_ timer.State) {}

// Controller is the part of the application the tray menu would drive.
type Controller interface {
	GetState() timer.State
	Toggle() timer.State
	Reset() timer.State
	Skip() timer.State
	SetAlwaysOnTop(enabled bool) timer.State
	SetSoundEnabled(enabled bool) timer.State
	ToggleWindow()
	Quit()
}
