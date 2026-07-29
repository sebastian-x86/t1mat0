//go:build !windows && !darwin

package main

// Tray support is only wired up for Windows and macOS, which are the release
// targets. On other platforms the app runs without a tray icon.

func trayAvailable() bool { return false }

func startTray(_ *App) {}

func stopTray() {}

func updateTray(_ State) {}
