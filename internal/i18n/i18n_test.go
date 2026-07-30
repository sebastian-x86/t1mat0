package i18n

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
	if got := Resolve(LangGerman); got != LangGerman {
		t.Errorf("explicit German resolved to %q", got)
	}
	if got := Resolve(LangEnglish); got != LangEnglish {
		t.Errorf("explicit English resolved to %q", got)
	}
	if got := Resolve(LangAuto); got != LangGerman && got != LangEnglish {
		t.Errorf("auto resolved to unsupported language %q", got)
	}
}

func TestTranslateFallsBackToEnglish(t *testing.T) {
	if got := T(LangGerman, "notify.showWindow"); got != "Fenster zeigen" {
		t.Errorf("German lookup returned %q", got)
	}
	if got := T(LangEnglish, "notify.showWindow"); got != "Show the window" {
		t.Errorf("English lookup returned %q", got)
	}
	if got := T("fr", "notify.showWindow"); got != "Show the window" {
		t.Errorf("unknown language should fall back to English, got %q", got)
	}
	if got := T(LangGerman, "does.not.exist"); got != "does.not.exist" {
		t.Errorf("unknown key should return itself, got %q", got)
	}
}
