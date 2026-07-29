<!--
Der Titel dieses PRs wird beim Squash-Merge zur Commit-Zeile auf main und muss
deshalb den Conventional Commits folgen, z. B. `fix(timer): stop the tick after
the last phase`.
-->

## Warum

<!-- Was war das Problem? Die Änderung selbst steht im Diff. -->

## Geprüft

- [ ] `go test ./...`
- [ ] `cd frontend && npx tsc --noEmit && npm test`
- [ ] `wails build` läuft und die App startet
- [ ] Neue Nutzertexte sind in `frontend/src/i18n.ts` auf Deutsch **und**
      Englisch ergänzt
- [ ] Neue Bedienelemente haben `aria-label` bzw. `title`

Closes #
