//go:build !windows && !darwin

package main

// trayIcon has nothing to return where no tray exists.
func trayIcon() []byte { return nil }
