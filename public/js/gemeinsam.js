/*
 * Gemeinsame Festlegungen für Beamer, Handys und Server (worker/logik.js).
 * Hier stehen der Ablauf der Stunde und alle Inhalte, die mehrere Teile brauchen.
 * Texte, die nur der Beamer zeigt (Folien), stehen in beamer.js.
 */

// Ablauf der Stunde: Jeder Eintrag ist ein Bildschirm. „knopf“ ist die Beschriftung
// des Weiter-Knopfs am Beamer, der zum nächsten Eintrag führt.
export const ABLAUF = [
  { modus: 'login', knopf: 'PRÄSENTATIONS-MODUS STARTEN' },
  { modus: 'folie', folie: 'wunsch', knopf: 'NÄCHSTE FOLIE' },   // Weiter deckt erst alle Karten auf
  { modus: 'folie', folie: 'wort', knopf: 'NÄCHSTE FOLIE' },
  { modus: 'folie', folie: 'demo1', knopf: 'DEMO 1 STARTEN' },
  { modus: 'umfrage', knopf: 'UMFRAGE ABSCHLIESSEN' },
  { modus: 'folie', folie: 'demo2', knopf: 'DEMO 2 STARTEN' },
  { modus: 'wortwolke', knopf: 'WORTWOLKE ABSCHLIESSEN' },
  { modus: 'folie', folie: 'demo3', knopf: 'DEMO 3 STARTEN' },
  { modus: 'punkte', knopf: 'FORTFAHREN' },
  { modus: 'folie', folie: 'demo4', knopf: 'DEMO 4 STARTEN' },
  { modus: 'lernkarten', knopf: 'ABFRAGEN!' },
  { modus: 'punkte', knopf: 'FORTFAHREN' },
  { modus: 'folie', folie: 'demo5', knopf: 'DEMO 5 STARTEN' },
  { modus: 'video', knopf: 'SORTIERAUFGABE!' },
  { modus: 'sortieren', knopf: 'PUNKTESTAND' },
  { modus: 'punkte', knopf: 'FORTFAHREN' },
  { modus: 'folie', folie: 'demo6', knopf: 'DEMO 6 STARTEN' },
  { modus: 'sprachen', knopf: 'AUFGABE ABSCHLIESSEN' },
  { modus: 'folie', folie: 'demo7', knopf: 'DEMO 7 STARTEN' },
  { modus: 'grafik', knopf: 'GRAFIK-QUIZ ABSCHLIESSEN' },
  { modus: 'folie', folie: 'demo8', knopf: 'DEMO 8 STARTEN' },
  { modus: 'gruppen', knopf: 'GRUPPENPUZZLE STARTEN' },
  { modus: 'puzzle', knopf: 'SIEGEREHRUNG' },
  { modus: 'gruppensieg', knopf: 'ZUM PUNKTESTAND' },
  { modus: 'punkte', knopf: 'FORTFAHREN' },
  { modus: 'folie', folie: 'demo9', knopf: 'DEMO 9 STARTEN' },
  { modus: 'spiel', knopf: 'SIEGEREHRUNG' },
  { modus: 'siegerehrung', knopf: 'ZUM PUNKTESTAND' },
  { modus: 'punkte', knopf: 'FORTFAHREN' },
  { modus: 'folie', folie: 'demo10', knopf: 'DEMO 10 STARTEN' },
  { modus: 'test', knopf: 'TEST BEENDEN' },
  { modus: 'notenspiegel', knopf: 'FORTFAHREN' },
  { modus: 'folie', folie: 'prompt', knopf: 'NÄCHSTE FOLIE' },
  { modus: 'folie', folie: 'fragerunde', knopf: 'PUNKTESTAND-MODUS' },
  { modus: 'punkte', final: true, fragerunde: true, knopf: 'FORTFAHREN' },
  { modus: 'folie', folie: 'jetzt', knopf: null },
];

// Zum Mitnehmen auf den Handys: Beispiel-Prompt (Folie „Und der Prompt …?“) und Claude (Schlussfolie)
export const PROMPT_PDF = 'prompt/Beispiel-Prompt-KI-Workshop.pdf';   // erzeugt mit werkzeuge/pdfs-erzeugen.mjs
export const CLAUDE_LINK = 'https://claude.ai';

// Ab diesem Schritt sehen die Teilnehmenden ihre Punkte auf dem Handy
// (vorher nicht, damit die Auflösung in Demo 3 eine Überraschung bleibt).
export const PUNKTE_SICHTBAR_AB = ABLAUF.findIndex(s => s.modus === 'punkte');

// Demo 1: Abstimmung. Die letzte Antwort schließt die anderen aus.
export const UMFRAGE_FRAGE = 'Wozu nutzt du KI momentan schon?';
export const UMFRAGE_OPTIONEN = [
  'Texte generieren',
  'Bilder erstellen',
  'E-Mails beantworten',
  'Softwarecode schreiben',
  'Noch gar nicht',
];
export const UMFRAGE_KEINE = UMFRAGE_OPTIONEN.length - 1;

// Demo 2: Wortwolke
export const WOLKE_MAX_BEGRIFFE = 5;
export const WOLKE_MAX_LAENGE = 30;

// Sortieraufgabe: die 6 Schritte in richtiger Reihenfolge (Wortlaut wie im Song)
export const PFLEGEPROZESS = [
  'Informationssammlung',
  'Probleme und Ressourcen erkennen',
  'Pflegeziele festlegen',
  'Pflegemaßnahmen planen',
  'Pflege durchführen',
  'Evaluation (Bewertung)',
];

// Demo 4: Lernkarten (vorne Latein, hinten Deutsch)
export const LERNKARTEN = [
  ['Cor', 'Herz'],
  ['Pulmo', 'Lunge'],
  ['Ren', 'Niere'],
  ['Cutis', 'Haut'],
  ['Cerebrum', 'Großhirn'],
  ['Vesica urinaria', 'Harnblase'],
  ['Vertebra', 'Wirbel'],
  ['Costa', 'Rippe'],
  ['Sanguis', 'Blut'],
  ['Dolor', 'Schmerz'],
  ['Febris', 'Fieber'],
  ['Vulnus', 'Wunde'],
  ['Fractura', 'Knochenbruch'],
  ['Respiratio', 'Atmung'],
  ['Decubitus', 'Druckgeschwür (wörtlich: das Liegen)'],
];

// Punkte
export const PUNKTE = {
  jeStimme: 1,          // Demo 1: je gewählter Antwort
  jeBegriff: 10,        // Demo 2: je Begriff
  jeSchritt: 10,        // Sortieraufgabe: je richtig eingeordnetem Schritt
  jeFehler: 10,         // Sortieraufgabe: Abzug je falscher Zahl (nie unter 0)
  vergabeMax: 100,      // mündliche Punktvergabe: 0 bis 100
  sprachFrage: 10,      // Demo 6: je Frage, die beim ersten Versuch stimmt
  grafikErster: 10,     // Demo 7: Treffer beim ersten Antippen
  grafikZweiter: 5,     // Demo 7: Treffer beim zweiten Antippen
  puzzlePlatz: [50, 40, 30],  // Demo 8: je Person einer Gruppe auf Platz 1, 2, 3
  puzzleFertig: 20,     // Demo 8: je Person jeder weiteren Gruppe, die fertig wird
};

/* ---------- Demo 6: Sprachen ---------- */
export const SPRACH_CODES = ['de', 'tr', 'ru', 'uk', 'fr', 'es'];
export const SPRACHEN_LOESUNG = [1, 2, 0];   // richtige Antwort je Frage (in allen Sprachen und Niveaus gleich)

export function sprachPunkte(s) {
  if (!s) return 0;
  return s.fragen.filter(f => f.richtig && f.versuche === 1).length * PUNKTE.sprachFrage;
}

/* ---------- Demo 7: Grafiken (jeder im eigenen Tempo, höchstens 2 Versuche je Aufgabe) ---------- */
export const GRAFIK_AUFGABEN = [
  { bild: 'europa', ziel: 'UA', kurz: 'Ukraine', text: 'Wo spricht man Ukrainisch? Tippe auf das Land.' },
  { bild: 'europa', ziel: 'TR', kurz: 'Türkei', text: 'Wo spricht man Türkisch? Tippe auf das Land.' },
  { bild: 'europa', ziel: 'ES', kurz: 'Spanien', text: 'Wo spricht man Spanisch? Tippe auf das Land.' },
  // Organe und Knochen: nur die lateinische Fachsprache (Handy und Beamer)
  { bild: 'koerper', ziel: 'leber', kurz: 'Hepar', text: 'Tippe auf: Hepar' },
  { bild: 'koerper', ziel: 'magen', kurz: 'Gaster', text: 'Tippe auf: Gaster' },
  { bild: 'koerper', ziel: 'niere', kurz: 'Ren', text: 'Tippe auf: Ren' },
  { bild: 'skelett', ziel: 'femur', kurz: 'Femur', text: 'Tippe auf: Femur' },
  { bild: 'skelett', ziel: 'clavicula', kurz: 'Clavicula', text: 'Tippe auf: Clavicula' },
  { bild: 'skelett', ziel: 'wirbelsaeule', kurz: 'Columna vertebralis', text: 'Tippe auf: Columna vertebralis' },
];
export const GRAFIK_BILDER = [
  { bild: 'europa', titel: 'Europakarte' },
  { bild: 'koerper', titel: 'Organe' },
  { bild: 'skelett', titel: 'Knochen' },
];
export const GRAFIK_VERSUCHE = 2;

export function grafikPunkte(g) {
  if (!g) return 0;
  let p = 0;
  for (const a of g.aufgaben) {
    const treffer = a.versuche.findIndex(v => v.ok);
    if (treffer === 0) p += PUNKTE.grafikErster;
    else if (treffer === 1) p += PUNKTE.grafikZweiter;
  }
  return p;
}

/* ---------- Demo 8: Gruppen und Gruppenpuzzle ---------- */
export const GRUPPENGROESSE = 3;
export const PUZZLE_SPERRE_MS = 15000;
export const PUZZLE_HINWEIS_NACH = 4;   // so viele Fehlversuche im selben Abschnitt → Hinweis (✓/✗ je Frage + Tipp)
export const PUZZLE_LOESUNG_NACH = 5;   // so viele → Lösung wird gezeigt und eingetragen     // Sperre nach einer falschen Gruppenprüfung
export const OFFLINE_FREIGABE_MS = 30000;  // so lange darf jemand weg sein, bevor sein Text für die Gruppe frei wird
export const GRUPPEN = [
  { tier: '🐘', name: 'Blaue Elefanten', farbe: '#2B7BB9' },
  { tier: '🐝', name: 'Gelbe Bienen', farbe: '#D99A0B' },
  { tier: '🦊', name: 'Rote Füchse', farbe: '#D64545' },
  { tier: '🐸', name: 'Grüne Frösche', farbe: '#2E9E5B' },
  { tier: '🦄', name: 'Lila Einhörner', farbe: '#7B5EA7' },
  { tier: '🐯', name: 'Orange Tiger', farbe: '#E07020' },
  { tier: '🐬', name: 'Türkise Delfine', farbe: '#159A9C' },
  { tier: '🦩', name: 'Rosa Flamingos', farbe: '#E05A9B' },
  { tier: '🐻', name: 'Braune Bären', farbe: '#8B5A3C' },
  { tier: '🐧', name: 'Schwarze Pinguine', farbe: '#2F3A40' },
  { tier: '🦉', name: 'Graue Eulen', farbe: '#6F7F86' },
  { tier: '🐢', name: 'Olivgrüne Schildkröten', farbe: '#5F7F1F' },
];
export function gruppeInfo(g) {
  const basis = GRUPPEN[g % GRUPPEN.length];
  const runde = Math.floor(g / GRUPPEN.length);
  return Object.assign({}, basis, { name: basis.name + (runde ? ' ' + (runde + 1) : '') });
}
export function puzzlePunkte(platz) {
  if (!platz) return 0;
  return PUNKTE.puzzlePlatz[platz - 1] ?? PUNKTE.puzzleFertig;
}

// Wortwolke: Begriffe zusammenführen (Groß-/Kleinschreibung, Leerzeichen, Satzzeichen am Rand)
export function begriffSchluessel(text) {
  return String(text || '')
    .normalize('NFC')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, '')
    .toLowerCase();
}

export function begriffBereinigen(text) {
  return String(text || '').normalize('NFC').replace(/\s+/g, ' ').trim().slice(0, WOLKE_MAX_LAENGE);
}

export function begriffGueltig(text) {
  const b = begriffBereinigen(text);
  return (b.match(/\p{L}/gu) || []).length >= 2;
}

// Sortieraufgabe: Punkte aus Zwischenstand
export function sortierPunkte(s) {
  if (!s) return 0;
  const richtig = s.richtig.filter(Boolean).length;
  return Math.max(0, richtig * PUNKTE.jeSchritt - s.fehler * PUNKTE.jeFehler);
}

/* ---------- Demo 10: Test mit Note, mündliche Note ---------- */
export const TEST_DAUER_MS = 3 * 60 * 1000;
// Notenschlüssel (IHK, an Berufsschulen gängig): ab so viel Prozent gibt es Note 1, 2, 3, 4, 5 – darunter 6
export const NOTEN_GRENZEN = [92, 81, 67, 50, 30];
export const NOTEN_NAMEN = ['', 'sehr gut', 'gut', 'befriedigend', 'ausreichend', 'mangelhaft', 'ungenügend'];
export function noteAusProzent(prozent) {
  const i = NOTEN_GRENZEN.findIndex(g => prozent >= g);
  return i < 0 ? 6 : i + 1;
}
