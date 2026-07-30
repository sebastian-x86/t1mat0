package timer

// Harvest is the little gamification layer: every work phase that runs out on
// its own earns a tomato. Skipping or resetting squashes the current streak,
// so the number rewards actually sitting the phase out.
type Harvest struct {
	Tomatoes   int `json:"tomatoes"`
	Streak     int `json:"streak"`
	BestStreak int `json:"bestStreak"`
}
