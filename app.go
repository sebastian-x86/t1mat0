package main

import (
	"context"
	"sync"
	"time"

	wailsRuntime "github.com/wailsapp/wails/v2/pkg/runtime"
)

const (
	eventState     = "timer:state"
	eventPlaySound = "timer:sound"
)

// App wires the pomodoro domain to the Wails runtime.
type App struct {
	ctx    context.Context
	timer  *Timer
	ticker *time.Ticker
	done   chan struct{}

	mu             sync.Mutex
	windowVisible  bool
	quitting       bool
	notifyDisabled bool
}

// NewApp creates the application with persisted settings applied.
func NewApp() *App {
	timer := NewTimer(LoadSettings())
	timer.SetHarvest(LoadHarvest())
	return &App{
		timer:         timer,
		done:          make(chan struct{}),
		windowVisible: true,
	}
}

func (a *App) startup(ctx context.Context) {
	a.ctx = ctx

	if err := wailsRuntime.InitializeNotifications(ctx); err != nil {
		a.notifyDisabled = true
		wailsRuntime.LogWarningf(ctx, "notifications unavailable: %v", err)
	}

	state := a.timer.Snapshot()
	wailsRuntime.WindowSetAlwaysOnTop(ctx, state.Settings.AlwaysOnTop)

	startTray(a)
	a.publish(state)

	a.ticker = time.NewTicker(time.Second)
	go a.runLoop()
}

func (a *App) shutdown(ctx context.Context) {
	if a.ticker != nil {
		a.ticker.Stop()
	}
	select {
	case <-a.done:
	default:
		close(a.done)
	}
	stopTray()
	// A shutdown before startup has no runtime context; the settings still
	// have to reach the disk.
	if ctx != nil {
		wailsRuntime.CleanupNotifications(ctx)
	}
	_ = SaveSettings(a.timer.Snapshot().Settings)
}

// beforeClose hides the window into the tray instead of quitting the app.
// A real quit (tray menu) sets the quitting flag first, because Wails triggers
// the close handler on Windows even when Quit was requested explicitly.
func (a *App) beforeClose(ctx context.Context) bool {
	a.mu.Lock()
	quitting := a.quitting
	a.mu.Unlock()

	if quitting || !trayAvailable() {
		return false
	}
	a.HideWindow()
	return true
}

func (a *App) runLoop() {
	for {
		select {
		case <-a.done:
			return
		case <-a.ticker.C:
			result := a.timer.Tick()
			if result.PhaseChanged {
				a.announcePhase(result.State, result.FinishedPhase)
			}
			if result.Harvested {
				_ = SaveHarvest(result.State.Harvest)
			}
			a.publish(result.State)
		}
	}
}

// publish pushes the state to the frontend and the tray.
func (a *App) publish(state State) {
	if a.ctx != nil {
		wailsRuntime.EventsEmit(a.ctx, eventState, state)
	}
	updateTray(state)
}

// announcePhase fires the notification and sound for a completed phase.
func (a *App) announcePhase(state State, finished Phase) {
	if a.ctx == nil {
		return
	}

	if !a.notifyDisabled {
		err := wailsRuntime.SendNotification(a.ctx, wailsRuntime.NotificationOptions{
			ID:    "pomodoro-phase",
			Title: PhaseLabelIn(state.Language, finished) + " " + T(state.Language, "notify.finished"),
			Body:  T(state.Language, "notify.next") + ": " + state.PhaseLabel + " (" + state.FormattedRemaining + ")",
		})
		if err != nil {
			wailsRuntime.LogWarningf(a.ctx, "failed to send notification: %v", err)
		}
	}

	if state.Settings.SoundEnabled {
		wailsRuntime.EventsEmit(a.ctx, eventPlaySound, string(state.Phase))
	}
}

// GetState returns the current timer snapshot.
func (a *App) GetState() State {
	return a.timer.Snapshot()
}

// Start starts or resumes the timer.
func (a *App) Start() State {
	state := a.timer.Start()
	a.publish(state)
	return state
}

// Pause pauses the timer.
func (a *App) Pause() State {
	state := a.timer.Pause()
	a.publish(state)
	return state
}

// Toggle switches between running and paused.
func (a *App) Toggle() State {
	state := a.timer.Toggle()
	a.publish(state)
	return state
}

// Reset returns the timer to a fresh work phase.
func (a *App) Reset() State {
	state := a.timer.Reset()
	_ = SaveHarvest(state.Harvest)
	a.publish(state)
	return state
}

// Skip jumps to the next phase.
func (a *App) Skip() State {
	state, finished := a.timer.Skip()
	a.announcePhase(state, finished)
	// A skipped work phase breaks the streak; persist that right away.
	if finished == PhaseWork {
		_ = SaveHarvest(state.Harvest)
	}
	a.publish(state)
	return state
}

// UpdateSettings validates, applies and persists new settings.
func (a *App) UpdateSettings(next Settings) (State, error) {
	state, err := a.timer.UpdateSettings(next)
	if err != nil {
		return state, err
	}

	if a.ctx != nil {
		wailsRuntime.WindowSetAlwaysOnTop(a.ctx, state.Settings.AlwaysOnTop)
	}
	if err := SaveSettings(state.Settings); err != nil && a.ctx != nil {
		wailsRuntime.LogWarningf(a.ctx, "failed to persist settings: %v", err)
	}

	a.publish(state)
	return state, nil
}

// SetCurrentDuration changes the duration of the running phase from the clock
// display and persists it as the new default for that phase.
func (a *App) SetCurrentDuration(seconds int) (State, error) {
	state, err := a.timer.SetCurrentPhaseSeconds(seconds)
	if err != nil {
		return state, err
	}
	if err := SaveSettings(state.Settings); err != nil && a.ctx != nil {
		wailsRuntime.LogWarningf(a.ctx, "failed to persist settings: %v", err)
	}
	a.publish(state)
	return state, nil
}

// SetAlwaysOnTop toggles the always-on-top window flag.
func (a *App) SetAlwaysOnTop(enabled bool) State {
	state := a.timer.SetAlwaysOnTop(enabled)
	if a.ctx != nil {
		wailsRuntime.WindowSetAlwaysOnTop(a.ctx, enabled)
	}
	_ = SaveSettings(state.Settings)
	a.publish(state)
	return state
}

// SetSoundEnabled toggles the phase change sound.
func (a *App) SetSoundEnabled(enabled bool) State {
	state := a.timer.SetSoundEnabled(enabled)
	_ = SaveSettings(state.Settings)
	a.publish(state)
	return state
}

// SetLanguage switches the UI language.
func (a *App) SetLanguage(language string) State {
	state := a.timer.SetLanguage(language)
	_ = SaveSettings(state.Settings)
	a.publish(state)
	return state
}

// SetSingleKeyShortcuts toggles the letter based keyboard shortcuts.
func (a *App) SetSingleKeyShortcuts(enabled bool) State {
	state := a.timer.SetSingleKeyShortcuts(enabled)
	_ = SaveSettings(state.Settings)
	a.publish(state)
	return state
}

// ShowWindow brings the window back to the foreground.
func (a *App) ShowWindow() {
	if a.ctx == nil {
		return
	}
	wailsRuntime.WindowShow(a.ctx)
	wailsRuntime.WindowUnminimise(a.ctx)
	a.mu.Lock()
	a.windowVisible = true
	a.mu.Unlock()
}

// HideWindow hides the window; the tray keeps the app alive.
func (a *App) HideWindow() {
	if a.ctx == nil {
		return
	}
	wailsRuntime.WindowHide(a.ctx)
	a.mu.Lock()
	a.windowVisible = false
	a.mu.Unlock()
}

// ToggleWindow shows or hides the window depending on its current state.
func (a *App) ToggleWindow() {
	a.mu.Lock()
	visible := a.windowVisible
	a.mu.Unlock()

	if visible {
		a.HideWindow()
		return
	}
	a.ShowWindow()
}

// Quit terminates the application, including the tray icon.
func (a *App) Quit() {
	if a.ctx == nil {
		return
	}
	a.mu.Lock()
	a.quitting = true
	a.mu.Unlock()

	// Drop the tray icon before the window goes away, otherwise Windows keeps
	// showing a ghost icon until the notification area is hovered.
	stopTray()
	wailsRuntime.Quit(a.ctx)
}
