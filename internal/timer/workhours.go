package timer

import (
	"fmt"
	"strconv"
	"strings"
)

// FixedPause is one planned break inside configured work hours.
type FixedPause struct {
	Start           string `json:"start"`
	DurationMinutes int    `json:"durationMinutes"`
}

// Workday defines one weekday schedule.
type Workday struct {
	Enabled       bool         `json:"enabled"`
	Start         string       `json:"start"`
	End           string       `json:"end"`
	TargetMinutes int          `json:"targetMinutes"`
	Breaks        []FixedPause `json:"breaks"`
}

// WorkHours stores all weekday schedules. Sunday index 0 through Saturday 6.
type WorkHours struct {
	UseTargetOnly bool      `json:"useTargetOnly"`
	Days          []Workday `json:"days"`
}

// DefaultWorkHours creates an empty schedule. New installs start without any
// workday, so the report stays free of made-up work hours until the user adds
// days explicitly. Start, end and target minutes act as the template used when
// a day is added.
func DefaultWorkHours() WorkHours {
	days := make([]Workday, 7)
	for i := range days {
		days[i] = Workday{
			Enabled:       false,
			Start:         "08:00",
			End:           "16:30",
			TargetMinutes: 480,
			Breaks:        []FixedPause{},
		}
	}
	return WorkHours{
		UseTargetOnly: false,
		Days:          days,
	}
}

func validateWorkHours(schedule WorkHours) error {
	if len(schedule.Days) != 7 {
		return fmt.Errorf("workHours.days must have 7 entries, got %d", len(schedule.Days))
	}
	for i, day := range schedule.Days {
		if day.TargetMinutes < 0 || day.TargetMinutes > 24*60 {
			return fmt.Errorf("workHours.days[%d].targetMinutes must be between 0 and 1440, got %d", i, day.TargetMinutes)
		}
		if !day.Enabled {
			continue
		}
		start, err := parseHHMM(day.Start)
		if err != nil {
			return fmt.Errorf("workHours.days[%d].start: %w", i, err)
		}
		end, err := parseHHMM(day.End)
		if err != nil {
			return fmt.Errorf("workHours.days[%d].end: %w", i, err)
		}
		if end <= start {
			return fmt.Errorf("workHours.days[%d] end must be after start", i)
		}
		lastBreakEnd := -1
		for b, br := range day.Breaks {
			if br.DurationMinutes <= 0 || br.DurationMinutes > 12*60 {
				return fmt.Errorf("workHours.days[%d].breaks[%d].durationMinutes out of range", i, b)
			}
			breakStart, err := parseHHMM(br.Start)
			if err != nil {
				return fmt.Errorf("workHours.days[%d].breaks[%d].start: %w", i, b, err)
			}
			breakEnd := breakStart + br.DurationMinutes
			if breakStart < start || breakEnd > end {
				return fmt.Errorf("workHours.days[%d].breaks[%d] must be inside work hours", i, b)
			}
			if breakStart < lastBreakEnd {
				return fmt.Errorf("workHours.days[%d].breaks overlap", i)
			}
			lastBreakEnd = breakEnd
		}
	}
	return nil
}

func parseHHMM(value string) (int, error) {
	parts := strings.Split(value, ":")
	if len(parts) != 2 {
		return 0, fmt.Errorf("must be HH:MM")
	}
	h, err := strconv.Atoi(parts[0])
	if err != nil {
		return 0, fmt.Errorf("invalid hour")
	}
	m, err := strconv.Atoi(parts[1])
	if err != nil {
		return 0, fmt.Errorf("invalid minute")
	}
	if h < 0 || h > 23 || m < 0 || m > 59 {
		return 0, fmt.Errorf("must be between 00:00 and 23:59")
	}
	return h*60 + m, nil
}
