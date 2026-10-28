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

// Fragen: art 'auswahl' (richtig = Index der Antwort) oder 'zahl' (richtig = Zahl)
export const PUZZLE_FRAGEN = [
  {
    art: 'auswahl', frage: 'Was liegt bei Herrn Brenner vor?',
    optionen: ['Eine Überzuckerung', 'Eine Unterzuckerung', 'Ein normaler Blutzucker'], richtig: 1,
  },
  {
    art: 'auswahl', frage: 'Warum ist das gerade jetzt passiert?',
    optionen: ['Er hat zu viel zu Mittag gegessen.', 'Das Insulin wirkt nicht mehr.', 'Das Insulin wirkt gerade am stärksten, und die Weinlese senkt den Blutzucker zusätzlich.'], richtig: 2,
  },
  {
    art: 'auswahl', frage: 'Was tut ihr zuerst?',
    optionen: ['4 Plättchen Traubenzucker geben', 'Sofort Insulin spritzen', 'Ein Stück Schokolade geben'], richtig: 0,
  },
  {
    art: 'zahl', frage: 'Nach 15 Minuten misst Herr Brenner 62 mg/dl. Wie viele Gramm Traubenzucker hat er insgesamt bekommen, wenn ihr richtig weiterhandelt?',
    einheit: 'g', richtig: 40,
  },
  {
    art: 'auswahl', frage: 'Morgen spritzt Herr Brenner wieder um 12 Uhr und hilft ab 13 Uhr bei der Weinlese. Wann ist die Gefahr einer Unterzuckerung am größten?',
    optionen: ['Gleich um 12:05 Uhr', 'Erst ab 18 Uhr', 'Zwischen 13 und 14 Uhr'], richtig: 2,
  },
  {
    art: 'auswahl', frage: 'Am Abend trinkt Herr Brenner zwei Gläser Wein und wird zittrig. Was stimmt?',
    optionen: ['Alkohol senkt den Blutzucker: messen und bei unter 70 mg/dl Traubenzucker geben.', 'Wein enthält Zucker – eine Unterzuckerung ist ausgeschlossen.', 'Das Zittern kommt nur vom Wein – einfach schlafen lassen.'], richtig: 0,
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
