package main

import "testing"

func TestNormalizeLanguage(t *testing.T) {
	cases := map[string]string{
		"de-DE":       LangGerman,
		"de_DE.UTF-8": LangGerman,
		"DE":          LangGerman,
		"en-US":       LangEnglish,
		"fr-FR":       LangEnglish,
		"":            LangEnglish,
		"  de-AT  ":   LangGerman,
	}
	for locale, want := range cases {
		if got := normalizeLanguage(locale); got != want {
			t.Errorf("normalizeLanguage(%q) = %q, want %q", locale, got, want)
		}
	}
}

func TestResolveLanguageHonoursExplicitChoice(t *testing.T) {
	if got := ResolveLanguage(LangGerman); got != LangGerman {
		t.Errorf("explicit German resolved to %q", got)
	}
	if got := ResolveLanguage(LangEnglish); got != LangEnglish {
		t.Errorf("explicit English resolved to %q", got)
	}
	if got := ResolveLanguage(LangAuto); got != LangGerman && got != LangEnglish {
		t.Errorf("auto resolved to unsupported language %q", got)
	}
}

func TestPhaseLabelIn(t *testing.T) {
	if got := PhaseLabelIn(LangGerman, PhaseWork); got != "Arbeit" {
		t.Errorf("German work label = %q", got)
	}
	if got := PhaseLabelIn(LangEnglish, PhaseLongBreak); got != "Long Break" {
		t.Errorf("English long break label = %q", got)
	}
	// Unknown languages fall back to English rather than showing the key.
	if got := PhaseLabelIn("fr", PhaseShortBreak); got != "Short Break" {
		t.Errorf("fallback label = %q", got)
	}
}
