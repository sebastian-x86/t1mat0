package history

import (
	"fmt"
	"time"
)

type clock func() time.Time

// Tracker collects phase timing until the phase ends.
type Tracker struct {
	now     clock
	serial  uint64
	current *activePhase
}

type activePhase struct {
	id             string
	phase          string
	start          time.Time
	plannedSeconds int
	pauseCount     int
	pausedDuration time.Duration
	pauseSince     time.Time
	paused         bool
}

// NewTracker creates a phase tracker.
func NewTracker(now func() time.Time) *Tracker {
	if now == nil {
		now = time.Now
	}
	return &Tracker{now: now}
}

// StartPhase starts tracking a new phase.
func (t *Tracker) StartPhase(phase string, plannedSeconds int) {
	if plannedSeconds < 0 {
		plannedSeconds = 0
	}
	t.serial++
	now := t.now()
	t.current = &activePhase{
		id:             fmt.Sprintf("%d-%d", now.UnixNano(), t.serial),
		phase:          phase,
		start:          now,
		plannedSeconds: plannedSeconds,
	}
}

// Pause marks the current phase as paused.
func (t *Tracker) Pause() {
	if t.current == nil || t.current.paused {
		return
	}
	t.current.paused = true
	t.current.pauseSince = t.now()
	t.current.pauseCount++
}

// Resume marks the current phase as running.
func (t *Tracker) Resume() {
	if t.current == nil || !t.current.paused {
		return
	}
	now := t.now()
	if now.After(t.current.pauseSince) {
		t.current.pausedDuration += now.Sub(t.current.pauseSince)
	}
	t.current.paused = false
}

// EndPhase finishes the current phase and returns the event.
func (t *Tracker) EndPhase(outcome Outcome) (PhaseEvent, bool) {
	if t.current == nil {
		return PhaseEvent{}, false
	}

	now := t.now()
	current := t.current
	if current.paused && now.After(current.pauseSince) {
		current.pausedDuration += now.Sub(current.pauseSince)
		current.paused = false
	}

	total := max(int(now.Sub(current.start).Seconds()), 0)
	paused := max(int(current.pausedDuration.Seconds()), 0)
	actual := max(total-paused, 0)
	event := PhaseEvent{
		ID:             current.id,
		Phase:          current.phase,
		Start:          current.start.Format(time.RFC3339),
		End:            now.Format(time.RFC3339),
		PlannedSeconds: current.plannedSeconds,
		ActualSeconds:  actual,
		PausedSeconds:  paused,
		PauseCount:     current.pauseCount,
		Outcome:        outcome,
	}

	t.current = nil
	return event, true
}

// Active reports whether a phase is currently tracked.
func (t *Tracker) Active() bool {
	return t.current != nil
}
