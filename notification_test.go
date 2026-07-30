package main

import (
	"strings"
	"testing"

	"t1m/internal/i18n"
	"t1m/internal/timer"
)

func TestNoticeForWorkPhaseShowsTheHarvest(t *testing.T) {
	state := timer.State{
		Language:           i18n.LangGerman,
		PhaseLabel:         "Kurze Pause",
		FormattedRemaining: "05:00",
		Harvest:            timer.Harvest{Tomatoes: 3, Streak: 3},
	}

	n := noticeFor(state, timer.PhaseWork)

	if n.CategoryID != categoryWorkDone {
		t.Fatalf("expected the work category, got %q", n.CategoryID)
	}
	if !strings.HasPrefix(n.Title, "🍅 ") {
		t.Fatalf("expected a tomato in the title, got %q", n.Title)
	}
	for _, want := range []string{"3 Tomaten", "Serie 3", "Als Nächstes: Kurze Pause (05:00)"} {
		if !strings.Contains(n.Body, want) {
			t.Fatalf("expected %q in the body, got %q", want, n.Body)
		}
	}
}

func TestNoticeForFirstTomatoStaysSingular(t *testing.T) {
	state := timer.State{
		Language:           i18n.LangEnglish,
		PhaseLabel:         "Short break",
		FormattedRemaining: "05:00",
		Harvest:            timer.Harvest{Tomatoes: 1, Streak: 1},
	}

	n := noticeFor(state, timer.PhaseWork)

	if !strings.HasPrefix(n.Body, "Tomato harvested") {
		t.Fatalf("expected the singular wording, got %q", n.Body)
	}
	if strings.Contains(n.Body, "Streak") {
		t.Fatalf("a streak of one is not worth mentioning, got %q", n.Body)
	}
}

func TestNoticeForBreakPhaseOffersToResume(t *testing.T) {
	state := timer.State{
		Language:           i18n.LangEnglish,
		PhaseLabel:         "Work",
		FormattedRemaining: "25:00",
		Harvest:            timer.Harvest{Tomatoes: 2},
	}

	n := noticeFor(state, timer.PhaseLongBreak)

	if n.CategoryID != categoryBreakDone {
		t.Fatalf("expected the break category, got %q", n.CategoryID)
	}
	if !strings.HasPrefix(n.Title, "🌴 ") {
		t.Fatalf("expected a palm in the title, got %q", n.Title)
	}
	if strings.Contains(n.Body, "harvested") {
		t.Fatalf("a break earns nothing, got %q", n.Body)
	}
	if n.Body != "Next up: Work (25:00)" {
		t.Fatalf("unexpected body %q", n.Body)
	}
}
