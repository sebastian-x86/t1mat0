# Mitmachen

Danke fürs Interesse! Das Projekt ist klein, die Regeln sind es auch.

## Voraussetzungen

Siehe [README → Quickstart](README.md#quickstart). Kurz: Go, Node 20+ und die
Wails CLI.

## Vor dem Commit

```bash
go test ./...                 # Go-Logik
golangci-lint run --build-tags webkit2_41 ./...

cd frontend
npm test                      # Zeitlogik der Oberfläche
npx tsc --noEmit
npm run lint                  # oxlint inkl. React-Hooks-Regeln
npm run format:check          # Prettier; `npm run format` korrigiert
```

Die CI prüft dasselbe und lässt die Abdeckung nicht unter 70 % fallen.
Einrückung und Zeilenenden regelt die `.editorconfig`: vier Leerzeichen,
Tabs in Go, LF überall.

## Commit-Nachrichten: Conventional Commits

Jede Nachricht folgt dem Schema `<typ>(<scope>): <beschreibung>`, im Imperativ
und klein geschrieben:

```
feat(timer): add a doze animation while paused
fix(settings): keep boolean defaults when keys are missing
docs: describe the keyboard shortcuts
```

Erlaubte Typen: `feat`, `fix`, `perf`, `refactor`, `docs`, `test`, `build`,
`ci`, `chore`, `style`, `revert`.

Das ist keine Kosmetik: **release-please** liest diese Nachrichten und leitet
daraus die nächste Version ab.

| Commit | Effekt auf die Version |
| --- | --- |
| `fix:` | Patch (0.1.0 → 0.1.1) |
| `feat:` | Minor (0.1.1 → 0.2.0) |
| `feat!:` oder Footer `BREAKING CHANGE:` | Major (0.2.0 → 1.0.0) |
| `docs:`, `test:`, `chore:` … | keine Version, erscheint höchstens im Changelog |

Solange die Version unter `1.0.0` liegt, wird ein Breaking Change als Minor
gezählt — so sieht es SemVer für die Nullerserie vor.

`commitlint` prüft das in der CI. Ein kaputter Betreff lässt den Build
fehlschlagen.

## Branch und Pull Requests

`main` ist geschützt: kein direkter Push, kein Force-Push, kein Löschen — auch
nicht für Administratoren. Jede Änderung läuft über einen Pull Request, der
grüne CI braucht (Commit-Nachrichten, Go-Tests, Frontend-Tests). Reviews sind
nicht vorgeschrieben, ein Selbst-Merge nach grüner CI ist also in Ordnung.

```bash
git switch -c feat/kurze-beschreibung
# ... arbeiten, committen ...
git push -u origin HEAD
gh pr create --fill
gh pr merge --squash --delete-branch    # sobald die CI grün ist
```

Die Historie bleibt linear (Squash oder Rebase, kein Merge-Commit).

## Release-Ablauf

1. Commits landen auf `main`.
2. release-please öffnet oder aktualisiert automatisch eine Release-PR mit
   Versionsbump und Changelog.
3. Wird diese PR gemergt, entsteht das Tag `vX.Y.Z` samt GitHub-Release.
4. Der Release-Workflow baut daraufhin die Binaries für Windows und macOS und
   hängt sie an das Release.

Niemand vergibt Versionsnummern von Hand.

## Code-Stil

- Go: `gofmt`, sprechende Namen, Kommentare erklären das *Warum*.
- TypeScript/React: vier Leerzeichen Einrückung, Funktionskomponenten.
- Neue Nutzertexte immer in **beiden** Sprachen ergänzen
  (`frontend/src/i18n.ts` und, falls Tray oder Benachrichtigung betroffen,
  `internal/i18n/i18n.go`).
- Bedienelemente brauchen `title` und, wenn sie nur ein Icon zeigen,
  zusätzlich `aria-label`.
- Neue Animationen müssen `prefers-reduced-motion` respektieren.

## Lizenz

Beiträge stehen unter der [GPL-3.0](LICENSE), wie das übrige Projekt.
