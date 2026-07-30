// Package history stores phase events for later reporting.
package history

import (
	"fmt"
	"slices"
	"time"
)

const (
	// FileVersion is written into history.json for future migrations.
	FileVersion = 1
	dateLayout  = "2006-01-02"
)

// Outcome describes how a phase ended.
type Outcome string

const (
	OutcomeCompleted Outcome = "completed"
	OutcomeSkipped   Outcome = "skipped"
	OutcomeReset     Outcome = "reset"
	OutcomeAbandoned Outcome = "abandoned"
)

// ActivitySegment is reserved for #41 and remains empty for now.
type ActivitySegment struct {
	Category string `json:"category"`
	App      string `json:"app"`
	Title    string `json:"title,omitempty"`
	Domain   string `json:"domain,omitempty"`
	Seconds  int    `json:"seconds"`
}

// PhaseEvent is one finished phase.
type PhaseEvent struct {
	ID             string            `json:"id"`
	Phase          string            `json:"phase"`
	Start          string            `json:"start"`
	End            string            `json:"end"`
	PlannedSeconds int               `json:"plannedSeconds"`
	ActualSeconds  int               `json:"actualSeconds"`
	PausedSeconds  int               `json:"pausedSeconds"`
	PauseCount     int               `json:"pauseCount"`
	Outcome        Outcome           `json:"outcome"`
	Activity       []ActivitySegment `json:"activity,omitempty"`
	Note           string            `json:"note,omitempty"`
}

// DaySummary keeps compacted historic days once raw events expire.
type DaySummary struct {
	Date          string `json:"date"`
	Tomatoes      int    `json:"tomatoes"`
	WorkSeconds   int    `json:"workSeconds"`
	StartedWork   int    `json:"startedWork"`
	CompletedWork int    `json:"completedWork"`
	SkippedBreaks int    `json:"skippedBreaks"`
}

// Log is the persisted history model.
type Log struct {
	Version int          `json:"version"`
	Phases  []PhaseEvent `json:"phases"`
	Days    []DaySummary `json:"days"`
}

// EmptyLog returns an initialized history file payload.
func EmptyLog() Log {
	return Log{
		Version: FileVersion,
		Phases:  []PhaseEvent{},
		Days:    []DaySummary{},
	}
}

func normalize(log Log) Log {
	if log.Version == 0 {
		log.Version = FileVersion
	}
	if log.Phases == nil {
		log.Phases = []PhaseEvent{}
	}
	if log.Days == nil {
		log.Days = []DaySummary{}
	}
	return log
}

// Compact removes raw events older than retentionDays and merges them into day
// summaries so the file size stays bounded.
func Compact(log Log, now time.Time, retentionDays int) Log {
	log = normalize(log)
	if retentionDays < 1 {
		retentionDays = 30
	}

	cutoff := dayStart(now).AddDate(0, 0, -retentionDays)
	byDay := make(map[string]DaySummary, len(log.Days)+7)
	for _, day := range log.Days {
		byDay[day.Date] = day
	}

	keep := make([]PhaseEvent, 0, len(log.Phases))
	for _, event := range log.Phases {
		end, err := parseEventTime(event.End)
		if err != nil || !end.Before(cutoff) {
			keep = append(keep, event)
			continue
		}
		date := dateFromEvent(event, end)
		sum := byDay[date]
		sum.Date = date
		mergeEventIntoDay(&sum, event)
		byDay[date] = sum
	}
	log.Phases = keep

	dates := make([]string, 0, len(byDay))
	for date := range byDay {
		dates = append(dates, date)
	}
	slices.Sort(dates)

	log.Days = make([]DaySummary, 0, len(dates))
	for _, date := range dates {
		log.Days = append(log.Days, byDay[date])
	}
	return log
}

func mergeEventIntoDay(sum *DaySummary, event PhaseEvent) {
	if event.Phase == "work" {
		sum.StartedWork++
		sum.WorkSeconds += max(event.ActualSeconds, 0)
		if event.Outcome == OutcomeCompleted {
			sum.CompletedWork++
			sum.Tomatoes++
		}
		return
	}
	if event.Outcome == OutcomeSkipped {
		sum.SkippedBreaks++
	}
}

func dayStart(t time.Time) time.Time {
	return time.Date(t.Year(), t.Month(), t.Day(), 0, 0, 0, 0, t.Location())
}

func LocalDay(t time.Time) string {
	return t.Format(dateLayout)
}

func parseEventTime(value string) (time.Time, error) {
	parsed, err := time.Parse(time.RFC3339, value)
	if err != nil {
		return time.Time{}, fmt.Errorf("parse event time %q: %w", value, err)
	}
	return parsed, nil
}

func dateFromEvent(event PhaseEvent, fallback time.Time) string {
	start, err := parseEventTime(event.Start)
	if err != nil {
		return LocalDay(fallback)
	}
	return LocalDay(start)
}
