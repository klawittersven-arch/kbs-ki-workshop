/*
 * Demo 8 („Lernen mit … Gruppenarbeiten“): Gruppenpuzzle zum Diabetes mellitus.
 * Jede Person einer Dreiergruppe wird Expert*in für einen Bereich (A, B oder C) und sieht nur ihren Text.
 * Jede Frage braucht das Wissen aus mindestens zwei Texten – die Gruppe kommt nur gemeinsam weiter.
 * Medizinische Werte bitte vor dem Einsatz im Unterricht fachlich prüfen.
 */

export const FALL = 'Herr Brenner (72) hat Diabetes Typ 2. Er spritzt zu den Mahlzeiten ein kurz wirksames Insulin. Heute hat er um 12 Uhr Insulin gespritzt und danach zu Mittag gegessen. Ab 13 Uhr hilft er bei der Weinlese. Um 13:30 Uhr zittert er, schwitzt stark und ist unruhig. Ihr messt seinen Blutzucker: 55 mg/dl.';

export const EXPERTEN = {
  A: {
    titel: 'Expert*in A: Blutzucker & Anzeichen',
    symbol: '🩸',
    text: [
      'Der Blutzucker wird in mg/dl gemessen. Nüchtern liegt er normalerweise zwischen 70 und 100 mg/dl.',
      'Unterzuckerung (Hypoglykämie): Der Wert liegt unter 70 mg/dl. Typische Anzeichen sind Zittern, Schwitzen, Herzrasen, Heißhunger, Unruhe und später Verwirrtheit. Eine Unterzuckerung ist erst vorbei, wenn der Wert wieder bei 70 mg/dl oder darüber liegt.',
      'Überzuckerung (Hyperglykämie): Werte über 250 mg/dl gelten als deutlich zu hoch. Anzeichen sind starker Durst, häufiges Wasserlassen und Müdigkeit.',
      'Merke: Bei Anzeichen immer zuerst den Blutzucker messen.',
    ],
  },
  B: {
    titel: 'Expert*in B: Insulin & Wirkzeiten',
    symbol: '💉',
    text: [
      'Insulin senkt den Blutzucker. Es gibt verschiedene Arten:',
      'Kurz wirksames Insulin (Mahlzeiteninsulin) wird zum Essen gespritzt. Es wirkt nach etwa 15 Minuten, am stärksten 1 bis 2 Stunden nach dem Spritzen und insgesamt etwa 4 Stunden.',
      'Lang wirksames Insulin (Basalinsulin) wirkt gleichmäßig über etwa 24 Stunden.',
      'Wichtig: Bei einer Unterzuckerung niemals Insulin spritzen – es würde den Blutzucker noch weiter senken. Die Insulinmenge darf nur nach ärztlicher Anordnung verändert werden.',
    ],
  },
  C: {
    titel: 'Expert*in C: Ernährung & Bewegung',
    symbol: '🍇',
    text: [
      'Bei einer Unterzuckerung braucht der Körper schnell Zucker: zum Beispiel 4 Plättchen Traubenzucker (das sind 20 Gramm) oder ein Glas Fruchtsaft. Schokolade ist ungeeignet, weil das Fett die Aufnahme des Zuckers bremst.',
      'Nach 15 Minuten misst man erneut. Ist der Wert noch zu niedrig, gibt man noch einmal dieselbe Menge.',
      'Körperliche Arbeit – etwa Gartenarbeit oder Weinlese – senkt den Blutzucker zusätzlich. Auch Alkohol senkt den Blutzucker, sogar noch Stunden später.',
    ],
  },
};

// Fragen: art 'auswahl' (richtig = Index der Antwort, ab 0 gezählt) oder 'zahl' (richtig = Zahl).
// tipp erscheint nach PUZZLE_HINWEIS_NACH Fehlversuchen bei Fragen, die noch nicht bei allen stimmen;
// erklaerung erscheint mit der Lösung nach PUZZLE_LOESUNG_NACH Fehlversuchen (gemeinsam.js).
export const PUZZLE_FRAGEN = [
  {
    art: 'auswahl', frage: 'Was liegt bei Herrn Brenner vor?',
    optionen: ['Eine Überzuckerung', 'Eine Unterzuckerung', 'Ein normaler Blutzucker'], richtig: 1,
    tipp: 'Vergleicht den gemessenen Wert (55 mg/dl) mit den Grenzwerten in Text A.',
    erklaerung: '55 mg/dl liegt unter 70 mg/dl – das ist eine Unterzuckerung (Text A).',
  },
  {
    art: 'auswahl', frage: 'Warum ist das gerade jetzt passiert?',
    optionen: ['Er hat zu viel zu Mittag gegessen.', 'Das Insulin wirkt nicht mehr.', 'Das Insulin wirkt gerade am stärksten, und die Weinlese senkt den Blutzucker zusätzlich.'], richtig: 2,
    tipp: 'Wann wirkt das Insulin am stärksten, das er um 12 Uhr gespritzt hat (Text B)? Und was macht die Arbeit bei der Weinlese mit dem Blutzucker (Text C)?',
    erklaerung: 'Gespritzt um 12 Uhr → am stärksten zwischen 13 und 14 Uhr (Text B). Die Weinlese senkt den Blutzucker zusätzlich (Text C).',
  },
  {
    art: 'auswahl', frage: 'Was tut ihr zuerst?',
    optionen: ['4 Plättchen Traubenzucker geben', 'Sofort Insulin spritzen', 'Ein Stück Schokolade geben'], richtig: 0,
    tipp: 'Was braucht der Körper bei einer Unterzuckerung schnell, und was ist ungeeignet (Text C)? Was sagt Text B über Insulin bei einer Unterzuckerung?',
    erklaerung: 'Der Körper braucht schnell Zucker: 4 Plättchen Traubenzucker (Text C). Schokolade wirkt zu langsam, Insulin würde den Blutzucker weiter senken (Text B).',
  },
  {
    art: 'zahl', frage: 'Ihr habt ihm 4 Plättchen Traubenzucker gegeben. Nach 15 Minuten messt ihr erneut: 62 mg/dl. Ihr handelt richtig weiter. Wie viele Gramm Traubenzucker hat Herr Brenner dann insgesamt bekommen – alle Gaben zusammengezählt?',
    einheit: 'g', richtig: 40,
    tipp: 'Ist 62 mg/dl noch eine Unterzuckerung (Text A)? Was tut man dann laut Text C? Zählt alle Gaben zusammen.',
    erklaerung: '62 mg/dl liegt noch unter 70 mg/dl (Text A), also gibt man noch einmal dieselbe Menge (Text C): 20 g + 20 g = 40 g.',
  },
  {
    art: 'auswahl', frage: 'Morgen spritzt Herr Brenner wieder um 12 Uhr und hilft ab 13 Uhr bei der Weinlese. Wann ist die Gefahr einer Unterzuckerung am größten?',
    optionen: ['Gleich um 12:05 Uhr', 'Erst ab 18 Uhr', 'Zwischen 13 und 14 Uhr'], richtig: 2,
    tipp: 'Wann wirkt das Insulin am stärksten, wenn er um 12 Uhr spritzt (Text B)? Und wann arbeitet er bei der Weinlese?',
    erklaerung: 'Das Insulin wirkt 1 bis 2 Stunden nach dem Spritzen am stärksten, also 13 bis 14 Uhr (Text B) – genau dann arbeitet er bei der Weinlese (Text C).',
  },
  {
    art: 'auswahl', frage: 'Am Abend trinkt Herr Brenner zwei Gläser Wein und wird zittrig. Was stimmt?',
    optionen: ['Alkohol senkt den Blutzucker: messen und bei unter 70 mg/dl Traubenzucker geben.', 'Wein enthält Zucker – eine Unterzuckerung ist ausgeschlossen.', 'Das Zittern kommt nur vom Wein – einfach schlafen lassen.'], richtig: 0,
    tipp: 'Was steht in Text C über Alkohol? Und ab welchem Wert spricht man von einer Unterzuckerung (Text A)?',
    erklaerung: 'Alkohol senkt den Blutzucker, sogar noch Stunden später (Text C). Also messen und bei unter 70 mg/dl Traubenzucker geben (Text A).',
  },
];

export const ABSCHNITTE = [
  { titel: 'Abschnitt 1: Erkennen', fragen: [0, 1] },
  { titel: 'Abschnitt 2: Handeln', fragen: [2, 3] },
  { titel: 'Abschnitt 3: Vorbeugen', fragen: [4, 5] },
];

// Antwort prüfen (Zahlen dürfen mit Komma oder Einheit eingegeben werden)
export function antwortRichtig(frageNr, antwort) {
  const f = PUZZLE_FRAGEN[frageNr];
  if (!f) return false;
  if (f.art === 'zahl') {
    const zahl = Number(String(antwort ?? '').replace(',', '.').replace(/[^\d.]/g, ''));
    return String(antwort ?? '').trim() !== '' && zahl === f.richtig;
  }
  return Number(antwort) === f.richtig;
}
