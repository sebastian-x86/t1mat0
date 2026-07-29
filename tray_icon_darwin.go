//go:build darwin

package main

func trayIcon() []byte {
	return trayIconDarwin
}
