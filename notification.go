package main

import (
	"strconv"

	"t1m/internal/i18n"
	"t1m/internal/timer"
)

// Notification categories and the actions inside them. Categories have to be
// registered before a notification can reference them; their button titles are
// baked in at registration time, so they are registered again whenever the
// language changes.
const (
	categoryWorkDone  = "phase-work-done"
	categoryBreakDone = "phase-break-done"

	actionStart = "start"
	actionSkip  = "skip"
	actionShow  = "show"
)

// notice is everything the runtime needs for one phase notification.
type notice struct {
	Title      string
	Body       string
	CategoryID string
}

// phaseEmoji gives the notification a picture without a custom toast layout:
// the system renders emoji in colour, and the app icon (the tomato) is already
// attached by the runtime.
func phaseEmoji(phase timer.Phase) string {
	switch phase {
	case timer.PhaseShortBreak:
		return "☕"
	case timer.PhaseLongBreak:
		return "🌴"
	default:
		return "🍅"
	}
}

// harvestLine reports the reward for a finished work phase: the tomato count
// and, from two in a row, the current streak.
func harvestLine(lang string, harvest timer.Harvest) string {
	line := i18n.T(lang, "notify.harvested")
	if harvest.Tomatoes > 1 {
		line = strconv.Itoa(harvest.Tomatoes) + " " + i18n.T(lang, "notify.harvestedCount")
	}
	if harvest.Streak > 1 {
		line += " · " + i18n.T(lang, "notify.streak") + " " + strconv.Itoa(harvest.Streak)
	}
	return line
}

// noticeFor builds the notification for a phase that just ended. It is kept
// free of the Wails runtime so the wording can be tested.
func noticeFor(state timer.State, finished timer.Phase) notice {
	lang := state.Language
	next := i18n.T(lang, "notify.next") + ": " + state.PhaseLabel + " (" + state.FormattedRemaining + ")"

	n := notice{
		Title: phaseEmoji(finished) + " " +
			timer.PhaseLabelIn(lang, finished) + " " + i18n.T(lang, "notify.finished"),
		Body:       next,
		CategoryID: categoryBreakDone,
	}
	if finished == timer.PhaseWork {
		n.Body = harvestLine(lang, state.Harvest) + " · " + next
		n.CategoryID = categoryWorkDone
	}
	return n
}
