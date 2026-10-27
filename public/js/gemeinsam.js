/*
 * Gemeinsame Festlegungen für Beamer, Handys und Server (worker/logik.js).
 * Hier stehen der Ablauf der Stunde und alle Inhalte, die mehrere Teile brauchen.
 * Texte, die nur der Beamer zeigt (Folien), stehen in beamer.js.
 */

// Ablauf der Stunde: Jeder Eintrag ist ein Bildschirm. „knopf“ ist die Beschriftung
// des Weiter-Knopfs am Beamer, der zum nächsten Eintrag führt.
export const ABLAUF = [
  { modus: 'login', knopf: 'PRÄSENTATIONS-MODUS STARTEN' },
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
  { modus: 'spiel', knopf: 'SIEGEREHRUNG' },
  { modus: 'siegerehrung', knopf: 'ZUM PUNKTESTAND' },
  { modus: 'punkte', knopf: 'FORTFAHREN' },
  { modus: 'folie', folie: 'prompt', knopf: 'NÄCHSTE FOLIE' },
  { modus: 'folie', folie: 'fragerunde', knopf: 'PUNKTESTAND-MODUS' },
  { modus: 'punkte', final: true, fragerunde: true, knopf: 'FORTFAHREN' },
  { modus: 'folie', folie: 'jetzt', knopf: null },
];

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
};

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
