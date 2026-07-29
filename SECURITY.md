# Sicherheitshinweise

## Unterstützte Versionen

Sicherheitskorrekturen gibt es nur für das jeweils neueste Release. Ältere
Versionen werden nicht nachgepflegt.

## Eine Lücke melden

Bitte **kein öffentliches Issue** anlegen. Nutze stattdessen die private
Meldefunktion von GitHub:

<https://github.com/sebastian-x86/t1mat0/security/advisories/new>

Hilfreich sind: betroffene Version, Betriebssystem, Schritte zum Nachstellen
und die Auswirkung. Du bekommst innerhalb von 14 Tagen eine Rückmeldung.

t1mat0 ist ein Freizeitprojekt ohne bezahlte Wartung, ein Bug-Bounty gibt es
nicht.

## Angriffsfläche

Die App läuft lokal, hat keinen Netzwerkzugriff und keine Benutzerkonten.
Sicherheitsrelevant sind vor allem:

- die Einstellungsdatei `settings.json` im Konfigurationsverzeichnis des
  Nutzers, die beim Start eingelesen wird,
- die WebView, in der das Frontend läuft,
- die veröffentlichten Release-Artefakte, die aktuell **nicht signiert** sind.
