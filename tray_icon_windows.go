//go:build windows

package main

import _ "embed"

//go:embed build/windows/icon.ico
var trayIconBytes []byte

// trayIcon returns the icon in the format the Windows notification area wants.
func trayIcon() []byte {
	return trayIconBytes
}
