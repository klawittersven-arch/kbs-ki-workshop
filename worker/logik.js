/*
 * Spiellogik des Workshops ohne Cloudflare-Bezug (damit sie sich auch einzeln testen lässt).
 * Der gesamte Zustand ist ein einfaches Objekt, das der Durable Object (index.js) speichert.
 * Punkte werden nie als Zahl gespeichert, sondern immer aus den Einzelteilen berechnet –
 * so stimmen sie auch, wenn eine Stimme zurückgenommen oder ein Begriff ausgeblendet wird.
 */
import {
  ABLAUF, UMFRAGE_OPTIONEN, UMFRAGE_KEINE, WOLKE_MAX_BEGRIFFE, PFLEGEPROZESS, PUNKTE,
  begriffSchluessel, begriffBereinigen, begriffGueltig, sortierPunkte,
} from '../public/js/gemeinsam.js';

export { ABLAUF };

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
  };
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
// laufend: Map id → Punkte der Spielrunden, die gerade laufen (nur im Speicher).
export function schrittSetzen(z, neu, jetzt = Date.now(), laufend = null) {
  neu = Math.max(0, Math.min(ABLAUF.length - 1, neu | 0));
  if (neu === z.schritt) return false;
  const alt = modusVon(z);
  z.schritt = neu;
  z.schrittSeit = jetzt;
  const jetztModus = modusVon(z);
  if (alt === 'spiel' && laufend) {
    // Wer beim Beenden gerade spielt, behält den Stand der laufenden Runde
    for (const [id, p] of laufend) if (z.tn[id]) z.spiel[id] = Math.max(z.spiel[id] || 0, p);
    laufend.clear();
  }
  if (jetztModus === 'punkte' && alt !== 'punkte') {
    for (const t of Object.values(z.tn)) t.meldung = null;
    z.aufgerufen = null;
  }
  return true;
}

/* ---------- Punkte ---------- */

export function punkteVon(z, id) {
  const umfrage = (z.umfrage[id] || []).length * PUNKTE.jeStimme;
  const versteckt = new Set(z.versteckt);
  const wolke = (z.wolke[id] || []).filter(b => !versteckt.has(begriffSchluessel(b))).length * PUNKTE.jeBegriff;
  const sortieren = sortierPunkte(z.sortieren[id]);
  let muendlich = 0;
  for (const v of z.vergaben) if (v.id === id) muendlich += v.punkte;
  return { umfrage, wolke, sortieren, muendlich, gesamt: umfrage + wolke + sortieren + muendlich };
}

/* ---------- Aktionen der Handys ---------- */

// Gibt true zurück, wenn sich etwas geändert hat, das Beamer und Handys sehen.
export function tnAktion(z, id, m, jetzt = Date.now(), laufend = null) {
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
export function lehrerAktion(z, m, jetzt = Date.now(), laufend = null) {
  const r = { geaendert: false, abmelden: [] };
  if (!m || typeof m !== 'object') return r;
  switch (m.type) {
    case 'weiter': r.geaendert = schrittSetzen(z, z.schritt + 1, jetzt, laufend); break;
    case 'zurueck': r.geaendert = schrittSetzen(z, z.schritt - 1, jetzt, laufend); break;
    case 'springen': r.geaendert = schrittSetzen(z, m.schritt, jetzt, laufend); break;
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

// Alles, was der Beamer braucht. online: Set der verbundenen ids.
export function beamerAnsicht(z, online, jetzt = Date.now()) {
  const tn = z.reihenfolge.filter(id => z.tn[id]).map(id => {
    const t = z.tn[id];
    return {
      id, name: t.name, online: online.has(id), meldung: t.meldung,
      punkte: punkteVon(z, id), spiel: z.spiel[id] ?? null, ohnePasswort: !t.hash,
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
  };
}

// Reihenfolge der Schritte auf einem Handy: je Person anders, aber immer gleich
function gemischt(seed) {
  let h = 2166136261;
  for (const c of seed) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); }
  const zufall = () => {
    h = (h + 0x6D2B79F5) | 0;
    let t = Math.imul(h ^ (h >>> 15), 1 | h);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const a = PFLEGEPROZESS.map((_, i) => i);
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(zufall() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  if (a.every((x, i) => x === i)) a.push(a.shift());   // nie schon richtig sortiert
  return a;
}

export function tnAnsicht(z, id) {
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
  return a;
}
