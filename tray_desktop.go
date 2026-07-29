//go:build windows || darwin

package main

import (
	_ "embed"
	"sync"

	"fyne.io/systray"
)

//go:embed build/windows/icon.ico
var trayIconWindows []byte

//go:embed build/appicon.png
var trayIconDarwin []byte

type trayMenu struct {
	toggle      *systray.MenuItem
	reset       *systray.MenuItem
	skip        *systray.MenuItem
	alwaysOnTop *systray.MenuItem
	sound       *systray.MenuItem
	showHide    *systray.MenuItem
	quit        *systray.MenuItem
}

var (
	trayMu      sync.Mutex
	tray        *trayMenu
	trayStarted bool
	trayStop    func()
)

func trayAvailable() bool {
	trayMu.Lock()
	defer trayMu.Unlock()
	return trayStarted
}

func startTray(app *App) {
	trayMu.Lock()
	if trayStarted {
		trayMu.Unlock()
		return
	}
	trayStarted = true
	trayMu.Unlock()

	go func() {
		start, stop := systray.RunWithExternalLoop(func() { onTrayReady(app) }, func() {})

		trayMu.Lock()
		trayStop = stop
		trayMu.Unlock()

		start()
	}()
}

func stopTray() {
	trayMu.Lock()
	stop := trayStop
	trayStarted = false
	trayMu.Unlock()

	if stop != nil {
		stop()
	}
}

func onTrayReady(app *App) {
	systray.SetIcon(trayIcon())
	systray.SetTitle("Pomodoro")
	systray.SetTooltip("Pomodoro Timer")

	menu := &trayMenu{
		toggle:      systray.AddMenuItem("Start", "Start or pause the timer"),
		reset:       systray.AddMenuItem("Reset", "Reset the timer"),
		skip:        systray.AddMenuItem("Skip Phase", "Jump to the next phase"),
		alwaysOnTop: systray.AddMenuItemCheckbox("Always on Top", "Keep the window above others", false),
		sound:       systray.AddMenuItemCheckbox("Sound", "Play a sound on phase change", true),
		showHide:    systray.AddMenuItem("Show / Hide", "Toggle the window"),
	}
	systray.AddSeparator()
	menu.quit = systray.AddMenuItem("Quit", "Exit the application")

	trayMu.Lock()
	tray = menu
	trayMu.Unlock()

	updateTray(app.GetState())

	go func() {
		for {
			select {
			case <-menu.toggle.ClickedCh:
				app.Toggle()
			case <-menu.reset.ClickedCh:
				app.Reset()
			case <-menu.skip.ClickedCh:
				app.Skip()
			case <-menu.alwaysOnTop.ClickedCh:
				app.SetAlwaysOnTop(!app.GetState().Settings.AlwaysOnTop)
			case <-menu.sound.ClickedCh:
				app.SetSoundEnabled(!app.GetState().Settings.SoundEnabled)
			case <-menu.showHide.ClickedCh:
				app.ToggleWindow()
			case <-menu.quit.ClickedCh:
				app.Quit()
				return
			}
		}
	}()
}

func updateTray(state State) {
	trayMu.Lock()
	menu := tray
	trayMu.Unlock()

	if menu == nil {
		return
	}

	label := state.PhaseLabel + " " + state.FormattedRemaining
	systray.SetTitle(label)
	systray.SetTooltip("Pomodoro - " + label)

	switch state.Status {
	case StatusRunning:
		menu.toggle.SetTitle("Pause")
	case StatusPaused:
		menu.toggle.SetTitle("Resume")
	default:
		menu.toggle.SetTitle("Start")
	}

	setChecked(menu.alwaysOnTop, state.Settings.AlwaysOnTop)
	setChecked(menu.sound, state.Settings.SoundEnabled)
}

func setChecked(item *systray.MenuItem, checked bool) {
	if checked {
		item.Check()
		return
	}
	item.Uncheck()
}
