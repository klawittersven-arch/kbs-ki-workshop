/*
 * Demo 10 („Lernen mit … automatisch korrigierten Tests“): kurzer Multiple-Choice-Test als
 * Wiederholung der Stunde. Jede Person bekommt Fragen und Antworten in eigener Reihenfolge.
 * Die richtigen Antworten stehen NICHT hier (diese Datei kann jedes Handy laden),
 * sondern nur auf dem Server in worker/test-loesung.js – gleiche Reihenfolge wie hier.
 */
export const TEST_FRAGEN = [
  {
    frage: 'Mit welchem Schritt beginnt der Pflegeprozess nach Fiechter und Meier?',
    optionen: ['Informationssammlung', 'Pflegeziele festlegen', 'Pflege durchführen', 'Evaluation (Bewertung)'],
  },
  {
    frage: 'Welcher Schritt schließt den Pflegeprozess ab?',
    optionen: ['Pflegemaßnahmen planen', 'Evaluation (Bewertung)', 'Probleme und Ressourcen erkennen', 'Informationssammlung'],
  },
  {
    frage: 'Wie lange müssen die Hände bei der Händedesinfektion mindestens feucht bleiben?',
    optionen: ['10 Sekunden', '30 Sekunden', '2 Minuten', '5 Minuten'],
  },
  {
    frage: 'Welche Stellen werden bei der Händedesinfektion am häufigsten vergessen?',
    optionen: ['Handflächen', 'Fingerspitzen und Daumen', 'Handgelenke', 'Unterarme'],
  },
  {
    frage: 'Ab welchem Blutzuckerwert spricht man von einer Unterzuckerung?',
    optionen: ['unter 70 mg/dl', 'unter 120 mg/dl', 'unter 180 mg/dl', 'über 250 mg/dl'],
  },
  {
    frage: 'Was hilft bei einer Unterzuckerung am schnellsten?',
    optionen: ['Ein Stück Schokolade', 'Traubenzucker oder Fruchtsaft', 'Ein Glas Wasser', 'Eine Insulinspritze'],
  },
  {
    frage: 'Was bedeutet der lateinische Begriff „Ren“?',
    optionen: ['Niere', 'Herz', 'Lunge', 'Rippe'],
  },
  {
    frage: 'Wie heißt das KI-Werkzeug, mit dem die Demos dieser Stunde erstellt wurden?',
    optionen: ['Claude Code', 'Microsoft PowerPoint', 'Moodle', 'Kahoot'],
  },
];
