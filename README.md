# t1mat0 — Pomodoro Timer

**t1mat0** ist ein kleiner Desktop-Pomodoro-Timer, der die verbleibende Zeit
nicht nur als Zahl zeigt, sondern als Tomate, die sich langsam in ein Glas
entleert — Tray, Desktop-Benachrichtigungen, Always-on-Top und Sound inklusive.

Ausgesprochen wird der Name wie das englische *tomato*: **[tə-ˈmaa-toh]**
(IPA: `/təˈmɑːtəʊ/`), also „te-MAA-toh" — die `1` und die `0` sind nur Leetspeak
für `i` und `o`. Die Binary heißt kurz `t1m` („tim").

In der Mitte des Fensters läuft eine Tomate über die Dauer der Phase langsam
leer und tropft in ein Glas darunter, das sich im gleichen Maß füllt — die
Restzeit ist damit auch ohne Blick auf die Uhr ablesbar. Die Farbe folgt der
aktuellen Phase (rot = Arbeit, grün = kurze Pause, blau = lange Pause).

Der Name ist eine Kreuzung aus *timer* und *tomato* — die Tomate ist das
Namensgebende der Pomodoro-Technik.

**Stack:** Go (Timer-Logik, native Integrationen) + React/TypeScript (UI), gebaut mit [Wails v2](https://wails.io).
**Zielplattformen:** Windows und macOS. Linux funktioniert zum Entwickeln, aber ohne Tray (siehe [Plattform-Unterschiede](#plattform-unterschiede)).

## Quickstart

### 1. Voraussetzungen

- **Go** 1.22+ (Wails lädt die benötigte Toolchain automatisch nach)
- **Node.js** 20+
- **Wails CLI**:
  ```bash
  go install github.com/wailsapp/wails/v2/cmd/wails@latest
  ```
  Die CLI liegt danach unter `~/go/bin/wails`. Wenn `~/go/bin` nicht in `$PATH`
  ist, ruf sie mit dem vollen Pfad auf (wie unten gezeigt).

**Zusätzlich unter Linux** (Ubuntu 24.04) für den Webview:

```bash
sudo apt install -y libgtk-3-dev libwebkit2gtk-4.1-dev
```

### 2. App starten

```bash
cd ~/git/t1mat0

# WSL2 (empfohlen): als native Windows-App bauen und starten
~/go/bin/wails build -platform windows/amd64 && ./build/bin/t1m.exe

# Linux / WSLg (braucht den webkit2_41 Tag)
~/go/bin/wails dev -tags webkit2_41

# Windows / macOS
~/go/bin/wails dev
```

`wails dev` startet die App mit Hot Reload: Änderungen an der React-UI sind
sofort sichtbar, Änderungen am Go-Code lösen einen Neustart aus.
Beenden mit `Ctrl+C`.

### 3. Ohne GUI testen

Die Timer-Logik ist reines Go und hat keine GUI-Abhängigkeiten — die Tests
laufen also auch ohne die apt-Pakete oben:

```bash
go test ./...
```

## Bedienung

| Aktion | Fenster | Tray (Windows/macOS) |
| --- | --- | --- |
| Start / Pause | Button `Start` / `Pause` | Menüeintrag |
| Zurücksetzen | Button `Reset` | Menüeintrag |
| Phase überspringen | Button `Skip` | Menüeintrag |
| Always on Top | Checkbox | Checkbox |
| Sound an/aus | Checkbox | Checkbox |
| Zeiten ändern | Zahnrad rechts oben | — |
| Fenster ein-/ausblenden | — | `Show / Hide` |
| Beenden | — | `Quit` |

### Tastatur

Alle Bedienelemente sind per `Tab` erreichbar und mit `Enter`/`Space`
auslösbar; der Fokus ist sichtbar umrandet.

| Taste | Aktion |
| --- | --- |
| `Ctrl` + `,` | Einstellungen öffnen/schließen |
| `F1` | Kurzbefehl-Übersicht |
| `F2` | Dauer der aktuellen Phase bearbeiten |
| `Esc` | Schließen bzw. Eingabe abbrechen |

Zusätzlich gibt es Ein-Tasten-Kürzel (aktiv, solange nicht in ein Eingabefeld
getippt wird):

| Taste | Aktion |
| --- | --- |
| `Space` / `K` | Start / Pause |
| `R` | Phase zurücksetzen |
| `N` / `S` | Phase überspringen |
| `E` | Dauer der aktuellen Phase bearbeiten |
| `,` | Einstellungen öffnen/schließen |
| `?` | Kurzbefehl-Übersicht |

Diese Buchstaben-Kürzel lassen sich in den Einstellungen über
**Single-key shortcuts** abschalten — WCAG 2.1 SC 2.1.4 verlangt das, weil
Sprachsteuerung und Screenreader einzelne Buchstaben ungewollt auslösen. Die
Kürzel mit `Ctrl` bzw. `F1`/`F2` bleiben davon unberührt.

Für Screenreader meldet eine Live-Region Phase, Status und Restzeit; die
Fortschrittsleiste ist als `progressbar` ausgezeichnet, die Animationen sind
als dekorativ ausgeblendet und respektieren `prefers-reduced-motion`.

## Sprache

Die Oberfläche, das Tray-Menü und die Benachrichtigungen gibt es auf **Deutsch
und Englisch**. Standardmäßig richtet sich die App nach der Sprache des
Betriebssystems (`GetUserDefaultLocaleName` unter Windows, `LC_ALL`/`LANG` sonst)
— alles, was mit `de` beginnt, ergibt Deutsch, alles andere Englisch.

Im Zahnrad-Menü lässt sich das über **Sprache / Language** überschreiben:
`Automatisch (System)`, `Deutsch` oder `English`. Die Wahl landet als
`language` in der `settings.json` und wirkt sofort, auch im Tray.

## Tomaten sammeln

Rechts oben zeigt ein kleines HUD eine Tomate mit der Anzahl der geernteten
Tomaten — wie Münzen oder Sterne in einem Jump'n'Run. Eine Tomate gibt es
**nur**, wenn eine Arbeitsphase von selbst ausläuft:

- `Skip` in einer Arbeitsphase zermatscht die Tomate: die **Serie** fällt auf
  null, die bereits gesammelten Tomaten bleiben erhalten.
- `Reset` beendet die Serie ebenfalls.
- Ab zwei Phasen in Folge erscheint ein `n× streak`-Badge, die Bestmarke wird
  mitgeführt (Tooltip).

Gespeichert wird das in `harvest.json` neben der `settings.json` (bzw. im
portablen Modus neben der Binary).

## Entwicklung unter WSL2

Das Projekt lässt sich vollständig aus WSL2 heraus bauen und starten. Es gibt
zwei Wege — der zweite ist der bessere:

### Variante A: Linux-App über WSLg

```bash
sudo apt install -y libgtk-3-dev libwebkit2gtk-4.1-dev
~/go/bin/wails dev -tags webkit2_41
```

Das Fenster erscheint über WSLg. Gut für UI-Arbeit mit Hot Reload,
**aber ohne Tray und ohne Benachrichtigungen** (WSLg hat weder System-Tray noch
einen D-Bus-Notification-Daemon).

### Variante B: Windows-App aus WSL bauen und starten (empfohlen)

```bash
~/go/bin/wails build -platform windows/amd64
./build/bin/t1m.exe
```

Dank WSL-Interop startet die `.exe` direkt als **native Windows-App** — mit
Tray-Icon, Windows-Benachrichtigungen und Always-on-Top. Das ist der
realistischste Test, weil Windows eine der Zielplattformen ist.

Tipp: Läuft spürbar schneller, wenn die Exe im Windows-Dateisystem liegt:

```bash
cp build/bin/t1m.exe /mnt/c/temp/ && /mnt/c/temp/t1m.exe
```

## Bauen

```bash
# Windows portable .exe (funktioniert auch als Cross-Build von Linux aus)
~/go/bin/wails build -platform windows/amd64

# macOS App Bundle — muss auf einem Mac gebaut werden (cgo/Cocoa nötig)
~/go/bin/wails build -platform darwin/universal

# Linux (lokal)
~/go/bin/wails build -tags webkit2_41
```

Artefakte landen unter `build/bin/`.

Die Windows-`.exe` ist eine einzelne, eigenständige Datei (~12 MB) und läuft
**ohne Installation**.

## Portable Modus

Standardmäßig liegen die Einstellungen im User-Config-Verzeichnis
(z. B. `~/.config/t1mat0/settings.json`).

Legt man eine leere Datei **`portable.txt` neben die Exe**, speichert die App
ihre `settings.json` stattdessen im selben Ordner — damit ist sie komplett
self-contained, z. B. für einen USB-Stick.

## Plattform-Unterschiede

| Feature | Windows | macOS | Linux (nativ) | WSL2 / WSLg |
| --- | --- | --- | --- | --- |
| Timer, Settings, Persistenz | ✅ | ✅ | ✅ | ✅ |
| Desktop-Benachrichtigungen | ✅ | ✅ | ✅ (D-Bus) | ❌ (kein Daemon) |
| Always on Top | ✅ | ✅ | ✅ | ⚠️ compositor-abhängig |
| Sound bei Phasenwechsel | ✅ | ✅ | ✅ | ✅ (PulseAudio) |
| Tray-Icon mit Menü | ✅ | ✅ | ❌ | ❌ |
| Schließen minimiert in Tray | ✅ | ✅ | ❌ (beendet) | ❌ (beendet) |

Linux ist bewusst nur Entwicklungsplattform: Das Tray-Menü ist über Build-Tags
auf Windows/macOS beschränkt (`tray_desktop.go` vs. `tray_stub.go`).
Unter WSL2 daher am besten die Windows-Exe testen (siehe
[Entwicklung unter WSL2](#entwicklung-unter-wsl2)).

## Einstellungen

Die Einstellungen stecken hinter dem roten Zahnrad oben rechts: Dauern,
Long-Break-Intervall, Always on Top und Sound. Die Restzeit lässt sich auch
direkt anklicken und im Uhrenfeld überschreiben.

| Einstellung | Default | Bedeutung |
| --- | --- | --- |
| `workSeconds` | 1500 | Dauer einer Arbeitsphase (Sekunden) |
| `shortBreakSeconds` | 300 | Dauer der kurzen Pause (Sekunden) |
| `longBreakSeconds` | 900 | Dauer der langen Pause (Sekunden) |
| `longBreakEvery` | 4 | Nach wie vielen Arbeitsphasen die lange Pause kommt |
| `language` | "auto" | Sprache: `auto` (vom System), `de` oder `en` |
| `alwaysOnTop` | false | Fenster immer im Vordergrund |
| `soundEnabled` | true | Chime bei Phasenwechsel |
| `singleKeyShortcuts` | true | Ein-Tasten-Kürzel (`Space`, `R`, `N`, …) aktiv |
| `autoStartNext` | true | Nächste Phase automatisch starten |

Die Dauern werden in Sekunden gespeichert, damit auch Zeiten unter einer
Minute möglich sind. Im Einstellungsdialog kann man sie als `mm:ss` (`0:30`),
mit Sekunden-Suffix (`45s`) oder als blanke Minutenzahl (`25`) eingeben.
Alle Zeitwerte werden im Backend validiert (1 Sekunde bis 600 Minuten).

Ältere `settings.json` mit `workMinutes`/`shortBreakMinutes`/`longBreakMinutes`
werden beim Laden automatisch auf Sekunden migriert.

## Icon

App-, Taskleisten- und Tray-Icon sind eine gerenderte Tomate. Die Dateien
`build/appicon.png` und `build/windows/icon.ico` werden erzeugt von:

```bash
go run ./tools/icongen build/appicon.png build/windows/icon.ico
```

## Projektstruktur

```
timer.go               Pomodoro-Zustandsmaschine (pure Go, unit-getestet)
timer_test.go          Tests der Timer-Logik
settings.go            Laden/Speichern der Settings, Portable-Erkennung
app.go                 Wails-Bindings, Ticker, Notifications, Fenstersteuerung
main.go                Wails-App-Konfiguration
tray_desktop.go        Tray-Menü (Windows/macOS, fyne.io/systray)
tray_icon_windows.go   Tray-Icon für Windows (.ico)
tray_icon_darwin.go    Tray-Icon für macOS (.png)
tray_stub.go           No-op-Tray für alle anderen Plattformen
wails.json             Wails-Projektkonfiguration
build/                 Icons, Installer-Vorlagen, Build-Artefakte
frontend/src/          React-UI (App.tsx, App.css, sound.ts)
frontend/wailsjs/      Generierte Go-Bindings (nicht manuell bearbeiten)
```

Nach Änderungen an den öffentlichen Methoden von `App` die Bindings neu
generieren:

```bash
~/go/bin/wails generate module
```
