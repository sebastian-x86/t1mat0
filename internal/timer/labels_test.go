package timer

import (
	"testing"

	"t1m/internal/i18n"
)

func TestPhaseLabelIn(t *testing.T) {
	if got := PhaseLabelIn(i18n.LangGerman, PhaseWork); got != "Arbeit" {
		t.Errorf("German work label = %q", got)
	}
	if got := PhaseLabelIn(i18n.LangEnglish, PhaseLongBreak); got != "Long Break" {
		t.Errorf("English long break label = %q", got)
	}
	// Unknown languages fall back to English rather than showing the key.
	if got := PhaseLabelIn("fr", PhaseShortBreak); got != "Short Break" {
		t.Errorf("fallback label = %q", got)
	}
}
