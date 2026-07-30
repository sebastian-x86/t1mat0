//go:build windows || darwin

// Package tray shows the menu bar icon on the platforms that have one. The
// icon bytes come from the main package, because go:embed cannot reach outside
// its own directory.
package tray

import (
	"sync"

	"fyne.io/systray"

	"t1m/internal/i18n"
	"t1m/internal/timer"
)

// Controller is the part of the application the tray menu drives.
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

// Available reports whether a tray icon is currently shown.
func Available() bool {
	trayMu.Lock()
	defer trayMu.Unlock()
	return trayStarted
}

// Start shows the tray icon and wires its menu to the controller.
func Start(app Controller, icon []byte) {
	trayMu.Lock()
	if trayStarted {
		trayMu.Unlock()
		return
	}
	trayStarted = true
	trayMu.Unlock()

	go func() {
		start, stop := systray.RunWithExternalLoop(func() { onReady(app, icon) }, func() {})

		trayMu.Lock()
		trayStop = stop
		trayMu.Unlock()

		start()
	}()
}

// Stop removes the tray icon.
func Stop() {
	trayMu.Lock()
	stop := trayStop
	trayStarted = false
	trayMu.Unlock()

	if stop != nil {
		stop()
	}
}

func onReady(app Controller, icon []byte) {
	lang := app.GetState().Language

	systray.SetIcon(icon)
	systray.SetTitle(i18n.T(lang, "tray.title"))
	systray.SetTooltip(i18n.T(lang, "tray.tooltip"))

	menu := &trayMenu{
		toggle:      systray.AddMenuItem(i18n.T(lang, "tray.start"), i18n.T(lang, "tray.startTip")),
		reset:       systray.AddMenuItem(i18n.T(lang, "tray.reset"), i18n.T(lang, "tray.resetTip")),
		skip:        systray.AddMenuItem(i18n.T(lang, "tray.skip"), i18n.T(lang, "tray.skipTip")),
		alwaysOnTop: systray.AddMenuItemCheckbox(i18n.T(lang, "tray.alwaysOnTop"), i18n.T(lang, "tray.alwaysOnTopTip"), false),
		sound:       systray.AddMenuItemCheckbox(i18n.T(lang, "tray.sound"), i18n.T(lang, "tray.soundTip"), true),
		showHide:    systray.AddMenuItem(i18n.T(lang, "tray.showHide"), i18n.T(lang, "tray.showHideTip")),
	}
	systray.AddSeparator()
	menu.quit = systray.AddMenuItem(i18n.T(lang, "tray.quit"), i18n.T(lang, "tray.quitTip"))

	trayMu.Lock()
	tray = menu
	trayMu.Unlock()

	Update(app.GetState())

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

// Update re-titles the menu for the given state.
func Update(state timer.State) {
	trayMu.Lock()
	menu := tray
	trayMu.Unlock()

	if menu == nil {
		return
	}

	lang := state.Language
	label := state.PhaseLabel + " " + state.FormattedRemaining
	systray.SetTitle(label)
	systray.SetTooltip(i18n.T(lang, "tray.title") + " - " + label)

	switch state.Status {
	case timer.StatusRunning:
		menu.toggle.SetTitle(i18n.T(lang, "tray.pause"))
	case timer.StatusPaused:
		menu.toggle.SetTitle(i18n.T(lang, "tray.resume"))
	default:
		menu.toggle.SetTitle(i18n.T(lang, "tray.start"))
	}

	// The language can change at runtime, so re-title the static entries too.
	menu.reset.SetTitle(i18n.T(lang, "tray.reset"))
	menu.skip.SetTitle(i18n.T(lang, "tray.skip"))
	menu.alwaysOnTop.SetTitle(i18n.T(lang, "tray.alwaysOnTop"))
	menu.sound.SetTitle(i18n.T(lang, "tray.sound"))
	menu.showHide.SetTitle(i18n.T(lang, "tray.showHide"))
	menu.quit.SetTitle(i18n.T(lang, "tray.quit"))

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
