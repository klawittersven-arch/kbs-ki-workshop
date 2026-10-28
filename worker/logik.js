/*
 * Spiellogik des Workshops ohne Cloudflare-Bezug (damit sie sich auch einzeln testen lässt).
 * Der gesamte Zustand ist ein einfaches Objekt, das der Durable Object (index.js) speichert.
 * Punkte werden nie als Zahl gespeichert, sondern immer aus den Einzelteilen berechnet –
 * so stimmen sie auch, wenn eine Stimme zurückgenommen oder ein Begriff ausgeblendet wird.
 */
import {
  ABLAUF, UMFRAGE_OPTIONEN, UMFRAGE_KEINE, WOLKE_MAX_BEGRIFFE, PFLEGEPROZESS, PUNKTE,
  begriffSchluessel, begriffBereinigen, begriffGueltig, sortierPunkte,
  SPRACH_CODES, SPRACHEN_LOESUNG, sprachPunkte, GRAFIK_AUFGABEN, GRAFIK_VERSUCHE, grafikPunkte,
  GRUPPENGROESSE, PUZZLE_SPERRE_MS, OFFLINE_FREIGABE_MS, puzzlePunkte, TEST_DAUER_MS, noteAusProzent,
} from '../public/js/gemeinsam.js';
import { ABSCHNITTE, antwortRichtig } from '../public/js/inhalte-puzzle.js';
import { TEST_FRAGEN } from '../public/js/inhalte-test.js';
import { TEST_LOESUNG } from './test-loesung.js';

export { ABLAUF };

/*
 * Kontext einer Aktion (vom Durable Object geliefert):
 *   jetzt        Zeitpunkt
 *   laufend      Map id → Punkte der gerade laufenden Spielrunde (nur im Speicher)
 *   online       Set der verbundenen ids
 *   offlineSeit  Map id → Zeitpunkt, seit dem ein Handy getrennt ist
 */
export function kontext(teil = {}) {
  return Object.assign({ jetzt: Date.now(), laufend: null, online: new Set(), offlineSeit: new Map() }, teil);
}

// Zählt in der Gruppe mit: verbunden oder erst kurz getrennt (z. B. Bildschirm kurz aus)
function aktiv(kx, id) {
  if (kx.online.has(id)) return true;
  const seit = kx.offlineSeit.get(id);
  return seit !== undefined && kx.jetzt - seit < OFFLINE_FREIGABE_MS;
}

function mischen(liste) {
  const a = liste.slice();
  const zufall = new Uint32Array(a.length || 1);
  crypto.getRandomValues(zufall);
  for (let i = a.length - 1; i > 0; i--) {
    const j = zufall[i] % (i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const ZEICHEN = 'abcdefghijkmnpqrstuvwxyz23456789';

export function zufallsId(laenge = 12) {
  const b = new Uint8Array(laenge);
  crypto.getRandomValues(b);
  let s = '';
  for (const x of b) s += ZEICHEN[x % ZEICHEN.length];
  return s;
}

export async function hashen(salz, text) {
  const daten = new TextEncoder().encode(salz + ':' + text);
  const h = await crypto.subtle.digest('SHA-256', daten);
  return [...new Uint8Array(h)].map(x => x.toString(16).padStart(2, '0')).join('');
}

export function neuerZustand(durchgang = 1, jetzt = Date.now()) {
  return {
    version: 1,
    durchgang,
    epoche: zufallsId(8),   // Anmeldungen gelten nur innerhalb eines Durchgangs
    schritt: 0,
    schrittSeit: jetzt,
    tn: {},                 // id → { id, name, schluessel, salz, hash, token, meldung, seit }
    reihenfolge: [],        // ids in Anmelde-Reihenfolge
    umfrage: {},            // id → [Antwort-Indizes]
    wolke: {},              // id → [Begriffe]
    versteckt: [],          // ausgeblendete Begriffe (Schlüssel)
    sortieren: {},          // id → { richtig: [bool×6], falsch: [[Zahlen]×6], fehler }
    spiel: {},              // id → beste Punktzahl in KAROLINE-RUN!
    vergaben: [],           // mündliche Punkte: { id, punkte, zeit }
    aufgerufen: null,       // id der Person, die gerade dran ist
    exportiert: false,
    zuschauerCode: null,    // Code des Zuschauer-Links (nur anschauen); gilt bis zum Zurücksetzen
    aufgedeckt: [],         // Folie „Wünsch dir was!“: aufgedeckte Karten (in Reihenfolge)
    sprachen: {},           // id → { sprache, niveau, fragen: [{ versuche, richtig }×3] }
    grafik: {},             // id → { aufgaben: [{ versuche: [{ x, y, teil, ok }] }×9] }
    gruppen: { anzahl: 0, zuordnung: {}, selbstWahl: false, version: 0 },   // zuordnung: id → Gruppennummer
    puzzle: null,           // { start, version, experten: id → ['A'…], gruppen: [Zustand je Gruppe] }
    testStart: null,        // Demo 10: Beginn des Tests (für den Countdown)
    test: {},               // id → { antworten: [Antwort-Index oder null ×8], abgegeben, zeit }
  };
}

// Ältere gespeicherte Zustände um neue Felder ergänzen
export function zustandErgaenzen(z) {
  const neu = neuerZustand(z.durchgang || 1);
  for (const k of Object.keys(neu)) if (!(k in z)) z[k] = neu[k];
  return z;
}

export function modusVon(z) {
  return ABLAUF[z.schritt] ? ABLAUF[z.schritt].modus : 'login';
}

/* ---------- Anmeldung ---------- */

const VORNAME = /^\p{L}[\p{L}\p{N}' -]{0,19}$/u;
const INITIALE = /^\p{L}$/u;

function grossAnfang(s) {
  return s.charAt(0).toLocaleUpperCase('de-DE') + s.slice(1);
}

export function namePruefen(vorname, initiale) {
  const v = String(vorname || '').replace(/\s+/g, ' ').trim();
  const i = String(initiale || '').trim().replace(/\.$/, '');
  if (!VORNAME.test(v)) return { fehler: 'vorname' };
  if (!INITIALE.test(i)) return { fehler: 'initiale' };
  const name = grossAnfang(v) + ' ' + i.toLocaleUpperCase('de-DE') + '.';
  return { name, schluessel: name.toLocaleLowerCase('de-DE') };
}

// Liefert { ok, tn } oder { fehler }. Groß-/Kleinschreibung des Passworts ist egal.
export async function anmelden(z, daten, jetzt = Date.now()) {
  const n = namePruefen(daten && daten.vorname, daten && daten.initiale);
  if (n.fehler) return { fehler: n.fehler };
  const pw = String((daten && daten.passwort) || '').trim().toLocaleLowerCase('de-DE');
  if (pw.length < 3) return { fehler: 'passwort-kurz' };
  if (pw.length > 40) return { fehler: 'passwort-lang' };

  // Erst alle Prüfsummen berechnen, dann ohne Unterbrechung prüfen und eintragen –
  // so können zwei gleichzeitige Anmeldungen mit demselben Namen nicht beide durchkommen.
  const finden = () => Object.values(z.tn).find(t => t.schluessel === n.schluessel);
  const salz = zufallsId(10);
  const hash = await hashen(salz, pw);
  let vorhanden = finden();
  const vergleich = vorhanden && vorhanden.hash ? { salz: vorhanden.salz, hash: await hashen(vorhanden.salz, pw) } : null;
  vorhanden = finden();
  if (vorhanden) {
    if (!vorhanden.hash) {
      // Die Lehrkraft hat das Passwort zurückgesetzt: neues Passwort übernehmen
      vorhanden.salz = salz;
      vorhanden.hash = hash;
      return { ok: true, tn: vorhanden, neu: false };
    }
    if (vergleich && vergleich.salz === vorhanden.salz && vergleich.hash === vorhanden.hash) {
      return { ok: true, tn: vorhanden, neu: false };
    }
    return { fehler: 'name-belegt' };
  }
  if (z.reihenfolge.length >= 60) return { fehler: 'voll' };
  const id = zufallsId(10);
  const tn = {
    id, name: n.name, schluessel: n.schluessel, salz, hash,
    token: z.epoche + '.' + zufallsId(20),
    meldung: null, seit: jetzt,
  };
  z.tn[id] = tn;
  z.reihenfolge.push(id);
  return { ok: true, tn, neu: true };
}

export function tnZuToken(z, token) {
  if (typeof token !== 'string' || !token.startsWith(z.epoche + '.')) return null;
  return Object.values(z.tn).find(t => t.token === token) || null;
}

/* ---------- Ablauf ---------- */

// Wechselt den Bildschirm und erledigt, was beim Wechsel passieren muss.
export function schrittSetzen(z, neu, kx) {
  neu = Math.max(0, Math.min(ABLAUF.length - 1, neu | 0));
  if (neu === z.schritt) return false;
  const alt = modusVon(z);
  z.schritt = neu;
  z.schrittSeit = kx.jetzt;
  const jetztModus = modusVon(z);
  if (alt === 'spiel' && kx.laufend) {
    // Wer beim Beenden gerade spielt, behält den Stand der laufenden Runde
    for (const [id, p] of kx.laufend) if (z.tn[id]) z.spiel[id] = Math.max(z.spiel[id] || 0, p);
    kx.laufend.clear();
  }
  if (jetztModus === 'punkte' && alt !== 'punkte') {
    for (const t of Object.values(z.tn)) t.meldung = null;
    z.aufgerufen = null;
  }
  if (jetztModus === 'puzzle') puzzleStarten(z, kx);
  if (jetztModus === 'test' && !z.testStart) z.testStart = kx.jetzt;
  // Test beendet (weiter zum Notenspiegel): alles Angefangene gilt als abgegeben
  if (alt === 'test' && neu > TEST_SCHRITT) {
    for (const t of Object.values(z.test)) if (!t.abgegeben) { t.abgegeben = true; t.zeit = kx.jetzt; }
  }
  return true;
}

/* ---------- Demo 10: Test mit Note ---------- */

const TEST_SCHRITT = ABLAUF.findIndex(s => s.modus === 'test');
const TEST_KULANZ_MS = 3000;   // Antworten, die kurz nach Ablauf ankommen, zählen noch

export function testVorbei(z, jetzt) {
  return z.schritt > TEST_SCHRITT || (!!z.testStart && jetzt > z.testStart + TEST_DAUER_MS + TEST_KULANZ_MS);
}

// Ergebnis einer Person (null = nicht teilgenommen)
export function testErgebnis(z, id) {
  const t = z.test[id];
  if (!t) return null;
  const richtig = TEST_FRAGEN.filter((_, q) => t.antworten[q] === TEST_LOESUNG[q]).length;
  const prozent = 100 * richtig / TEST_FRAGEN.length;
  return {
    richtig, von: TEST_FRAGEN.length, prozent: Math.round(prozent), note: noteAusProzent(prozent),
    falsch: TEST_FRAGEN.map((_, q) => q).filter(q => t.antworten[q] !== TEST_LOESUNG[q])
      .map(q => ({ frage: q, gewaehlt: t.antworten[q], richtig: TEST_LOESUNG[q] })),
  };
}

// Mündliche Note: Anteil an der höchsten Punktzahl im Durchgang, gleicher Notenschlüssel
export function notenVon(z, id, hoechste) {
  const e = testErgebnis(z, id);
  return {
    muendlich: hoechste > 0 ? noteAusProzent(100 * punkteVon(z, id).gesamt / hoechste) : null,
    schriftlich: e ? e.note : null,
    test: e ? { richtig: e.richtig, von: e.von, prozent: e.prozent } : null,
  };
}

function hoechstePunktzahl(z) {
  return Math.max(0, ...z.reihenfolge.filter(id => z.tn[id]).map(id => punkteVon(z, id).gesamt));
}

/* ---------- Demo 8: Gruppen ---------- */

export function gruppenMitglieder(z, g) {
  return z.reihenfolge.filter(id => z.tn[id] && z.gruppen.zuordnung[id] === g);
}

function gruppenAnzahlFuer(n) {
  return Math.max(1, Math.floor(n / GRUPPENGROESSE));
}

// höchstens so viele Personen je Gruppe, dass alle Platz haben (3, bei Rest 4)
export function gruppenKapazitaet(z) {
  const n = z.reihenfolge.filter(id => z.tn[id]).length;
  return Math.max(GRUPPENGROESSE, Math.ceil(n / Math.max(1, z.gruppen.anzahl)));
}

function kleinsteGruppe(z) {
  let beste = 0, min = Infinity;
  for (let g = 0; g < z.gruppen.anzahl; g++) {
    const n = gruppenMitglieder(z, g).length;
    if (n < min) { min = n; beste = g; }
  }
  return beste;
}

// Zufällig einteilen (nur verbundene). nurRest: Wer schon eine Gruppe hat, bleibt dort.
function zufallEinteilen(z, kx, nurRest) {
  const kandidaten = z.reihenfolge.filter(id => z.tn[id] && kx.online.has(id));
  if (!nurRest || !z.gruppen.anzahl) {
    z.gruppen.zuordnung = {};
    z.gruppen.anzahl = gruppenAnzahlFuer(kandidaten.length);
  }
  for (const id of mischen(kandidaten.filter(id => z.gruppen.zuordnung[id] === undefined))) {
    z.gruppen.zuordnung[id] = kleinsteGruppe(z);
  }
  z.gruppen.version++;
}

// Wer während der Gruppenarbeit (neu) dazukommt, landet in der kleinsten Gruppe
export function nachzueglerEinteilen(z, id, kx) {
  const modus = modusVon(z);
  if (!z.tn[id] || z.gruppen.zuordnung[id] !== undefined || !z.gruppen.anzahl) return false;
  if (modus === 'gruppen' && !z.gruppen.selbstWahl) {
    z.gruppen.zuordnung[id] = kleinsteGruppe(z);
    z.gruppen.version++;
    return true;
  }
  if (modus === 'puzzle' && z.puzzle) {
    const g = kleinsteGruppe(z);
    z.gruppen.zuordnung[id] = g;
    // den Expertenbereich übernehmen, der in der Gruppe am seltensten vorkommt
    const zaehler = { A: 0, B: 0, C: 0 };
    for (const m of gruppenMitglieder(z, g)) for (const e of z.puzzle.experten[m] || []) zaehler[e]++;
    z.puzzle.experten[id] = [['A', 'B', 'C'].sort((a, b) => zaehler[a] - zaehler[b])[0]];
    return true;
  }
  return false;
}

/* ---------- Demo 8: Gruppenpuzzle ---------- */

function puzzleStarten(z, kx) {
  if (z.puzzle && z.puzzle.version === z.gruppen.version) return;   // läuft schon (zurückgesprungen)
  if (!z.gruppen.anzahl) zufallEinteilen(z, kx, false);
  else if (z.reihenfolge.some(id => z.tn[id] && kx.online.has(id) && z.gruppen.zuordnung[id] === undefined)) {
    zufallEinteilen(z, kx, true);
  }
  const experten = {};
  const gruppen = [];
  for (let g = 0; g < z.gruppen.anzahl; g++) {
    // Jede Gruppe bekommt alle drei Bereiche; bei 4 Personen haben zwei denselben, bei 2 hat eine zwei
    const m = mischen(gruppenMitglieder(z, g));
    m.forEach(id => { experten[id] = []; });
    if (m.length) ['A', 'B', 'C'].forEach((e, k) => experten[m[k % m.length]].push(e));
    for (let k = 3; k < m.length; k++) experten[m[k]].push(['A', 'B', 'C'][k % 3]);
    gruppen.push({
      phase: 'lesen', gelesen: {}, abschnitt: 0, abgaben: {}, sperreBis: 0, fehlversuche: 0,
      fertigNach: null, platz: null, fertigMitglieder: [], meldung: null,
    });
  }
  z.puzzle = { start: kx.jetzt, version: z.gruppen.version, experten, gruppen };
}

// Prüft alle Gruppen: Lesephase vorbei? Haben alle (aktiven) Mitglieder abgegeben?
// Wird nach jeder Aktion aufgerufen und auch, wenn jemand länger getrennt ist.
export function puzzleAktualisieren(z, kx) {
  if (!z.puzzle) return false;
  let geaendert = false;
  z.puzzle.gruppen.forEach((gs, g) => {
    const aktive = gruppenMitglieder(z, g).filter(id => aktiv(kx, id));
    if (!aktive.length) return;
    if (gs.phase === 'lesen' && aktive.every(id => gs.gelesen[id])) {
      gs.phase = 'aufgaben';
      geaendert = true;
    }
    if (gs.phase !== 'aufgaben' || kx.jetzt < gs.sperreBis || !aktive.every(id => gs.abgaben[id])) return;
    const fragen = ABSCHNITTE[gs.abschnitt].fragen;
    const alleRichtig = aktive.every(id => fragen.every((f, k) => antwortRichtig(f, gs.abgaben[id][k])));
    gs.abgaben = {};
    geaendert = true;
    if (!alleRichtig) {
      gs.fehlversuche++;
      gs.sperreBis = kx.jetzt + PUZZLE_SPERRE_MS;
      gs.meldung = { art: 'falsch', zeit: kx.jetzt };
      return;
    }
    gs.abschnitt++;
    gs.meldung = { art: 'weiter', zeit: kx.jetzt };
    if (gs.abschnitt >= ABSCHNITTE.length) {
      gs.phase = 'fertig';
      gs.fertigNach = kx.jetzt - z.puzzle.start;
      gs.platz = 1 + z.puzzle.gruppen.filter(x => x !== gs && x.platz).length;
      gs.fertigMitglieder = gruppenMitglieder(z, g);
      gs.meldung = { art: 'fertig', zeit: kx.jetzt };
    }
  });
  return geaendert;
}

export function puzzleRangliste(z) {
  if (!z.puzzle) return [];
  return z.puzzle.gruppen
    .map((gs, g) => ({ g, platz: gs.platz, fertigNach: gs.fertigNach, mitglieder: gruppenMitglieder(z, g).map(id => z.tn[id].name) }))
    .filter(e => e.platz)
    .sort((a, b) => a.platz - b.platz);
}

/* ---------- Punkte ---------- */

export function punkteVon(z, id) {
  const umfrage = (z.umfrage[id] || []).length * PUNKTE.jeStimme;
  const versteckt = new Set(z.versteckt);
  const wolke = (z.wolke[id] || []).filter(b => !versteckt.has(begriffSchluessel(b))).length * PUNKTE.jeBegriff;
  const sortieren = sortierPunkte(z.sortieren[id]);
  let muendlich = 0;
  for (const v of z.vergaben) if (v.id === id) muendlich += v.punkte;
  const sprachen = sprachPunkte(z.sprachen[id]);
  const grafik = grafikPunkte(z.grafik[id]);
  let puzzle = 0;
  if (z.puzzle) for (const gs of z.puzzle.gruppen) if (gs.platz && gs.fertigMitglieder.includes(id)) puzzle = puzzlePunkte(gs.platz);
  return {
    umfrage, wolke, sortieren, sprachen, grafik, puzzle, muendlich,
    gesamt: umfrage + wolke + sortieren + sprachen + grafik + puzzle + muendlich,
  };
}

/* ---------- Aktionen der Handys ---------- */

function sprachStand(z, id) {
  return z.sprachen[id] || (z.sprachen[id] = {
    sprache: 'de', niveau: 1, fragen: SPRACHEN_LOESUNG.map(() => ({ versuche: 0, richtig: false })),
  });
}

function grafikStand(z, id) {
  return z.grafik[id] || (z.grafik[id] = { aufgaben: GRAFIK_AUFGABEN.map(() => ({ versuche: [] })) });
}

export function grafikErledigt(a) {
  return a.versuche.some(v => v.ok) || a.versuche.length >= GRAFIK_VERSUCHE;
}

// Gibt true zurück, wenn sich etwas geändert hat, das Beamer und Handys sehen.
export function tnAktion(z, id, m, kx) {
  const laufend = kx.laufend;
  const tn = z.tn[id];
  if (!tn || !m || typeof m !== 'object') return false;
  const modus = modusVon(z);

  if (m.type === 'stimme' && modus === 'umfrage') {
    const o = m.option | 0;
    if (o < 0 || o >= UMFRAGE_OPTIONEN.length) return false;
    let liste = z.umfrage[id] || [];
    const an = !!m.an;
    if (an === liste.includes(o)) return false;
    if (an) {
      // „Noch gar nicht“ schließt die anderen Antworten aus und umgekehrt
      liste = o === UMFRAGE_KEINE ? [o] : liste.filter(x => x !== UMFRAGE_KEINE).concat(o);
    } else {
      liste = liste.filter(x => x !== o);
    }
    z.umfrage[id] = liste.sort((a, b) => a - b);
    return true;
  }

  if (m.type === 'begriffe' && modus === 'wortwolke') {
    if (z.wolke[id]) return false;            // nur einmal abschicken
    const liste = [];
    const schon = new Set();
    for (const roh of Array.isArray(m.liste) ? m.liste.slice(0, WOLKE_MAX_BEGRIFFE) : []) {
      if (!begriffGueltig(roh)) continue;
      const b = begriffBereinigen(roh);
      const k = begriffSchluessel(b);
      if (!k || schon.has(k)) continue;
      schon.add(k);
      liste.push(b);
    }
    if (!liste.length) return false;
    z.wolke[id] = liste;
    return true;
  }

  if (m.type === 'melden' && modus === 'punkte') {
    const art = m.art === 'frage' || m.art === 'antwort' ? m.art : null;
    if (tn.meldung === art) return false;
    tn.meldung = art;
    return true;
  }

  if (m.type === 'sortieren' && modus === 'sortieren') {
    const i = m.schritt | 0;
    const pos = m.position | 0;
    if (i < 0 || i >= PFLEGEPROZESS.length || pos < 1 || pos > PFLEGEPROZESS.length) return false;
    const s = z.sortieren[id] || (z.sortieren[id] = {
      richtig: PFLEGEPROZESS.map(() => false), falsch: PFLEGEPROZESS.map(() => []), fehler: 0,
    });
    if (s.richtig[i]) return false;                       // schon gelöst
    if (s.richtig[pos - 1]) return false;                 // Zahl ist schon richtig vergeben
    if (s.falsch[i].includes(pos)) return false;          // diese falsche Zahl wurde schon gewählt
    if (pos === i + 1) s.richtig[i] = true;
    else { s.falsch[i].push(pos); s.fehler++; }
    return true;
  }

  if (m.type === 'sprachwahl' && modus === 'sprachen') {
    const s = sprachStand(z, id);
    const sprache = SPRACH_CODES.includes(m.sprache) ? m.sprache : s.sprache;
    const niveau = [0, 1, 2].includes(m.niveau) ? m.niveau : s.niveau;
    if (z.sprachen[id] && s.sprache === sprache && s.niveau === niveau && !m.erstes) return false;
    s.sprache = sprache;
    s.niveau = niveau;
    return true;
  }

  if (m.type === 'sprachantwort' && modus === 'sprachen') {
    const f = sprachStand(z, id).fragen[m.frage | 0];
    const o = m.option | 0;
    if (!f || f.richtig || o < 0 || o > 2) return false;
    f.versuche++;
    if (o === SPRACHEN_LOESUNG[m.frage | 0]) f.richtig = true;
    return true;
  }

  if (m.type === 'tippen' && modus === 'grafik') {
    const g = grafikStand(z, id);
    const i = m.aufgabe | 0;
    const aktuell = g.aufgaben.findIndex(a => !grafikErledigt(a));
    if (i !== aktuell) return false;
    const x = Math.round(Number(m.x) * 10) / 10, y = Math.round(Number(m.y) * 10) / 10;
    if (!isFinite(x) || !isFinite(y)) return false;
    const teil = String(m.teil || '').slice(0, 20);
    g.aufgaben[i].versuche.push({ x, y, teil, ok: teil === GRAFIK_AUFGABEN[i].ziel });
    return true;
  }

  if (m.type === 'gruppeWaehlen' && modus === 'gruppen' && z.gruppen.selbstWahl) {
    const g = m.g | 0;
    if (g < 0 || g >= z.gruppen.anzahl || z.gruppen.zuordnung[id] === g) return false;
    if (gruppenMitglieder(z, g).length >= gruppenKapazitaet(z)) return false;
    z.gruppen.zuordnung[id] = g;
    z.gruppen.version++;
    return true;
  }

  if (modus === 'puzzle' && z.puzzle && (m.type === 'gelesen' || m.type === 'abgeben' || m.type === 'abgabeZurueck')) {
    const g = z.gruppen.zuordnung[id];
    const gs = g !== undefined ? z.puzzle.gruppen[g] : null;
    if (!gs) return false;
    if (m.type === 'gelesen') {
      if (gs.phase !== 'lesen' || gs.gelesen[id]) return false;
      gs.gelesen[id] = true;
    } else if (m.type === 'abgabeZurueck') {
      if (!gs.abgaben[id]) return false;
      delete gs.abgaben[id];
    } else {
      if (gs.phase !== 'aufgaben' || kx.jetzt < gs.sperreBis || (m.abschnitt | 0) !== gs.abschnitt) return false;
      const anzahl = ABSCHNITTE[gs.abschnitt].fragen.length;
      if (!Array.isArray(m.antworten) || m.antworten.length !== anzahl) return false;
      gs.abgaben[id] = m.antworten.map(a => String(a ?? '').slice(0, 20));
    }
    puzzleAktualisieren(z, kx);
    return true;
  }

  if (modus === 'test' && (m.type === 'testBeginn' || m.type === 'testAntwort' || m.type === 'testAbgeben')) {
    const vorbei = testVorbei(z, kx.jetzt);
    let t = z.test[id];
    if (!t) {
      if (vorbei) return false;
      t = z.test[id] = { antworten: TEST_FRAGEN.map(() => null), abgegeben: false, zeit: null };
      if (m.type === 'testBeginn') return true;
    }
    if (t.abgegeben) return false;
    if (m.type === 'testAbgeben') { t.abgegeben = true; t.zeit = kx.jetzt; return true; }
    if (m.type !== 'testAntwort' || vorbei) return false;
    const q = m.frage, o = m.option;
    if (!Number.isInteger(q) || q < 0 || q >= TEST_FRAGEN.length) return false;
    if (o !== null && (!Number.isInteger(o) || o < 0 || o >= TEST_FRAGEN[q].optionen.length)) return false;
    if (t.antworten[q] === o) return false;
    t.antworten[q] = o;
    return true;
  }

  if (m.type === 'spielstand' && modus === 'spiel' && laufend) {
    const p = Math.max(0, Math.min(1e7, Math.floor(Number(m.punkte) || 0)));
    if (m.ende) {
      laufend.delete(id);
      if (p > (z.spiel[id] || 0)) { z.spiel[id] = p; return true; }
      if (!(id in z.spiel)) { z.spiel[id] = p; return true; }
      return false;
    }
    laufend.set(id, p);
    return false;
  }

  return false;
}

/* ---------- Aktionen der Lehrkraft ---------- */

// Ergebnis: { geaendert, abmelden: [ids] }
export function lehrerAktion(z, m, kx) {
  const r = { geaendert: false, abmelden: [] };
  const jetzt = kx.jetzt, laufend = kx.laufend;
  if (!m || typeof m !== 'object') return r;
  switch (m.type) {
    case 'weiter': r.geaendert = schrittSetzen(z, z.schritt + 1, kx); break;
    case 'zurueck': r.geaendert = schrittSetzen(z, z.schritt - 1, kx); break;
    case 'springen': r.geaendert = schrittSetzen(z, m.schritt, kx); break;
    case 'gruppenZufall':
      zufallEinteilen(z, kx, !!m.nurRest);
      r.geaendert = true;
      break;
    case 'gruppenWahl':
      z.gruppen.selbstWahl = !!m.an;
      if (z.gruppen.selbstWahl && !z.gruppen.anzahl) {
        z.gruppen.anzahl = gruppenAnzahlFuer(z.reihenfolge.filter(id => z.tn[id] && kx.online.has(id)).length);
      }
      z.gruppen.version++;
      r.geaendert = true;
      break;
    case 'gruppeWechseln': {
      if (!z.tn[m.id]) break;
      if (!z.gruppen.anzahl) z.gruppen.anzahl = gruppenAnzahlFuer(z.reihenfolge.filter(id => z.tn[id] && kx.online.has(id)).length);
      const g = z.gruppen.zuordnung[m.id];
      z.gruppen.zuordnung[m.id] = g === undefined ? 0 : (g + 1) % z.gruppen.anzahl;
      if (z.puzzle && modusVon(z) === 'puzzle' && !z.puzzle.experten[m.id]) z.puzzle.experten[m.id] = ['A'];
      else z.gruppen.version++;
      r.geaendert = true;
      break;
    }
    case 'aufrufen': {
      const id = m.id && z.tn[m.id] ? m.id : null;
      if (z.aufgerufen !== id) { z.aufgerufen = id; r.geaendert = true; }
      break;
    }
    case 'vergeben': {
      const tn = z.tn[m.id];
      const p = Math.floor(Number(m.punkte));
      if (!tn || !(p >= 0 && p <= PUNKTE.vergabeMax)) break;
      z.vergaben.push({ id: tn.id, punkte: p, zeit: jetzt });
      tn.meldung = null;
      if (z.aufgerufen === tn.id) z.aufgerufen = null;
      r.geaendert = true;
      break;
    }
    case 'rueckgaengig':
      if (z.vergaben.length) { z.vergaben.pop(); r.geaendert = true; }
      break;
    case 'verstecken': {
      const k = begriffSchluessel(m.schluessel);
      if (!k) break;
      const i = z.versteckt.indexOf(k);
      if (i >= 0) z.versteckt.splice(i, 1);
      else z.versteckt.push(k);
      r.geaendert = true;
      break;
    }
    case 'frageBeantwortet': {
      // Frage erledigt: roten Status beenden, keine Punkte
      const tn = z.tn[m.id];
      if (!tn) break;
      if (tn.meldung === 'frage') tn.meldung = null;
      if (z.aufgerufen === tn.id) z.aufgerufen = null;
      r.geaendert = true;
      break;
    }
    case 'meldungLoeschen':
      if (z.tn[m.id] && z.tn[m.id].meldung) { z.tn[m.id].meldung = null; r.geaendert = true; }
      break;
    case 'passwortZuruecksetzen':
      if (z.tn[m.id]) { z.tn[m.id].hash = null; r.geaendert = true; }
      break;
    case 'tnEntfernen': {
      const id = m.id;
      if (!z.tn[id]) break;
      delete z.tn[id];
      z.reihenfolge = z.reihenfolge.filter(x => x !== id);
      delete z.umfrage[id]; delete z.wolke[id]; delete z.sortieren[id]; delete z.spiel[id];
      delete z.sprachen[id]; delete z.grafik[id]; delete z.gruppen.zuordnung[id]; delete z.test[id];
      z.vergaben = z.vergaben.filter(v => v.id !== id);
      if (z.aufgerufen === id) z.aufgerufen = null;
      if (laufend) laufend.delete(id);
      r.abmelden.push(id);
      r.geaendert = true;
      break;
    }
    case 'zuschauerErstellen':
      // neuer Link – ein alter wird damit ungültig
      z.zuschauerCode = zufallsId(16);
      r.geaendert = true;
      break;
    case 'zuschauerLoeschen':
      if (z.zuschauerCode) { z.zuschauerCode = null; r.geaendert = true; }
      break;
    case 'exportiert':
      if (!z.exportiert) { z.exportiert = true; r.geaendert = true; }
      break;
    case 'aufdecken':
      if (!Number.isInteger(m.karte) || m.karte < 0 || m.karte > 15 || z.aufgedeckt.includes(m.karte)) break;
      z.aufgedeckt.push(m.karte);
      r.geaendert = true;
      break;
  }
  return r;
}

/* ---------- Ansichten ---------- */

export function siegerListe(z) {
  return Object.entries(z.spiel)
    .filter(([id]) => z.tn[id])
    .map(([id, punkte]) => ({ id, name: z.tn[id].name, punkte }))
    .sort((a, b) => b.punkte - a.punkte || a.name.localeCompare(b.name, 'de'));
}

function gruppenAnsicht(z, kx) {
  const name = id => ({ id, name: z.tn[id].name, online: kx.online.has(id) });
  return {
    anzahl: z.gruppen.anzahl,
    selbstWahl: z.gruppen.selbstWahl,
    kapazitaet: gruppenKapazitaet(z),
    liste: Array.from({ length: z.gruppen.anzahl }, (_, g) => ({ g, mitglieder: gruppenMitglieder(z, g).map(name) })),
    ohne: z.reihenfolge.filter(id => z.tn[id] && z.gruppen.zuordnung[id] === undefined).map(name),
  };
}

function puzzleAnsicht(z, kx) {
  if (!z.puzzle) return null;
  return {
    start: z.puzzle.start,
    abschnitte: ABSCHNITTE.length,
    gruppen: z.puzzle.gruppen.map((gs, g) => ({
      g, phase: gs.phase, abschnitt: gs.abschnitt, sperreBis: gs.sperreBis, fehlversuche: gs.fehlversuche,
      fertigNach: gs.fertigNach, platz: gs.platz,
      mitglieder: gruppenMitglieder(z, g).map(id => ({
        id, name: z.tn[id].name, online: kx.online.has(id), aktiv: aktiv(kx, id),
        experten: z.puzzle.experten[id] || [], gelesen: !!gs.gelesen[id], abgegeben: !!gs.abgaben[id],
      })),
    })).filter(e => e.mitglieder.length || e.platz),
  };
}

function sprachenAnsicht(z) {
  const je = Object.fromEntries(SPRACH_CODES.map(c => [c, 0]));
  const niveaus = [0, 0, 0];
  let fertig = 0, begonnen = 0;
  for (const [id, s] of Object.entries(z.sprachen)) {
    if (!z.tn[id]) continue;
    begonnen++;
    je[s.sprache]++;
    niveaus[s.niveau]++;
    if (s.fragen.every(f => f.richtig)) fertig++;
  }
  return { je, niveaus, begonnen, fertig };
}

function grafikAnsicht(z) {
  const punkte = { europa: [], koerper: [], skelett: [] };
  const aufgaben = GRAFIK_AUFGABEN.map(() => ({ treffer: 0, daneben: 0 }));
  let fertig = 0, begonnen = 0;
  for (const [id, g] of Object.entries(z.grafik)) {
    if (!z.tn[id]) continue;
    begonnen++;
    if (g.aufgaben.every(grafikErledigt)) fertig++;
    g.aufgaben.forEach((a, i) => {
      for (const v of a.versuche) {
        punkte[GRAFIK_AUFGABEN[i].bild].push({ x: v.x, y: v.y, ok: v.ok });
        if (v.ok) aufgaben[i].treffer++; else aufgaben[i].daneben++;
      }
    });
  }
  return { punkte, aufgaben, begonnen, fertig };
}

// Alles, was der Beamer braucht.
export function beamerAnsicht(z, kx) {
  const online = kx.online, jetzt = kx.jetzt;
  const modus = modusVon(z);
  const hoechste = hoechstePunktzahl(z);
  const tn = z.reihenfolge.filter(id => z.tn[id]).map(id => {
    const t = z.tn[id];
    return {
      id, name: t.name, online: online.has(id), meldung: t.meldung,
      punkte: punkteVon(z, id), spiel: z.spiel[id] ?? null, ohnePasswort: !t.hash,
      seit: t.seit, noten: notenVon(z, id, hoechste),   // seit + noten nur für die Lehrkraft (Export)
    };
  });

  const stimmen = UMFRAGE_OPTIONEN.map(() => 0);
  let abgestimmt = 0;
  for (const [id, liste] of Object.entries(z.umfrage)) {
    if (!z.tn[id] || !liste.length) continue;
    abgestimmt++;
    for (const o of liste) stimmen[o]++;
  }

  // Wortwolke: gleiche Begriffe zusammenfassen, häufigste Schreibweise anzeigen
  const gruppen = new Map();
  let abgeschickt = 0;
  for (const id of z.reihenfolge) {
    const liste = z.wolke[id];
    if (!liste || !z.tn[id]) continue;
    abgeschickt++;
    for (const b of liste) {
      const k = begriffSchluessel(b);
      let g = gruppen.get(k);
      if (!g) { g = { schluessel: k, anzahl: 0, schreibweisen: new Map() }; gruppen.set(k, g); }
      g.anzahl++;
      g.schreibweisen.set(b, (g.schreibweisen.get(b) || 0) + 1);
    }
  }
  const versteckt = new Set(z.versteckt);
  const wolke = [...gruppen.values()].map(g => {
    let text = '', best = 0;
    for (const [s, n] of g.schreibweisen) if (n > best) { best = n; text = s; }
    return { schluessel: g.schluessel, text, anzahl: g.anzahl, versteckt: versteckt.has(g.schluessel) };
  });

  const sortierFertig = [];
  let sortierBegonnen = 0;
  for (const id of z.reihenfolge) {
    const s = z.sortieren[id];
    if (!s || !z.tn[id]) continue;
    sortierBegonnen++;
    if (s.richtig.every(Boolean)) sortierFertig.push({ id, name: z.tn[id].name, punkte: sortierPunkte(s) });
  }

  const letzte = z.vergaben[z.vergaben.length - 1];
  return {
    durchgang: z.durchgang,
    schritt: z.schritt,
    modus: modusVon(z),
    schrittSeit: z.schrittSeit,
    serverZeit: jetzt,
    tn,
    aufgerufen: z.aufgerufen,
    vergaben: z.vergaben.length,
    letzteVergabe: letzte && z.tn[letzte.id] ? { name: z.tn[letzte.id].name, punkte: letzte.punkte } : null,
    umfrage: { stimmen, abgestimmt },
    wolke: { begriffe: wolke, abgeschickt },
    sortieren: { fertig: sortierFertig, begonnen: sortierBegonnen },
    spiel: siegerListe(z),
    exportiert: z.exportiert,
    aufgedeckt: z.aufgedeckt,
    sprachen: modus === 'sprachen' ? sprachenAnsicht(z) : null,
    grafik: modus === 'grafik' ? grafikAnsicht(z) : null,
    gruppen: ['gruppen', 'puzzle', 'gruppensieg'].includes(modus) ? gruppenAnsicht(z, kx) : null,
    puzzle: ['puzzle', 'gruppensieg'].includes(modus) ? puzzleAnsicht(z, kx) : null,
    puzzleRangliste: modus === 'gruppensieg' ? puzzleRangliste(z) : null,
    test: modus === 'test' ? testAnsicht(z, kx) : null,
    notenspiegel: modus === 'notenspiegel' ? notenspiegel(z) : null,
  };
}

// Zuschauer sehen nichts, was nur die Lehrkraft braucht (Noten, Anmeldezeiten)
export function ohneLehrerDaten(v) {
  return Object.assign({}, v, { tn: v.tn.map(({ noten, seit, ...t }) => t) });
}

function testAnsicht(z, kx) {
  const vorbei = testVorbei(z, kx.jetzt);
  const liste = Object.entries(z.test).filter(([id]) => z.tn[id]).map(([, t]) => t);
  return {
    start: z.testStart, dauer: TEST_DAUER_MS, vorbei,
    begonnen: liste.length, abgegeben: liste.filter(t => t.abgegeben || vorbei).length,
  };
}

// Anonym: nur wie oft jede Note vorkommt
function notenspiegel(z) {
  const noten = [0, 0, 0, 0, 0, 0];
  for (const id of Object.keys(z.test)) {
    const e = z.tn[id] ? testErgebnis(z, id) : null;
    if (e) noten[e.note - 1]++;
  }
  const n = noten.reduce((a, b) => a + b, 0);
  const schnitt = n ? noten.reduce((s, x, i) => s + x * (i + 1), 0) / n : null;
  return { noten, teilgenommen: n, schnitt };
}

// Reihenfolge der Schritte auf einem Handy: je Person anders, aber immer gleich
function zufallsReihe(seed, n) {
  let h = 2166136261;
  for (const c of seed) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); }
  const zufall = () => {
    h = (h + 0x6D2B79F5) | 0;
    let t = Math.imul(h ^ (h >>> 15), 1 | h);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const a = Array.from({ length: n }, (_, i) => i);
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(zufall() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function gemischt(seed) {
  const a = zufallsReihe(seed, PFLEGEPROZESS.length);
  if (a.every((x, i) => x === i)) a.push(a.shift());   // nie schon richtig sortiert
  return a;
}

export function tnAnsicht(z, id, kx = kontext()) {
  const t = z.tn[id];
  if (!t) return null;
  const modus = modusVon(z);
  const p = punkteVon(z, id);
  const rangliste = z.reihenfolge.filter(x => z.tn[x]).map(x => punkteVon(z, x).gesamt).sort((a, b) => b - a);
  const a = {
    durchgang: z.durchgang,
    schritt: z.schritt,
    modus,
    name: t.name,
    punkte: p.gesamt,
    platz: rangliste.indexOf(p.gesamt) + 1,
    anzahl: rangliste.length,
    serverZeit: kx.jetzt,
  };
  if (modus === 'umfrage') a.umfrage = z.umfrage[id] || [];
  if (modus === 'wortwolke') a.wolke = z.wolke[id] || null;
  if (modus === 'punkte') { a.meldung = t.meldung; a.dran = z.aufgerufen === id; }
  if (modus === 'sortieren') {
    const s = z.sortieren[id];
    a.sortieren = {
      ordnung: gemischt(z.epoche + id),
      richtig: s ? s.richtig : PFLEGEPROZESS.map(() => false),
      falsch: s ? s.falsch : PFLEGEPROZESS.map(() => []),
      fehler: s ? s.fehler : 0,
      punkte: sortierPunkte(s),
    };
  }
  if (modus === 'spiel' || modus === 'siegerehrung') a.spielBest = z.spiel[id] || 0;
  if (modus === 'sprachen') {
    const s = z.sprachen[id];
    a.sprachen = s ? { sprache: s.sprache, niveau: s.niveau, fragen: s.fragen } : null;
  }
  if (modus === 'grafik') {
    const g = z.grafik[id];
    a.grafik = {
      aufgaben: GRAFIK_AUFGABEN.map((_, i) => {
        const v = g ? g.aufgaben[i].versuche : [];
        return { versuche: v.map(x => ({ ok: x.ok, teil: x.teil })), erledigt: g ? grafikErledigt(g.aufgaben[i]) : false };
      }),
      punkte: grafikPunkte(g),
    };
  }
  if (modus === 'gruppen' || modus === 'puzzle' || modus === 'gruppensieg') {
    const g = z.gruppen.zuordnung[id];
    a.gruppe = {
      g: g ?? null,
      selbstWahl: z.gruppen.selbstWahl,
      anzahl: z.gruppen.anzahl,
      kapazitaet: gruppenKapazitaet(z),
      belegung: Array.from({ length: z.gruppen.anzahl }, (_, i) => gruppenMitglieder(z, i).length),
      mitglieder: g === undefined ? [] : gruppenMitglieder(z, g).map(x => z.tn[x].name),
    };
  }
  if (modus === 'puzzle' && z.puzzle) {
    const g = z.gruppen.zuordnung[id];
    const gs = g !== undefined ? z.puzzle.gruppen[g] : null;
    if (gs) {
      const mitglieder = gruppenMitglieder(z, g);
      a.puzzle = {
        phase: gs.phase, abschnitt: gs.abschnitt, sperreBis: gs.sperreBis, meldung: gs.meldung,
        platz: gs.platz, fertigNach: gs.fertigNach, start: z.puzzle.start,
        experten: z.puzzle.experten[id] || [],
        // Texte von Mitgliedern, die länger getrennt sind, werden für die Gruppe freigegeben
        freigegeben: mitglieder.filter(x => x !== id && !aktiv(kx, x)).map(x => ({ name: z.tn[x].name, experten: z.puzzle.experten[x] || [] })),
        mitglieder: mitglieder.map(x => ({
          name: z.tn[x].name, ich: x === id, aktiv: aktiv(kx, x),
          gelesen: !!gs.gelesen[x], abgegeben: !!gs.abgaben[x],
        })),
        gelesen: !!gs.gelesen[id],
        abgabe: gs.abgaben[id] || null,
      };
    }
  }
  if (modus === 'test' || modus === 'notenspiegel') {
    const t = z.test[id];
    const abgegeben = (!!t && t.abgegeben) || testVorbei(z, kx.jetzt) || modus === 'notenspiegel';
    const e = abgegeben ? testErgebnis(z, id) : null;
    a.test = {
      start: z.testStart, dauer: TEST_DAUER_MS,
      // Fragen und Antworten je Person anders gemischt, aber nach Neuladen gleich
      reihenfolge: zufallsReihe(z.epoche + id + 'test', TEST_FRAGEN.length),
      optionen: TEST_FRAGEN.map((f, q) => zufallsReihe(z.epoche + id + 'frage' + q, f.optionen.length)),
      begonnen: !!t, antworten: t ? t.antworten : null, abgegeben,
      ergebnis: e ? { richtig: e.richtig, von: e.von, prozent: e.prozent, note: e.note, falsch: e.falsch } : null,
    };
  }
  // Nach dem Export sieht jede*r die eigenen Noten (nur auf dem eigenen Handy)
  if (z.exportiert && z.schritt >= ABLAUF.findIndex(s => s.final)) {
    a.noten = notenVon(z, id, hoechstePunktzahl(z));
  }
  if (modus === 'gruppensieg' && z.puzzle) {
    const g = z.gruppen.zuordnung[id];
    const gs = g !== undefined ? z.puzzle.gruppen[g] : null;
    a.puzzle = gs ? { platz: gs.platz, fertigNach: gs.fertigNach } : null;
  }
  return a;
}
