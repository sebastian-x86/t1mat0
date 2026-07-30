//go:build darwin

package main

import _ "embed"

//go:embed build/appicon.png
var trayIconBytes []byte

// trayIcon returns the icon for the macOS menu bar.
func trayIcon() []byte {
	return trayIconBytes
}
