package main

import (
	"context"
	"fmt"
	"net/url"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"sync"
	"time"

	wailsRuntime "github.com/wailsapp/wails/v2/pkg/runtime"

	"t1m/internal/history"
	"t1m/internal/i18n"
	"t1m/internal/store"
	"t1m/internal/timer"
	"t1m/internal/tray"
)

const (
	eventState     = "timer:state"
	eventPlaySound = "timer:sound"
)

// App wires the pomodoro domain to the Wails runtime.
type App struct {
	ctx    context.Context
	timer  *timer.Timer
	ticker *time.Ticker
	done   chan struct{}

	mu             sync.Mutex
	windowVisible  bool
	quitting       bool
	notifyDisabled bool
	historyLog     history.Log
	historyTracker *history.Tracker
	currentDay     string
}

// NewApp creates the application with persisted settings applied.
func NewApp() *App {
	now := time.Now()
	settings := store.LoadSettings()
	machine := timer.NewTimer(settings)
	harvest := store.LoadHarvest()
	if harvest.Total < harvest.Tomatoes {
		harvest.Total = harvest.Tomatoes
	}
	today := history.LocalDay(now)
	// Legacy harvest files had no explicit day; keep the lifetime counter and
	// start the day counter fresh so old totals never disappear.
	if harvest.Day == "" {
		harvest.Day = today
		harvest.Tomatoes = 0
	}
	if harvest.Day != today {
		harvest.Day = today
		harvest.Tomatoes = 0
	}
	machine.SetHarvest(harvest)
	return &App{
		timer:          machine,
		done:           make(chan struct{}),
		windowVisible:  true,
		historyLog:     store.LoadHistory(),
		historyTracker: history.NewTracker(time.Now),
		currentDay:     today,
	}
}

func (a *App) startup(ctx context.Context) {
	a.ctx = ctx

	if err := wailsRuntime.InitializeNotifications(ctx); err != nil {
		a.notifyDisabled = true
		wailsRuntime.LogWarningf(ctx, "notifications unavailable: %v", err)
	}

	state := a.timer.Snapshot()
	state = a.rolloverDayIfNeeded(state)
	_ = store.SaveHarvest(state.Harvest)
	if !a.notifyDisabled {
		wailsRuntime.OnNotificationResponse(ctx, a.handleNotificationResponse)
		a.registerNotificationCategories(state.Language)
	}
	wailsRuntime.WindowSetAlwaysOnTop(ctx, state.Settings.AlwaysOnTop)

	tray.Start(a, trayIcon())
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
	tray.Stop()
	// A shutdown before startup has no runtime context; the settings still
	// have to reach the disk.
	a.finishTrackedPhase(history.OutcomeAbandoned)
	if a.timer.Snapshot().Settings.HistoryEnabled {
		a.compactAndSaveHistory(a.timer.Snapshot().Settings.HistoryRetentionDays, false)
	}
	if ctx != nil {
		wailsRuntime.CleanupNotifications(ctx)
	}
	_ = store.SaveSettings(a.timer.Snapshot().Settings)
}

// beforeClose hides the window into the tray instead of quitting the app,
// unless the user turned that off. A real quit (tray menu) sets the quitting
// flag first, because Wails triggers the close handler on Windows even when
// Quit was requested explicitly.
func (a *App) beforeClose(ctx context.Context) bool {
	a.mu.Lock()
	quitting := a.quitting
	a.mu.Unlock()

	if quitting || !tray.Available() || !a.timer.Snapshot().Settings.CloseToTray {
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
			result.State = a.rolloverDayIfNeeded(result.State)
			if result.PhaseChanged {
				a.finishTrackedPhase(history.OutcomeCompleted)
				if result.State.Status == timer.StatusRunning {
					a.startOrResumeTracking(result.State, false)
				}
				a.announcePhase(result.State, result.FinishedPhase)
			}
			if result.Harvested {
				_ = store.SaveHarvest(result.State.Harvest)
			}
			a.publish(result.State)
		}
	}
}

// publish pushes the state to the frontend and the tray.
func (a *App) publish(state timer.State) {
	if a.ctx != nil {
		wailsRuntime.EventsEmit(a.ctx, eventState, state)
	}
	tray.Update(state)
}

// announcePhase fires the notification and sound for a completed phase.
func (a *App) announcePhase(state timer.State, finished timer.Phase) {
	if a.ctx == nil {
		return
	}

	if !a.notifyDisabled && state.Settings.NotificationsEnabled {
		n := noticeFor(state, finished)
		// Falls back to a plain notification on its own if the category is
		// unknown, which is what happens on platforms without action support.
		err := wailsRuntime.SendNotificationWithActions(a.ctx, wailsRuntime.NotificationOptions{
			ID:         "pomodoro-phase",
			Title:      n.Title,
			Body:       n.Body,
			CategoryID: n.CategoryID,
		})
		if err != nil {
			wailsRuntime.LogWarningf(a.ctx, "failed to send notification: %v", err)
		}
	}

	if state.Settings.SoundEnabled {
		wailsRuntime.EventsEmit(a.ctx, eventPlaySound, string(state.Phase))
	}
}

// GetVersion returns the release the binary was built from.
func (a *App) GetVersion() string {
	return version
}

// GetState returns the current timer snapshot.
func (a *App) GetState() timer.State {
	return a.timer.Snapshot()
}

// GetReport returns daily analysis metrics and chart data.
func (a *App) GetReport() history.Report {
	state := a.timer.Snapshot()
	a.mu.Lock()
	log := a.historyLog
	a.mu.Unlock()
	return history.BuildReport(log, time.Now(), toHistorySchedule(state.Settings), state.Settings.HistoryEnabled)
}

// Start starts or resumes the timer.
func (a *App) Start() timer.State {
	state := a.timer.Start()
	state = a.rolloverDayIfNeeded(state)
	a.startOrResumeTracking(state, false)
	a.publish(state)
	return state
}

// Pause pauses the timer.
func (a *App) Pause() timer.State {
	state := a.timer.Pause()
	a.pauseTracking()
	a.publish(state)
	return state
}

// Toggle switches between running and paused.
func (a *App) Toggle() timer.State {
	wasRunning := a.timer.Snapshot().Status == timer.StatusRunning
	state := a.timer.Toggle()
	state = a.rolloverDayIfNeeded(state)
	if wasRunning {
		a.pauseTracking()
	} else {
		a.startOrResumeTracking(state, false)
	}
	a.publish(state)
	return state
}

// Reset returns the timer to a fresh work phase.
func (a *App) Reset() timer.State {
	a.finishTrackedPhase(history.OutcomeReset)
	state := a.timer.Reset()
	_ = store.SaveHarvest(state.Harvest)
	a.publish(state)
	return state
}

// Skip jumps to the next phase.
func (a *App) Skip() timer.State {
	state, finished := a.timer.Skip()
	a.finishTrackedPhase(history.OutcomeSkipped)
	if state.Status == timer.StatusRunning {
		a.startOrResumeTracking(state, false)
	}
	a.announcePhase(state, finished)
	// A skipped work phase breaks the streak; persist that right away.
	if finished == timer.PhaseWork {
		_ = store.SaveHarvest(state.Harvest)
	}
	a.publish(state)
	return state
}

// UpdateSettings validates, applies and persists new settings.
func (a *App) UpdateSettings(next timer.Settings) (timer.State, error) {
	state, err := a.timer.UpdateSettings(next)
	if err != nil {
		return state, err
	}

	if a.ctx != nil {
		wailsRuntime.WindowSetAlwaysOnTop(a.ctx, state.Settings.AlwaysOnTop)
	}
	if err := store.SaveSettings(state.Settings); err != nil && a.ctx != nil {
		wailsRuntime.LogWarningf(a.ctx, "failed to persist settings: %v", err)
	}

	a.publish(state)
	return state, nil
}

// SetCurrentDuration changes the duration of the running phase from the clock
// display and persists it as the new default for that phase.
func (a *App) SetCurrentDuration(seconds int) (timer.State, error) {
	state, err := a.timer.SetCurrentPhaseSeconds(seconds)
	if err != nil {
		return state, err
	}
	if err := store.SaveSettings(state.Settings); err != nil && a.ctx != nil {
		wailsRuntime.LogWarningf(a.ctx, "failed to persist settings: %v", err)
	}
	a.publish(state)
	return state, nil
}

// SetAlwaysOnTop toggles the always-on-top window flag.
func (a *App) SetAlwaysOnTop(enabled bool) timer.State {
	state := a.timer.SetAlwaysOnTop(enabled)
	if a.ctx != nil {
		wailsRuntime.WindowSetAlwaysOnTop(a.ctx, enabled)
	}
	_ = store.SaveSettings(state.Settings)
	a.publish(state)
	return state
}

// SetSoundEnabled toggles the phase change sound.
func (a *App) SetSoundEnabled(enabled bool) timer.State {
	state := a.timer.SetSoundEnabled(enabled)
	_ = store.SaveSettings(state.Settings)
	a.publish(state)
	return state
}

// SetLanguage switches the UI language.
func (a *App) SetLanguage(language string) timer.State {
	state := a.timer.SetLanguage(language)
	if a.ctx != nil && !a.notifyDisabled {
		// The button titles are stored with the category, so they only follow
		// the language when the categories are registered again.
		a.registerNotificationCategories(state.Language)
	}
	_ = store.SaveSettings(state.Settings)
	a.publish(state)
	return state
}

// SetTheme switches the colour scheme.
func (a *App) SetTheme(theme string) timer.State {
	state := a.timer.SetTheme(theme)
	_ = store.SaveSettings(state.Settings)
	a.publish(state)
	return state
}

// registerNotificationCategories declares the buttons the phase notifications
// offer. Registering a category again overwrites the previous one.
func (a *App) registerNotificationCategories(lang string) {
	categories := []wailsRuntime.NotificationCategory{{
		ID: categoryWorkDone,
		Actions: []wailsRuntime.NotificationAction{
			{ID: actionStart, Title: i18n.T(lang, "notify.startBreak")},
			{ID: actionSkip, Title: i18n.T(lang, "notify.skipBreak")},
		},
	}, {
		ID: categoryBreakDone,
		Actions: []wailsRuntime.NotificationAction{
			{ID: actionStart, Title: i18n.T(lang, "notify.backToWork")},
			{ID: actionShow, Title: i18n.T(lang, "notify.showWindow")},
		},
	}}
	for _, category := range categories {
		if err := wailsRuntime.RegisterNotificationCategory(a.ctx, category); err != nil {
			wailsRuntime.LogWarningf(a.ctx, "failed to register notification category %q: %v", category.ID, err)
		}
	}
}

// handleNotificationResponse runs the button the user pressed on a phase
// notification. Anything else, including a click on the notification body,
// brings the window back.
func (a *App) handleNotificationResponse(result wailsRuntime.NotificationResult) {
	if result.Error != nil {
		wailsRuntime.LogWarningf(a.ctx, "notification response failed: %v", result.Error)
		return
	}

	switch result.Response.ActionIdentifier {
	case actionStart:
		// The next phase may already be running through auto start; toggling
		// blindly would pause it.
		if a.timer.Snapshot().Status != timer.StatusRunning {
			a.Toggle()
		}
	case actionSkip:
		a.Skip()
	default:
		a.ShowWindow()
	}
}

// SetNotificationsEnabled toggles the desktop notifications.
func (a *App) SetNotificationsEnabled(enabled bool) timer.State {
	state := a.timer.SetNotificationsEnabled(enabled)
	_ = store.SaveSettings(state.Settings)
	a.publish(state)
	return state
}

// SetCloseToTray toggles whether the close button hides the window.
func (a *App) SetCloseToTray(enabled bool) timer.State {
	state := a.timer.SetCloseToTray(enabled)
	_ = store.SaveSettings(state.Settings)
	a.publish(state)
	return state
}

// SetSingleKeyShortcuts toggles the letter based keyboard shortcuts.
func (a *App) SetSingleKeyShortcuts(enabled bool) timer.State {
	state := a.timer.SetSingleKeyShortcuts(enabled)
	_ = store.SaveSettings(state.Settings)
	a.publish(state)
	return state
}

// SetHistoryEnabled toggles writing phase history to disk.
func (a *App) SetHistoryEnabled(enabled bool) timer.State {
	state := a.timer.SetHistoryEnabled(enabled)
	if enabled {
		state = a.rolloverDayIfNeeded(state)
		a.startOrResumeTracking(state, true)
	} else {
		a.resetTracking()
	}
	_ = store.SaveSettings(state.Settings)
	a.publish(state)
	return state
}

// SetHistoryConsent stores the first-run decision and optional enable flag.
func (a *App) SetHistoryConsent(enabled bool) timer.State {
	a.timer.SetHistoryEnabled(enabled)
	state := a.timer.SetHistoryPrompted(true)
	if enabled {
		state = a.rolloverDayIfNeeded(state)
		a.startOrResumeTracking(state, true)
	} else {
		a.resetTracking()
	}
	_ = store.SaveSettings(state.Settings)
	a.publish(state)
	return state
}

// DeleteHistoryData removes history.json from disk.
func (a *App) DeleteHistoryData() timer.State {
	_ = store.DeleteHistory()
	a.mu.Lock()
	a.historyLog = history.EmptyLog()
	a.mu.Unlock()
	state := a.timer.Snapshot()
	a.publish(state)
	return state
}

// ExportHistory writes raw phase history as csv or json.
func (a *App) ExportHistory(format string) error {
	if a.ctx == nil {
		return fmt.Errorf("runtime context missing")
	}
	if !store.HasHistory() {
		return fmt.Errorf("no history to export")
	}

	base := "t1mat0-verlauf-" + history.LocalDay(time.Now())
	path, err := store.HistoryPath()
	if err != nil {
		return err
	}
	options := wailsRuntime.SaveDialogOptions{
		Title:            "Export history",
		DefaultDirectory: filepath.Dir(path),
	}

	var content []byte
	switch format {
	case "json":
		options.DefaultFilename = base + ".json"
		options.Filters = []wailsRuntime.FileFilter{{DisplayName: "JSON", Pattern: "*.json"}}
		content, err = os.ReadFile(path)
		if err != nil {
			return err
		}
	default:
		options.DefaultFilename = base + ".csv"
		options.Filters = []wailsRuntime.FileFilter{{DisplayName: "CSV", Pattern: "*.csv"}}
		a.mu.Lock()
		log := a.historyLog
		a.mu.Unlock()
		content, err = history.CSV(log)
		if err != nil {
			return err
		}
	}

	target, err := wailsRuntime.SaveFileDialog(a.ctx, options)
	if err != nil || target == "" {
		return err
	}
	return os.WriteFile(target, content, 0o644)
}

// OpenDataDirectory opens the folder with settings and history files.
func (a *App) OpenDataDirectory() error {
	if a.ctx == nil {
		return fmt.Errorf("runtime context missing")
	}
	path, err := store.SettingsPath()
	if err != nil {
		return err
	}
	wailsRuntime.BrowserOpenURL(a.ctx, (&url.URL{Scheme: "file", Path: filepath.Dir(path)}).String())
	return nil
}

func (a *App) rolloverDayIfNeeded(state timer.State) timer.State {
	today := history.LocalDay(time.Now())
	if today == a.currentDay {
		return state
	}
	a.currentDay = today
	state = a.timer.SetHarvestDay(today)
	_ = store.SaveHarvest(state.Harvest)
	if state.Settings.HistoryEnabled {
		a.compactAndSaveHistory(state.Settings.HistoryRetentionDays, false)
	}
	return state
}

func (a *App) startOrResumeTracking(state timer.State, forceStart bool) {
	if !state.Settings.HistoryEnabled {
		return
	}
	a.mu.Lock()
	defer a.mu.Unlock()
	if a.historyTracker.Active() && !forceStart {
		a.historyTracker.Resume()
		return
	}
	a.historyTracker.StartPhase(string(state.Phase), state.TotalSeconds)
}

func (a *App) pauseTracking() {
	state := a.timer.Snapshot()
	if !state.Settings.HistoryEnabled {
		return
	}
	a.mu.Lock()
	defer a.mu.Unlock()
	a.historyTracker.Pause()
}

func (a *App) finishTrackedPhase(outcome history.Outcome) {
	state := a.timer.Snapshot()
	if !state.Settings.HistoryEnabled {
		return
	}
	a.mu.Lock()
	event, ok := a.historyTracker.EndPhase(outcome)
	if ok {
		a.historyLog.Phases = append(a.historyLog.Phases, event)
		a.historyLog = history.Compact(a.historyLog, time.Now(), state.Settings.HistoryRetentionDays)
	}
	log := a.historyLog
	a.mu.Unlock()
	if ok {
		if err := store.SaveHistory(log); err != nil && a.ctx != nil {
			wailsRuntime.LogWarningf(a.ctx, "failed to persist history: %v", err)
		}
	}
}

func (a *App) compactAndSaveHistory(retentionDays int, allowCreate bool) {
	if !allowCreate && !store.HasHistory() {
		return
	}
	a.mu.Lock()
	a.historyLog = history.Compact(a.historyLog, time.Now(), retentionDays)
	log := a.historyLog
	a.mu.Unlock()
	if err := store.SaveHistory(log); err != nil && a.ctx != nil {
		wailsRuntime.LogWarningf(a.ctx, "failed to compact history: %v", err)
	}
}

func (a *App) resetTracking() {
	a.mu.Lock()
	a.historyTracker = history.NewTracker(time.Now)
	a.mu.Unlock()
}

func toHistorySchedule(settings timer.Settings) history.Schedule {
	out := history.Schedule{
		Enabled:       settings.WorkHoursEnabled,
		UseTargetOnly: settings.WorkHours.UseTargetOnly,
		Days:          make([]history.ScheduleDay, 0, len(settings.WorkHours.Days)),
	}
	for _, day := range settings.WorkHours.Days {
		target := history.ScheduleDay{
			Enabled:       day.Enabled,
			StartMinute:   mustParseClock(day.Start),
			EndMinute:     mustParseClock(day.End),
			TargetMinutes: day.TargetMinutes,
			Breaks:        make([]history.SchedulePause, 0, len(day.Breaks)),
		}
		for _, br := range day.Breaks {
			target.Breaks = append(target.Breaks, history.SchedulePause{
				StartMinute:     mustParseClock(br.Start),
				DurationMinutes: br.DurationMinutes,
			})
		}
		out.Days = append(out.Days, target)
	}
	for len(out.Days) < 7 {
		out.Days = append(out.Days, history.ScheduleDay{})
	}
	return out
}

func mustParseClock(value string) int {
	parts := strings.Split(value, ":")
	if len(parts) != 2 {
		return 0
	}
	hour, err := strconv.Atoi(parts[0])
	if err != nil {
		return 0
	}
	min, err := strconv.Atoi(parts[1])
	if err != nil {
		return 0
	}
	return hour*60 + min
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
	tray.Stop()
	wailsRuntime.Quit(a.ctx)
}
