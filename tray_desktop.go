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
	lang := app.GetState().Language

	systray.SetIcon(trayIcon())
	systray.SetTitle(T(lang, "tray.title"))
	systray.SetTooltip(T(lang, "tray.tooltip"))

	menu := &trayMenu{
		toggle:      systray.AddMenuItem(T(lang, "tray.start"), T(lang, "tray.startTip")),
		reset:       systray.AddMenuItem(T(lang, "tray.reset"), T(lang, "tray.resetTip")),
		skip:        systray.AddMenuItem(T(lang, "tray.skip"), T(lang, "tray.skipTip")),
		alwaysOnTop: systray.AddMenuItemCheckbox(T(lang, "tray.alwaysOnTop"), T(lang, "tray.alwaysOnTopTip"), false),
		sound:       systray.AddMenuItemCheckbox(T(lang, "tray.sound"), T(lang, "tray.soundTip"), true),
		showHide:    systray.AddMenuItem(T(lang, "tray.showHide"), T(lang, "tray.showHideTip")),
	}
	systray.AddSeparator()
	menu.quit = systray.AddMenuItem(T(lang, "tray.quit"), T(lang, "tray.quitTip"))

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

	lang := state.Language
	label := state.PhaseLabel + " " + state.FormattedRemaining
	systray.SetTitle(label)
	systray.SetTooltip(T(lang, "tray.title") + " - " + label)

	switch state.Status {
	case StatusRunning:
		menu.toggle.SetTitle(T(lang, "tray.pause"))
	case StatusPaused:
		menu.toggle.SetTitle(T(lang, "tray.resume"))
	default:
		menu.toggle.SetTitle(T(lang, "tray.start"))
	}

	// The language can change at runtime, so re-title the static entries too.
	menu.reset.SetTitle(T(lang, "tray.reset"))
	menu.skip.SetTitle(T(lang, "tray.skip"))
	menu.alwaysOnTop.SetTitle(T(lang, "tray.alwaysOnTop"))
	menu.sound.SetTitle(T(lang, "tray.sound"))
	menu.showHide.SetTitle(T(lang, "tray.showHide"))
	menu.quit.SetTitle(T(lang, "tray.quit"))

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
