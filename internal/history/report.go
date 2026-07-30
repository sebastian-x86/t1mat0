package history

import (
	"math"
	"slices"
	"time"
)

// SchedulePause is one fixed pause within a workday.
type SchedulePause struct {
	StartMinute     int `json:"startMinute"`
	DurationMinutes int `json:"durationMinutes"`
}

// ScheduleDay describes one weekday schedule (Sunday index 0).
type ScheduleDay struct {
	Enabled       bool            `json:"enabled"`
	StartMinute   int             `json:"startMinute"`
	EndMinute     int             `json:"endMinute"`
	TargetMinutes int             `json:"targetMinutes"`
	Breaks        []SchedulePause `json:"breaks"`
}

// Schedule is the report-side representation of work hours.
type Schedule struct {
	Enabled       bool          `json:"enabled"`
	UseTargetOnly bool          `json:"useTargetOnly"`
	Days          []ScheduleDay `json:"days"`
}

// BucketPoint holds one hourly work bucket.
type BucketPoint struct {
	Hour    int `json:"hour"`
	Seconds int `json:"seconds"`
}

// Report is the complete payload for the analysis view.
type Report struct {
	Day                string        `json:"day"`
	HasData            bool          `json:"hasData"`
	HistoryEnabled     bool          `json:"historyEnabled"`
	Phases             []PhaseEvent  `json:"phases"`
	TomatoesToday      int           `json:"tomatoesToday"`
	AverageTomatoes7   float64       `json:"averageTomatoes7"`
	StartedWork        int           `json:"startedWork"`
	CompletedWork      int           `json:"completedWork"`
	AdherenceRate      float64       `json:"adherenceRate"`
	SkippedBreaks      int           `json:"skippedBreaks"`
	PauseSeconds       int           `json:"pauseSeconds"`
	PauseCount         int           `json:"pauseCount"`
	LongestWorkStreak  int           `json:"longestWorkStreak"`
	CurrentWorkStreak  int           `json:"currentWorkStreak"`
	ProductiveHour     int           `json:"productiveHour"`
	HourlyWork         []BucketPoint `json:"hourlyWork"`
	PlannedWorkSeconds int           `json:"plannedWorkSeconds"`
	CoverageRate       float64       `json:"coverageRate"`
	WorkInBreakSeconds int           `json:"workInBreakSeconds"`
	AfterHoursSeconds  int           `json:"afterHoursSeconds"`
	Schedule           Schedule      `json:"schedule"`
}

// BuildReport calculates all report metrics from persisted history.
func BuildReport(log Log, day time.Time, schedule Schedule, historyEnabled bool) Report {
	log = normalize(log)
	targetDay := LocalDay(day)
	report := Report{
		Day:            targetDay,
		HistoryEnabled: historyEnabled,
		Schedule:       schedule,
		HourlyWork:     make([]BucketPoint, 24),
	}
	for hour := 0; hour < 24; hour++ {
		report.HourlyWork[hour] = BucketPoint{Hour: hour}
	}

	sortByStart(log.Phases)
	var streak, best int
	tomatoesByDay := map[string]int{}
	for _, event := range log.Phases {
		start, err := parseEventTime(event.Start)
		if err != nil {
			continue
		}
		date := LocalDay(start)
		if event.Phase == "work" && event.Outcome == OutcomeCompleted {
			tomatoesByDay[date]++
		}
		if event.Phase == "work" {
			if event.Outcome == OutcomeCompleted {
				streak++
				if streak > best {
					best = streak
				}
			} else {
				streak = 0
			}
		}
	}
	for _, daySummary := range log.Days {
		tomatoesByDay[daySummary.Date] += daySummary.Tomatoes
	}

	report.LongestWorkStreak = best
	report.CurrentWorkStreak = streak
	report.AverageTomatoes7 = averageTomatoesLast7Days(tomatoesByDay, day)

	for _, event := range log.Phases {
		start, err := parseEventTime(event.Start)
		if err != nil {
			continue
		}
		if LocalDay(start) != targetDay {
			continue
		}
		report.Phases = append(report.Phases, event)
		if event.Phase == "work" {
			report.StartedWork++
			if event.Outcome == OutcomeCompleted {
				report.CompletedWork++
				report.TomatoesToday++
			}
			report.PauseSeconds += event.PausedSeconds
			report.PauseCount += event.PauseCount
			if hour := start.Hour(); hour >= 0 && hour < 24 {
				report.HourlyWork[hour].Seconds += max(event.ActualSeconds, 0)
			}
		} else if event.Outcome == OutcomeSkipped {
			report.SkippedBreaks++
		}
	}

	report.HasData = len(report.Phases) > 0
	if report.StartedWork > 0 {
		report.AdherenceRate = round2(float64(report.CompletedWork) / float64(report.StartedWork))
	}
	report.ProductiveHour = mostProductiveHour(report.HourlyWork)
	applyScheduleMetrics(&report, day)
	return report
}

func sortByStart(phases []PhaseEvent) {
	slices.SortFunc(phases, func(a, b PhaseEvent) int {
		if a.Start < b.Start {
			return -1
		}
		if a.Start > b.Start {
			return 1
		}
		return 0
	})
}

func averageTomatoesLast7Days(byDay map[string]int, now time.Time) float64 {
	total := 0
	for i := 0; i < 7; i++ {
		day := LocalDay(now.AddDate(0, 0, -i))
		total += byDay[day]
	}
	return round2(float64(total) / 7.0)
}

func mostProductiveHour(points []BucketPoint) int {
	bestHour := 0
	bestSeconds := -1
	for _, point := range points {
		if point.Seconds > bestSeconds {
			bestSeconds = point.Seconds
			bestHour = point.Hour
		}
	}
	return bestHour
}

func applyScheduleMetrics(report *Report, day time.Time) {
	if !report.Schedule.Enabled || len(report.Schedule.Days) != 7 {
		return
	}
	plan := report.Schedule.Days[int(day.Weekday())]
	if !plan.Enabled {
		return
	}

	planned := plan.TargetMinutes * 60
	if !report.Schedule.UseTargetOnly {
		workSeconds := max(plan.EndMinute-plan.StartMinute, 0) * 60
		breakSeconds := 0
		for _, b := range plan.Breaks {
			breakSeconds += max(b.DurationMinutes, 0) * 60
		}
		planned = max(workSeconds-breakSeconds, 0)
	}
	report.PlannedWorkSeconds = planned

	base := dayStart(day)
	workWindowStart := base.Add(time.Duration(plan.StartMinute) * time.Minute)
	workWindowEnd := base.Add(time.Duration(plan.EndMinute) * time.Minute)
	insideWork := 0
	insideBreaks := 0
	totalWork := 0

	breakWindows := make([][2]time.Time, 0, len(plan.Breaks))
	for _, br := range plan.Breaks {
		start := base.Add(time.Duration(br.StartMinute) * time.Minute)
		end := start.Add(time.Duration(br.DurationMinutes) * time.Minute)
		breakWindows = append(breakWindows, [2]time.Time{start, end})
	}

	for _, phase := range report.Phases {
		if phase.Phase != "work" {
			continue
		}
		start, err := parseEventTime(phase.Start)
		if err != nil {
			continue
		}
		end, err := parseEventTime(phase.End)
		if err != nil {
			continue
		}
		totalWork += max(phase.ActualSeconds, 0)
		insideWork += overlapSeconds(start, end, workWindowStart, workWindowEnd)
		for _, window := range breakWindows {
			insideBreaks += overlapSeconds(start, end, window[0], window[1])
		}
	}

	// Exclude pause windows from covered work time.
	covered := max(insideWork-insideBreaks, 0)
	report.WorkInBreakSeconds = insideBreaks
	report.AfterHoursSeconds = max(totalWork-covered-insideBreaks, 0)
	if planned > 0 {
		report.CoverageRate = round2(float64(covered) / float64(planned))
	}
}

func overlapSeconds(aStart, aEnd, bStart, bEnd time.Time) int {
	start := maxTime(aStart, bStart)
	end := minTime(aEnd, bEnd)
	if !end.After(start) {
		return 0
	}
	return int(end.Sub(start).Seconds())
}

func maxTime(a, b time.Time) time.Time {
	if a.After(b) {
		return a
	}
	return b
}

func minTime(a, b time.Time) time.Time {
	if a.Before(b) {
		return a
	}
	return b
}

func round2(value float64) float64 {
	return math.Round(value*100) / 100
}
