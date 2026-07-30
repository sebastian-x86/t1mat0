package timer

// Harvest is the little gamification layer: every work phase that runs out on
// its own earns a tomato. Skipping or resetting squashes the current streak,
// so the number rewards actually sitting the phase out.
type Harvest struct {
	// Tomatoes is today only. It resets at local day change.
	Tomatoes int `json:"tomatoes"`
	// Total is the lifetime count across all days.
	Total int `json:"total"`
	// Day is local YYYY-MM-DD of the current Tomatoes counter.
	Day        string `json:"day"`
	Streak     int    `json:"streak"`
	BestStreak int    `json:"bestStreak"`
}
