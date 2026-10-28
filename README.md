# KBS KI-Workshop – Multimedia-Nachmittag

Webanwendung für den Workshop „Digitale Tools & KI“ am Multimedia-Nachmittag der
Karoline-Breitinger-Schule (03.11.2026). Der Laptop am Beamer zeigt Folien und Ergebnisse,
die Kolleginnen und Kollegen machen mit ihrem Smartphone mit. Es muss nichts installiert werden:
Alle scannen einen QR-Code und bleiben die ganze Stunde in derselben Anwendung.

| | Adresse |
|---|---|
| **Handys** (QR-Code) | https://kbs-ki-workshop.klawittersven.workers.dev/ |
| **Beamer** (Lehrkraft, mit PIN) | https://kbs-ki-workshop.klawittersven.workers.dev/beamer |
| Handout mit QR-Code zum Drucken | https://kbs-ki-workshop.klawittersven.workers.dev/handout |

Der QR-Code liegt auch als Bild in `qr/qr-workshop.png` (z. B. für ein eigenes Word-Handout).

## Einrichtung (einmalig)

1. **Mit Cloudflare verbinden** – genauso wie beim Tetris-Turnier: Im Cloudflare-Dashboard unter
   **Workers & Pages** eine neue Anwendung erstellen und dabei das GitHub-Repository
   `kbs-ki-workshop` importieren. Der Name der Anwendung muss **kbs-ki-workshop** lauten (so steht es
   in `wrangler.jsonc`), dann stimmt die Adresse oben. Als Branch den Branch wählen, auf dem der
   aktuelle Stand liegt. Danach geht jede Änderung nach ca. einer Minute automatisch online.
2. **Video hochladen:** Die Datei `MusikVid_6_Schritte_PP_Mariachi.mp4` (19,5 MB) auf GitHub in den
   Ordner `public/video/` hochladen und in **`pflegeprozess.mp4`** umbenennen
   (GitHub → Ordner `public/video` → „Add file“ → „Upload files“). Solange die Datei fehlt, bettet
   der Beamer das Video automatisch aus Google Drive ein (dafür muss die Drive-Freigabe
   „Jeder mit dem Link“ bestehen bleiben).
3. **PIN festlegen:** Beim ersten Öffnen von `/beamer` wird eine Lehrkraft-PIN festgelegt
   (mindestens 4 Zeichen). Der Laptop merkt sich die PIN. Nur mit PIN lassen sich die Bildschirme
   umschalten. *PIN vergessen?* Im Cloudflare-Dashboard bei der Anwendung unter
   Einstellungen → Variablen und Geheimnisse ein Geheimnis (Secret) **`LEHRER_PIN`** mit der neuen PIN anlegen – sie gilt dann statt der alten.
4. **Vor Ort testen** (Raum 446): Seite im Schul-WLAN öffnen, ein, zwei Handys anmelden,
   Ton für den Song prüfen, danach über das Menü ⚙ **alles zurücksetzen**.

## Ablauf der Stunde

Die Lehrkraft steuert alles am Laptop. Die Handys springen automatisch mit.

| # | Beamer | Handys | Knopf am Beamer |
|---|---|---|---|
| 1 | Anmeldung: QR-Code, Anleitung, Namen der Angemeldeten | Vorname, Anfangsbuchstabe Nachname, Passwort | PRÄSENTATIONS-MODUS STARTEN (schaltet auch auf Vollbild) |
| 2 | Folie **„Wünsch dir was!“**: Impulsfrage, dann 9 verdeckte Karten (je eine pro Demo) nach und nach aufdecken | „Präsentations-Modus …“ | AUFDECKEN (n/9), danach NÄCHSTE FOLIE |
| 3 | Folie „Im Anfang war das Wort“ | „Präsentations-Modus …“ | NÄCHSTE FOLIE |
| 4 | Folie Demo 1 (Prompt wird „getippt“) | „Präsentations-Modus …“ | DEMO 1 STARTEN |
| 5 | Balkendiagramm „Wozu nutzt du KI momentan schon?“ | Mehrfachauswahl | UMFRAGE ABSCHLIESSEN |
| 6–7 | Folie Demo 2 → Wortwolke | bis zu 5 Begriffe | DEMO 2 STARTEN / WORTWOLKE ABSCHLIESSEN |
| 8–9 | Folie Demo 3 → **Punktestand** | „Ich habe eine Frage“ / „Ich habe eine Antwort“ | DEMO 3 STARTEN / FORTFAHREN |
| 10–11 | Folie Demo 4 → Lernkarten mit 2-Minuten-Countdown | 15 Lernkarten (Latein → Deutsch) | DEMO 4 STARTEN / ABFRAGEN! |
| 12 | Punktestand (Vokabeln abfragen) | Melde-Knöpfe | FORTFAHREN |
| 13–14 | Folie Demo 5 → KI-Song „Die 6 Schritte im Pflegeprozess“ (Video) | „Präsentations-Modus …“ | DEMO 5 STARTEN / SORTIERAUFGABE! |
| 15 | Sortieraufgabe mit Fortschritt („18 von 25 fertig“) | 6 Schritte des Pflegeprozesses ordnen | PUNKTESTAND |
| 16 | Punktestand | Melde-Knöpfe | FORTFAHREN |
| 17–18 | Folie Demo 6 „unterschiedlichen Sprachen“ → Balken je Sprache (mit Flaggen) und je Niveau, „27 von 30 fertig“ | Text Händehygiene + 3 Fragen in 6 Sprachen × 3 Niveaus, 🔊 Vorlesen | DEMO 6 STARTEN / AUFGABE ABSCHLIESSEN |
| 19–20 | Folie Demo 7 „Grafiken“ → Europakarte, Organe, Skelett mit allen Tipps live (grün/rot) | 9 Tipp-Aufgaben im eigenen Tempo (Länder, Organe, Knochen) | DEMO 7 STARTEN / GRAFIK-QUIZ ABSCHLIESSEN |
| 21–22 | Folie Demo 8 „Gruppenarbeiten“ → **Gruppen einteilen** (Dreiergruppen) | Gruppenfarbe + Tier im Vollbild bzw. Gruppenwahl | DEMO 8 STARTEN / GRUPPENPUZZLE STARTEN |
| 23 | **Gruppenpuzzle** Diabetes als Rennen: Fortschritt jeder Gruppe, Sperren, Plätze | Expertentext A, B oder C + gemeinsame Aufgaben | SIEGEREHRUNG |
| 24 | Siegerehrung der Gruppen (Treppchen) | „Siegerehrung …“ | ZUM PUNKTESTAND |
| 25 | Punktestand | Melde-Knöpfe | FORTFAHREN |
| 26–27 | Folie Demo 9 → Highscore KAROLINE-RUN! | Endless Runner, beliebig viele Runden | DEMO 9 STARTEN / SIEGEREHRUNG |
| 28 | Siegerehrung mit Treppchen und Pokal | „Siegerehrung …“ | ZUM PUNKTESTAND |
| 29 | Punktestand | Melde-Knöpfe | FORTFAHREN |
| 30 | Folie „Und der Prompt für diese ganze Stunde?“ (Auszug aus der Verlaufsbeschreibung) | „Präsentations-Modus …“ | NÄCHSTE FOLIE |
| 31 | Folie **Fragerunde**: Ideen? Probleme lösen? Bedenken? | „Präsentations-Modus …“ | PUNKTESTAND-MODUS |
| 32 | Punktestand der Fragerunde + **FINALEN PUNKTESTAND EXPORTIEREN!** (Excel) | Melde-Knöpfe | FORTFAHREN |
| 33 | Folie „JETZT SEID IHR DRAN!“ mit QR-Code zu claude.ai | „Präsentations-Modus …“ | ALLES ZURÜCKSETZEN FÜR DEN NÄCHSTEN DURCHGANG |

Jede Demo lässt sich jederzeit beenden („weiter“ oder Sprung über das Menü ⚙): Die Handys brechen
die Aufgabe ab, alle bis dahin gesammelten Punkte bleiben erhalten.

Die Punkte erscheinen auf den Handys erst ab Demo 3 – so bleibt die Auflösung („Ihr habt schon
Punkte gesammelt!“) eine Überraschung.

### Bedienung für die Lehrkraft

- **Tasten:** → oder Bild↓ = weiter (auch mit Presenter), ← oder Bild↑ = einen Bildschirm zurück.
- **Menü ⚙** (unten links, halb durchsichtig): zu jedem Bildschirm springen, Vollbild,
  Excel-Export, Handout drucken, Teilnehmende verwalten, ausgeblendete Begriffe wieder zeigen,
  **alles zurücksetzen**.
- **Anmeldung:** Name anklicken → *Passwort zurücksetzen* (die Person vergibt beim nächsten Anmelden
  ein neues) oder *Entfernen*.
- **Folie „Wünsch dir was!“:** Erst die Frage stellen und Antworten aus dem Kollegium sammeln. Dann deckt
  jeder Klick auf den Weiter-Knopf (oder →) die nächste Karte auf; eine bestimmte Karte lässt sich auch direkt
  anklicken, z. B. wenn jemand genau das genannt hat. Erst wenn alle 9 offen sind, geht es zur nächsten Folie.
  Karte 3 bleibt eine „Überraschung“ – der Punktestand wird erst in Demo 3 verraten.
  Rückseiten: 1 Umfragen · 2 Wortwolke · 3 Überraschung · 4 Lernkarten · 5 Lernsongs · 6 Sprachen · 7 Grafiken ·
  8 Gruppen · 9 Lernspiele.
- **Wortwolke:** Ein Wort anklicken blendet es aus (die 10 Punkte dafür werden abgezogen).
- **Punktestand:** Namen anklicken = aufrufen. Dann Punkte vergeben (0, 10, 25, 50, 75, 100 oder
  eigene Zahl) oder *Abbrechen*. Hat die Person eine **Frage** (rot), gibt es keine Punkte, sondern
  nur **„Frage beantwortet“** – das beendet den roten Status (das Handy zeigt „Deine Frage wurde
  beantwortet“). Wer doch etwas beigetragen hat: „Stattdessen Punkte für eine Antwort geben“. *Zufällig aufrufen* wählt nur unter den gerade verbundenen Handys
  (bei „NUR MIT MELDUNG“ unter denen mit grüner Antwort-Meldung). *Rückgängig* nimmt die letzte
  Punktvergabe zurück. Nach einer Vergabe wird die Meldung der Person gelöscht.
- **Video:** Der Beamer lädt das Video gleich nach dem Öffnen (nach der PIN) im Hintergrund komplett
  herunter – unten auf dem Anmeldebildschirm steht „Video wird vorgeladen … %“ bzw. „Video vorgeladen ✓“.
  In Demo 5 läuft es dann sofort. Bei schlechtem Internet: Video vorher auf dem Laptop speichern
  (z. B. im Ordner „Videos“) und am Video-Bildschirm oder im Menü ⚙ auf **„📁 Video vom Laptop öffnen“** klicken.
- **Demo 6 (Sprachen):** Jede*r wählt am Handy Sprache und Niveau und kann jederzeit wechseln – die
  Antworten bleiben erhalten. Das Handy schlägt die eigene Gerätesprache vor. „🔊 Vorlesen“ nutzt die
  Vorlesestimme des Handys; fehlt sie für eine Sprache (z. B. Ukrainisch auf manchen Android-Geräten),
  erscheint ein Hinweis. Die Übersetzungen sind maschinell erstellt.
- **Demo 7 (Grafiken):** Jede Aufgabe hat 2 Versuche. Nach einem Fehltipp steht „Daneben – das ist …“,
  nach dem zweiten wird die richtige Stelle grün gezeigt. Am Beamer erscheinen alle Tipps als Punkte.
- **Demo 8 (Gruppen):** *Zufällig einteilen* bildet Dreiergruppen aus allen verbundenen Handys
  (geht es nicht auf, gibt es Vierergruppen). *Selbst wählen lassen*: Die Handys zeigen die Gruppen,
  volle Gruppen sind gesperrt; danach verteilt *Rest zufällig verteilen* alle, die noch keine Gruppe haben.
  Einen **Namen anklicken** schiebt die Person in die nächste Gruppe. Wer später kommt, landet
  automatisch in der kleinsten Gruppe.
- **Gruppenpuzzle:** Jede Person bekommt einen Expertentext (A Blutzucker, B Insulin, C Ernährung &
  Bewegung; in Zweiergruppen hat eine Person zwei Texte). Erst lesen alle und tippen „Text gelesen ✓“,
  dann lösen sie 3 Abschnitte mit je 2 Fragen, die nur mit allen Texten lösbar sind. Ein Abschnitt wird
  erst geprüft, wenn alle abgegeben haben; ist irgendwo etwas falsch, sieht die Gruppe nur „noch falsch“
  (nicht wer) und ist 15 Sekunden gesperrt. Ist ein Handy länger als 30 Sekunden getrennt, sieht der
  Rest der Gruppe dessen Text und kommt ohne die Person weiter. Alle Gruppen haben dieselben Aufgaben –
  wer zuerst fertig ist, gewinnt. *Fachlich:* Werte und Empfehlungen vor dem Einsatz im Unterricht prüfen.
- **Zurücksetzen** löscht alle Namen, Passwörter und Punkte und meldet alle Handys ab. Wurde noch
  nicht exportiert, fragt die Anwendung vorher nach. Die PIN bleibt erhalten.

### Punkte

| Aufgabe | Punkte |
|---|---|
| Demo 1: Abstimmung | 1 je gewählter Antwort |
| Demo 2: Wortwolke | 10 je Begriff (ausgeblendete zählen nicht) |
| Sortieraufgabe | 10 je richtig eingeordnetem Schritt, −10 je falscher Zahl, nie unter 0 (fehlerfrei = 60) |
| Demo 6: Sprachen | 10 je Frage, die beim ersten Versuch stimmt (höchstens 30) |
| Demo 7: Grafiken | 10 für einen Treffer beim ersten, 5 beim zweiten Versuch (höchstens 90) |
| Demo 8: Gruppenpuzzle | jede Person der Gruppe: Platz 1 = 50, Platz 2 = 40, Platz 3 = 30, alle anderen fertigen Gruppen 20 |
| Punktestand | 0–100 je Vergabe durch die Lehrkraft |
| KAROLINE-RUN! | zählt nur für die Spiel-Highscore, nicht für den Punktestand |

Die Excel-Datei enthält Platz, Name, Gesamtpunkte, die Punkte je Aufgabe und die Spiel-Highscore.

### Für die Teilnehmenden

Browser versehentlich geschlossen oder Verbindung weg? Einfach den QR-Code erneut scannen – das
Handy meldet sich automatisch wieder an und springt in den aktuellen Bildschirm. Auf einem anderen
Gerät genügen Name und Passwort; der Punktestand bleibt erhalten. Klappt die Dauerverbindung im
WLAN nicht, wechselt das Handy von selbst auf regelmäßige Abfragen (etwas langsamer, sonst gleich).

## Zuschauer-Link (Vorführung aus der Ferne)

Für jemanden, der nicht im Raum ist (z. B. per Telefon zugeschaltet): Im Menü ⚙ unter
**Zuschauer-Link** auf **„👁 Zuschauer-Link erstellen“** klicken, dann **„📋 Link kopieren“** und den
Link z. B. per Messenger oder E-Mail schicken.

- Wer den Link öffnet, sieht die Beamer-Ansicht live mit – **ohne PIN und ohne Steuerung**
  (keine Knöpfe, kein Menü, Klicks auf Namen oder Wörter bewirken nichts). Oben steht „Zuschauer-Ansicht“,
  unten rechts gibt es einen Vollbild-Knopf.
- Mitmachen geht wie im Raum: den QR-Code auf der eigenen Zuschauer-Ansicht mit dem Handy scannen.
- Das Video startet bei Zuschauern nicht automatisch mit – dort selbst auf Play drücken.
- Im Menü steht, wie viele Zuschauer gerade verbunden sind.
- Der Link gilt **bis zum Zurücksetzen**. „Neuen Link erstellen“ oder „Zuschauer-Link löschen“ macht
  den alten sofort ungültig; Zuschauer sehen dann „Dieser Zuschauer-Link ist nicht (mehr) gültig“.
- Zuschauer sehen alle Namen und Punkte auf dem Bildschirm – den Link also nur gezielt weitergeben.

## Datenschutz

- Gespeichert werden nur Vorname, Anfangsbuchstabe des Nachnamens, Passwort (nur als Prüfsumme,
  nicht im Klartext) und die Punkte – im Speicher der Anwendung bei Cloudflare.
  **Zurücksetzen löscht alles.** Die Excel-Datei entsteht nur auf dem Laptop der Lehrkraft.
- Keine Cookies, keine Analyse, keine fremden Schriften oder Skripte. Einzige Ausnahme: Solange
  das Video nicht hochgeladen ist, wird es aus Google Drive eingebettet (nur am Beamer).
- Die Handy-Seite merkt sich die Anmeldung im Browser (für den automatischen Wiedereinstieg).

## Inhalte ändern

| Was | Wo |
|---|---|
| Ablauf, Umfrage-Frage und -Antworten, Lernkarten, Schritte der Sortieraufgabe, Punktwerte | `public/js/gemeinsam.js` |
| Folientexte und Prompts der Demos, Impulsfrage und Karten der Folie „Wünsch dir was!“ (`WUNSCH`), Auszug auf der Folie „Und der Prompt?“, Countdown-Dauer | `public/js/beamer.js` (oben) |
| Texte der Handy-Seite | `public/js/handy.js` |
| Demo 6: Text, Fragen und Übersetzungen (6 Sprachen × 3 Niveaus) | `public/js/inhalte-sprachen.js` |
| Demo 7: Tipp-Aufgaben | `public/js/gemeinsam.js` (`GRAFIK_AUFGABEN`); Körper und Skelett in `public/js/grafik-koerper.js` |
| Demo 8: Fall, Expertentexte, Fragen und Abschnitte des Gruppenpuzzles; Gruppennamen | `public/js/inhalte-puzzle.js`; `public/js/gemeinsam.js` (`GRUPPEN`) |
| Spieltexte KAROLINE-RUN! | `public/spiel/spiel.js` (oben) |

## Technik

```
worker/index.js        Cloudflare Worker + Durable Object „Workshop“ (Speicher, Verbindungen)
worker/logik.js        Spielregeln: Anmeldung, Punkte, Ansichten (ohne Cloudflare-Bezug)
public/index.html      Handy-Seite          → js/handy.js, css/handy.css
public/beamer.html     Beamer-Seite         → js/beamer.js, css/beamer.css
public/handout.html    Handout mit QR-Code zum Drucken
public/js/             gemeinsam.js, verbindung.js (WebSocket + Reserve), wortwolke.js, export.js (Excel),
                       inhalte-sprachen.js, inhalte-puzzle.js, grafik-koerper.js, grafik-europa.js (Karte)
public/spiel/          KAROLINE-RUN! (aus „Diabetes Run!“ der Lernkarten übernommen)
public/video/          hier gehört pflegeprozess.mp4 hin
public/vendor/         qrcode.min.js (MIT-Lizenz)
tests/                 automatischer Gesamttest
werkzeuge/             europakarte.mjs: erzeugt public/js/grafik-europa.js
```

Die Europakarte stammt aus **Natural Earth** (gemeinfrei), aufbereitet im npm-Paket „world-atlas“
(ISC-Lizenz); die Krim ist der Ukraine zugeordnet. Neu erzeugen: `cd werkzeuge && npm install && node europakarte.mjs`.
Körper und Skelett sind selbst gezeichnete, vereinfachte Schemazeichnungen.

Der gesamte Zustand liegt in einem Durable Object (kostenloser Tarif). Beamer und Handys sind per
WebSocket verbunden und bekommen nach jeder Änderung ihre aktuelle Ansicht; Handys ohne WebSocket
fragen alle 1,5 Sekunden per HTTP nach.

## Tests

```
cd tests
npm install                      # installiert wrangler (lokaler Cloudflare-Server) und Playwright
npx playwright install chromium
node ablauf.test.js              # ganze Stunde mit 30 simulierten Handys (~5 Minuten); TN=12 für weniger
```

Der Test startet den Workshop lokal mit leerem Speicher und prüft u. a.: PIN, Anmeldung mit
30 Handys (eines im Reserve-Modus), falsches Passwort, Wiedereinstieg, alle Demos, Punkteberechnung,
Zufallsauswahl, Rückgängig, Sprachen und Niveaus, Tipp-Aufgaben auf Karte und Körper, Gruppeneinteilung
(selbst wählen, volle Gruppe gesperrt, Rest zufällig, Namen verschieben), Gruppenpuzzle mit falscher
Abgabe (Sperre), ausgefallenem Handy (Text freigegeben) und Plätzen, Excel-Export und Zurücksetzen. Bildschirmfotos liegen in `tests/ergebnisse/`.

© 2026 Sven Klawitter
