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
| 2 | Folie „Im Anfang war das Wort“ | „Präsentations-Modus …“ | NÄCHSTE FOLIE |
| 3 | Folie Demo 1 (Prompt wird „getippt“) | „Präsentations-Modus …“ | DEMO 1 STARTEN |
| 4 | Balkendiagramm „Wozu nutzt du KI momentan schon?“ | Mehrfachauswahl | UMFRAGE ABSCHLIESSEN |
| 5–6 | Folie Demo 2 → Wortwolke | bis zu 5 Begriffe | DEMO 2 STARTEN / WORTWOLKE ABSCHLIESSEN |
| 7–8 | Folie Demo 3 → **Punktestand** | „Ich habe eine Frage“ / „Ich habe eine Antwort“ | DEMO 3 STARTEN / FORTFAHREN |
| 9–10 | Folie Demo 4 → Lernkarten mit 2-Minuten-Countdown | 15 Lernkarten (Latein → Deutsch) | DEMO 4 STARTEN / ABFRAGEN! |
| 11 | Punktestand (Vokabeln abfragen) | Melde-Knöpfe | FORTFAHREN |
| 12–13 | Folie Demo 5 → KI-Song (Video) | „Präsentations-Modus …“ | DEMO 5 STARTEN / SORTIERAUFGABE! |
| 14 | Sortieraufgabe mit Fortschritt („18 von 25 fertig“) | 6 Schritte des Pflegeprozesses ordnen | PUNKTESTAND |
| 15 | Punktestand | Melde-Knöpfe | FORTFAHREN |
| 16–17 | Folie Demo 6 → Highscore KAROLINE-RUN! | Endless Runner, beliebig viele Runden | DEMO 6 STARTEN / SIEGEREHRUNG |
| 18 | Siegerehrung mit Treppchen und Pokal | „Siegerehrung …“ | ZUM PUNKTESTAND |
| 19 | Punktestand + **FINALEN PUNKTESTAND EXPORTIEREN!** (Excel) | Melde-Knöpfe | FORTFAHREN |
| 20 | Folie „Und der Prompt für diese ganze Stunde?“ (Auszug aus der Verlaufsbeschreibung) | „Präsentations-Modus …“ | NÄCHSTE FOLIE |
| 21 | Folie „JETZT SEID IHR DRAN!“ mit QR-Code zu claude.ai | „Präsentations-Modus …“ | ALLES ZURÜCKSETZEN FÜR DEN NÄCHSTEN DURCHGANG |

Die Punkte erscheinen auf den Handys erst ab Demo 3 – so bleibt die Auflösung („Ihr habt schon
Punkte gesammelt!“) eine Überraschung.

### Bedienung für die Lehrkraft

- **Tasten:** → oder Bild↓ = weiter (auch mit Presenter), ← oder Bild↑ = einen Bildschirm zurück.
- **Menü ⚙** (unten links, halb durchsichtig): zu jedem Bildschirm springen, Vollbild,
  Excel-Export, Handout drucken, Teilnehmende verwalten, ausgeblendete Begriffe wieder zeigen,
  **alles zurücksetzen**.
- **Anmeldung:** Name anklicken → *Passwort zurücksetzen* (die Person vergibt beim nächsten Anmelden
  ein neues) oder *Entfernen*.
- **Wortwolke:** Ein Wort anklicken blendet es aus (die 10 Punkte dafür werden abgezogen).
- **Punktestand:** Namen anklicken = aufrufen. Dann Punkte vergeben (0, 10, 25, 50, 75, 100 oder
  eigene Zahl) oder *Abbrechen*. *Zufällig aufrufen* wählt nur unter den gerade verbundenen Handys
  (bei „NUR MIT MELDUNG“ unter denen mit grüner Antwort-Meldung). *Rückgängig* nimmt die letzte
  Punktvergabe zurück. Nach einer Vergabe wird die Meldung der Person gelöscht.
- **Zurücksetzen** löscht alle Namen, Passwörter und Punkte und meldet alle Handys ab. Wurde noch
  nicht exportiert, fragt die Anwendung vorher nach. Die PIN bleibt erhalten.

### Punkte

| Aufgabe | Punkte |
|---|---|
| Demo 1: Abstimmung | 1 je gewählter Antwort |
| Demo 2: Wortwolke | 10 je Begriff (ausgeblendete zählen nicht) |
| Sortieraufgabe | 10 je richtig eingeordnetem Schritt, −10 je falscher Zahl, nie unter 0 (fehlerfrei = 60) |
| Punktestand | 0–100 je Vergabe durch die Lehrkraft |
| KAROLINE-RUN! | zählt nur für die Spiel-Highscore, nicht für den Punktestand |

Die Excel-Datei enthält Platz, Name, Gesamtpunkte, die Punkte je Aufgabe und die Spiel-Highscore.

### Für die Teilnehmenden

Browser versehentlich geschlossen oder Verbindung weg? Einfach den QR-Code erneut scannen – das
Handy meldet sich automatisch wieder an und springt in den aktuellen Bildschirm. Auf einem anderen
Gerät genügen Name und Passwort; der Punktestand bleibt erhalten. Klappt die Dauerverbindung im
WLAN nicht, wechselt das Handy von selbst auf regelmäßige Abfragen (etwas langsamer, sonst gleich).

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
| Folientexte und Prompts der Demos, Auszug auf der Folie „Und der Prompt?“, Countdown-Dauer | `public/js/beamer.js` (oben) |
| Texte der Handy-Seite | `public/js/handy.js` |
| Spieltexte KAROLINE-RUN! | `public/spiel/spiel.js` (oben) |

## Technik

```
worker/index.js        Cloudflare Worker + Durable Object „Workshop“ (Speicher, Verbindungen)
worker/logik.js        Spielregeln: Anmeldung, Punkte, Ansichten (ohne Cloudflare-Bezug)
public/index.html      Handy-Seite          → js/handy.js, css/handy.css
public/beamer.html     Beamer-Seite         → js/beamer.js, css/beamer.css
public/handout.html    Handout mit QR-Code zum Drucken
public/js/             gemeinsam.js, verbindung.js (WebSocket + Reserve), wortwolke.js, export.js (Excel)
public/spiel/          KAROLINE-RUN! (aus „Diabetes Run!“ der Lernkarten übernommen)
public/video/          hier gehört pflegeprozess.mp4 hin
public/vendor/         qrcode.min.js (MIT-Lizenz)
tests/                 automatischer Gesamttest
```

Der gesamte Zustand liegt in einem Durable Object (kostenloser Tarif). Beamer und Handys sind per
WebSocket verbunden und bekommen nach jeder Änderung ihre aktuelle Ansicht; Handys ohne WebSocket
fragen alle 1,5 Sekunden per HTTP nach.

## Tests

```
cd tests
npm install                      # installiert wrangler (lokaler Cloudflare-Server) und Playwright
npx playwright install chromium
node ablauf.test.js              # ganze Stunde mit 30 simulierten Handys (~3 Minuten); TN=10 für weniger
```

Der Test startet den Workshop lokal mit leerem Speicher und prüft u. a.: PIN, Anmeldung mit
30 Handys (eines im Reserve-Modus), falsches Passwort, Wiedereinstieg, alle Demos, Punkteberechnung,
Zufallsauswahl, Rückgängig, Excel-Export und Zurücksetzen. Bildschirmfotos liegen in `tests/ergebnisse/`.

© 2026 Sven Klawitter
