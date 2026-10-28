/*
 * Handy-Ansicht der Teilnehmenden. Was zu sehen ist, bestimmt die Lehrkraft am Beamer:
 * Der Server schickt nach jeder Änderung die aktuelle „ansicht“ (Modus, Punkte, …).
 * Bei einem neuen Modus wird der Bildschirm neu aufgebaut, sonst nur aktualisiert –
 * so gehen angefangene Eingaben nicht verloren.
 */
import {
  UMFRAGE_OPTIONEN, UMFRAGE_KEINE, WOLKE_MAX_BEGRIFFE, WOLKE_MAX_LAENGE, PFLEGEPROZESS, LERNKARTEN, PUNKTE_SICHTBAR_AB, begriffGueltig, sortierPunkte, PUNKTE,
  SPRACHEN_LOESUNG, sprachPunkte, GRAFIK_AUFGABEN, GRAFIK_VERSUCHE, grafikPunkte, gruppeInfo, puzzlePunkte, NOTEN_NAMEN,
} from './gemeinsam.js';
import { TEST_FRAGEN } from './inhalte-test.js';
import { SPRACHEN, FLAGGEN, INHALT } from './inhalte-sprachen.js';
import { FALL, EXPERTEN, PUZZLE_FRAGEN, ABSCHNITTE } from './inhalte-puzzle.js';
import { KOERPER, SKELETT, TEILE, europaSvg } from './grafik-koerper.js';
import { handyVerbindung } from './verbindung.js';

const $ = (sel, wurzel = document) => wurzel.querySelector(sel);
const app = $('#app');

function esc(s) {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function sitzung(k, w) {
  try {
    if (w === undefined) return JSON.parse(sessionStorage.getItem('kbs-ki-workshop:' + k));
    sessionStorage.setItem('kbs-ki-workshop:' + k, JSON.stringify(w));
  } catch (e) { return null; }
  return null;
}

let toastTimer = null;
function toast(text, art = '', dauer = 2200) {
  const t = $('#toast');
  t.textContent = text;
  t.className = 'zeigen ' + art;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { t.className = art; }, dauer);
}

function vibrieren(ms) {
  try { if (navigator.vibrate) navigator.vibrate(ms); } catch (e) { /* egal */ }
}

/* =====================================================================
   Verbindung und Zustand
   ===================================================================== */
let a = null;            // aktuelle Ansicht vom Server
let schluessel = '';     // welcher Bildschirm gerade aufgebaut ist
let bildschirm = null;   // { aktualisieren(a), abbauen() }
let angemeldet = false;
let punkteVorher = null;

const verbindung = handyVerbindung({
  onStatus(s) { $('#getrennt').hidden = s !== 'getrennt'; },
  onNachricht(m) {
    if (m.type === 'abgemeldet') {
      angemeldet = false;
      a = null;
      punkteVorher = null;
      $('#ich').hidden = true;
      if (schluessel !== 'login') zeigeAnmeldung();
      return;
    }
    if (m.type === 'anmeldefehler') { anmeldeFehler(m.fehler); return; }
    if (m.type === 'angemeldet') {
      angemeldet = true;
      if (m.neu) toast('Willkommen, ' + m.name + '!', 'gut');
      return;
    }
    if (m.type === 'ansicht' && m.a) {
      angemeldet = true;
      a = m.a;
      kopfzeile();
      darstellen();
    }
  },
});
const senden = m => verbindung.senden(m);

function kopfzeile() {
  const sichtbar = a.schritt >= PUNKTE_SICHTBAR_AB;
  $('#ich').hidden = false;
  $('#ich-name').textContent = a.name;
  const b = $('#ich-punkte');
  b.hidden = !sichtbar;
  b.textContent = a.punkte + ' P.';
  if (sichtbar && punkteVorher !== null && a.punkte !== punkteVorher) {
    b.classList.remove('puls'); void b.offsetWidth; b.classList.add('puls');
    if (a.modus === 'punkte' && a.punkte > punkteVorher) {
      toast('+' + (a.punkte - punkteVorher) + ' Punkte! 🎉', 'gut gross', 2600);
      vibrieren([60, 40, 60]);
    }
  }
  punkteVorher = sichtbar ? a.punkte : null;
}

function darstellen() {
  const k = a.durchgang + ':' + a.schritt + ':' + a.modus;
  if (k !== schluessel) {
    if (bildschirm && bildschirm.abbauen) bildschirm.abbauen();
    schluessel = k;
    window.scrollTo(0, 0);
    const bauer = BILDSCHIRME[a.modus] || BILDSCHIRME.folie;
    bildschirm = bauer(a) || {};
  }
  if (bildschirm.aktualisieren) bildschirm.aktualisieren(a);
}

/* =====================================================================
   Anmeldung
   ===================================================================== */
const FEHLER = {
  vorname: 'Bitte gib deinen Vornamen ein (nur Buchstaben, höchstens 20).',
  initiale: 'Bitte gib den Anfangsbuchstaben deines Nachnamens ein (genau ein Buchstabe).',
  'passwort-kurz': 'Das Passwort braucht mindestens 3 Zeichen.',
  'passwort-lang': 'Das Passwort ist zu lang (höchstens 40 Zeichen).',
  'name-belegt': 'Diesen Namen gibt es schon, aber das Passwort passt nicht. Bist du das? Dann prüfe dein Passwort. Bist du jemand anderes? Dann hänge eine Zahl an deinen Vornamen, z. B. „Anna2“.',
  gesperrt: 'Zu viele falsche Versuche mit diesem Namen – warte bitte eine Minute.',
  voll: 'Es sind schon sehr viele Personen angemeldet. Bitte melde dich bei der Lehrkraft.',
  nochmal: 'Das hat nicht geklappt – bitte noch einmal versuchen.',
};

function zeigeAnmeldung() {
  if (bildschirm && bildschirm.abbauen) bildschirm.abbauen();
  bildschirm = null;
  schluessel = 'login';
  const gemerkt = sitzung('name') || {};
  app.innerHTML = `<h1>Willkommen zum KI-Workshop!</h1>
    <form class="karte" id="anmelden" novalidate autocomplete="off">
      <label for="vorname">Vorname</label>
      <input class="feld" id="vorname" maxlength="20" autocapitalize="words" spellcheck="false" value="${esc(gemerkt.vorname)}">
      <label for="initiale">Anfangsbuchstabe deines Nachnamens</label>
      <input class="feld kurz" id="initiale" maxlength="1" autocapitalize="characters" spellcheck="false" value="${esc(gemerkt.initiale)}">
      <label for="passwort">Passwort <small>(mind. 3 Zeichen, Groß-/Kleinschreibung egal)</small></label>
      <div class="pw-zeile"><input class="feld" id="passwort" type="password" maxlength="40" autocapitalize="none" spellcheck="false"><button type="button" id="pw-zeigen">zeigen</button></div>
      <p class="notiz">✍️ Notier dir dein Passwort! Damit kommst du jederzeit wieder rein.</p>
      <p class="fehler" id="anmelde-fehler" role="alert"></p>
      <button class="knopf" type="submit" id="mitmachen">Mitmachen</button>
    </form>
    <p class="leise">Schon einmal angemeldet (z. B. Browser geschlossen)? Gib einfach denselben Namen und dasselbe Passwort ein – deine Punkte bleiben erhalten.</p>`;
  const pw = $('#passwort');
  $('#pw-zeigen').addEventListener('click', () => {
    pw.type = pw.type === 'password' ? 'text' : 'password';
    $('#pw-zeigen').textContent = pw.type === 'password' ? 'zeigen' : 'verbergen';
  });
  $('#anmelden').addEventListener('submit', e => {
    e.preventDefault();
    const vorname = $('#vorname').value.trim();
    const initiale = $('#initiale').value.trim();
    const passwort = pw.value.trim();
    const f = $('#anmelde-fehler');
    if (!/^\p{L}[\p{L}\p{N}' -]{0,19}$/u.test(vorname)) { f.textContent = FEHLER.vorname; $('#vorname').focus(); return; }
    if (!/^\p{L}$/u.test(initiale)) { f.textContent = FEHLER.initiale; $('#initiale').focus(); return; }
    if (passwort.length < 3) { f.textContent = FEHLER['passwort-kurz']; pw.focus(); return; }
    f.textContent = '';
    sitzung('name', { vorname, initiale });
    $('#mitmachen').disabled = true;
    $('#mitmachen').textContent = 'Einen Moment …';
    verbindung.anmelden({ vorname, initiale, passwort });
  });
  $('#initiale').addEventListener('input', e => { e.target.value = e.target.value.toUpperCase(); });
}

function anmeldeFehler(code) {
  if (schluessel !== 'login') zeigeAnmeldung();
  $('#anmelde-fehler').textContent = FEHLER[code] || FEHLER.nochmal;
  $('#mitmachen').disabled = false;
  $('#mitmachen').textContent = 'Mitmachen';
}

/* =====================================================================
   Bildschirme
   ===================================================================== */
// Nach dem Export des Punktestands: die eigenen Noten (nur auf dem eigenen Handy)
function notenHtml(a) {
  if (!a.noten) return '';
  const n = a.noten;
  return `<div class="karte noten-karte"><h2>Deine Noten</h2>
    <div class="noten-zeile"><span>mündlich</span><b>${n.muendlich ?? '–'}</b></div>
    <div class="noten-zeile"><span>schriftlich (Test)</span><b>${n.schriftlich ?? '–'}</b></div>
    <p class="leise klein">🔒 Nur du siehst deine Noten.${n.test ? ` Test: ${n.test.richtig} von ${n.test.von} richtig.` : ''}</p></div>`;
}

function warten({ symbol, modus, text, mitPunkten = true }) {
  app.innerHTML = `<div class="warten"><div class="symbol">${symbol}</div>${modus ? `<div class="modus">${esc(modus)}</div>` : ''}
    <p class="gross">${text}</p><div class="stand"></div><div class="noten"></div></div>`;
  return {
    aktualisieren(a) {
      const s = $('.stand', app);
      if (!s) return;
      s.innerHTML = mitPunkten && a.schritt >= PUNKTE_SICHTBAR_AB
        ? `Deine Punkte: <b>${a.punkte}</b> · Platz ${a.platz} von ${a.anzahl}` : '';
      $('.noten', app).innerHTML = notenHtml(a);
    },
  };
}

const BILDSCHIRME = {
  login(a) {
    return warten({ symbol: '🎉', text: `Du bist dabei, ${esc(a.name)}!<br>Gleich geht’s los – richte deine Aufmerksamkeit nach vorne.` });
  },

  folie() {
    return warten({ symbol: '📽️', modus: 'PRÄSENTATIONS-MODUS', text: 'Richte deine Aufmerksamkeit nach vorne, leg dein Smartphone erstmal zur Seite.' });
  },

  video() {
    return warten({ symbol: '🎵', modus: 'PRÄSENTATIONS-MODUS', text: 'Richte deine Aufmerksamkeit nach vorne, leg dein Smartphone erstmal zur Seite.' });
  },

  siegerehrung(a) {
    const s = warten({ symbol: '🏆', modus: 'SIEGEREHRUNG', text: 'Richte deine Aufmerksamkeit nach vorne, leg dein Smartphone erstmal zur Seite.', mitPunkten: false });
    if (a.spielBest) $('.stand', app).insertAdjacentHTML('afterend', `<p class="leise" style="margin-top:20px">Dein bester Lauf: <b>${a.spielBest}</b> Punkte</p>`);
    return s;
  },

  /* ---------- Demo 1: Abstimmung ---------- */
  umfrage() {
    app.innerHTML = `<h1>Wozu nutzt du KI momentan schon?</h1><p class="leise">Mehrere Antworten möglich.</p>
      <div id="optionen">${UMFRAGE_OPTIONEN.map((o, i) => `<button class="option" data-o="${i}"><span class="haken">✓</span><span>${esc(o)}</span></button>`).join('')}</div>
      <p class="danke"></p>`;
    let meine = [];
    let zuletztGetippt = 0;
    app.querySelectorAll('.option').forEach(b => b.addEventListener('click', () => {
      const o = +b.dataset.o;
      const an = !meine.includes(o);
      zuletztGetippt = Date.now();
      // sofort anzeigen, der Server bestätigt gleich
      meine = an ? (o === UMFRAGE_KEINE ? [o] : meine.filter(x => x !== UMFRAGE_KEINE).concat(o)) : meine.filter(x => x !== o);
      zeigen();
      senden({ type: 'stimme', option: o, an });
      vibrieren(15);
    }));
    function zeigen() {
      app.querySelectorAll('.option').forEach(b => b.classList.toggle('an', meine.includes(+b.dataset.o)));
      $('.danke', app).textContent = meine.length ? '✓ Deine Stimme ist angekommen – schau nach vorne!' : '';
    }
    // Während schnell hintereinander getippt wird, gilt die eigene Auswahl (der Server zieht nach)
    return { aktualisieren(a) { if (Date.now() - zuletztGetippt > 900) meine = a.umfrage || []; zeigen(); } };
  },

  /* ---------- Demo 2: Wortwolke ---------- */
  wortwolke(a) {
    let abgeschickt = false;
    function formular() {
      const gemerkt = sitzung('begriffe') || [];
      app.innerHTML = `<h1>Was sind die ersten Begriffe, die dir spontan zum Thema KI einfallen?</h1>
        <p class="leise">Bis zu ${WOLKE_MAX_BEGRIFFE} Begriffe – jeder in ein eigenes Feld.</p>
        <form class="karte" id="begriffe" novalidate autocomplete="off">
        ${Array.from({ length: WOLKE_MAX_BEGRIFFE }, (_, i) => `<input class="feld begriff" maxlength="${WOLKE_MAX_LAENGE}" placeholder="Begriff ${i + 1}" autocapitalize="sentences" value="${esc(gemerkt[i])}">`).join('')}
        <p class="fehler" id="wolke-fehler" role="alert"></p>
        <button class="knopf" type="submit">Abschicken</button></form>`;
      const felder = [...app.querySelectorAll('.begriff')];
      felder.forEach(f => f.addEventListener('input', () => sitzung('begriffe', felder.map(x => x.value))));
      $('#begriffe').addEventListener('submit', e => {
        e.preventDefault();
        const liste = felder.map(f => f.value.trim()).filter(Boolean);
        const gueltig = liste.filter(begriffGueltig);
        if (!gueltig.length) { $('#wolke-fehler').textContent = 'Bitte gib mindestens einen Begriff ein (mindestens 2 Buchstaben).'; return; }
        senden({ type: 'begriffe', liste: gueltig });
        sitzung('begriffe', []);
        fertig(gueltig);
        vibrieren(30);
      });
    }
    function fertig(liste) {
      abgeschickt = true;
      app.innerHTML = `<div class="warten"><div class="symbol">☁️</div><div class="modus">BEGRIFFE ERFOLGREICH ABGESCHICKT</div>
        <p class="gross">Richte deine Aufmerksamkeit nach vorne, leg dein Smartphone erstmal zur Seite.</p>
        <p class="leise">Deine Begriffe: ${liste.map(esc).join(' · ')}</p></div>`;
    }
    if (a.wolke) fertig(a.wolke); else formular();
    return { aktualisieren(a) { if (a.wolke && !abgeschickt) fertig(a.wolke); } };
  },

  /* ---------- Punktestand: melden ---------- */
  punkte() {
    app.innerHTML = `<div id="dran"></div><h1>Melden</h1>
      <div class="melden">
        <button class="melde-knopf frage" data-art="frage"><span>✋ Ich habe eine Frage</span><small></small></button>
        <button class="melde-knopf antwort" data-art="antwort"><span>💡 Ich habe eine Antwort</span><small></small></button>
      </div><p class="stand-zeile"></p><div class="noten"></div>`;
    let meldung = null;
    let zuletztGetippt = 0;
    app.querySelectorAll('.melde-knopf').forEach(b => b.addEventListener('click', () => {
      const art = meldung === b.dataset.art ? null : b.dataset.art;
      meldung = art;
      zuletztGetippt = Date.now();
      zeigen();
      senden({ type: 'melden', art });
      vibrieren(20);
    }));
    let warDran = false;
    let serverMeldung = null;
    let punkteZuvor = null;
    function zeigen() {
      app.querySelectorAll('.melde-knopf').forEach(b => {
        const an = meldung === b.dataset.art;
        b.classList.toggle('aktiv', an);
        b.classList.toggle('gedimmt', !!meldung && !an);
        $('small', b).textContent = an ? 'gemeldet – nochmal tippen zum Zurücknehmen' : '';
      });
    }
    return {
      aktualisieren(a) {
        // Lehrkraft hat die Frage als beantwortet markiert (ohne Punkte)
        if (serverMeldung === 'frage' && a.meldung === null && meldung === 'frage' && a.punkte === punkteZuvor) {
          toast('✓ Deine Frage wurde beantwortet', 'gut', 2600);
        }
        serverMeldung = a.meldung;
        punkteZuvor = a.punkte;
        if (Date.now() - zuletztGetippt > 900) meldung = a.meldung;
        zeigen();
        $('#dran').innerHTML = a.dran ? '<div class="dran">⭐ Du bist dran!</div>' : '';
        if (a.dran && !warDran) vibrieren([100, 60, 100]);
        warDran = a.dran;
        $('.stand-zeile', app).innerHTML = `Deine Punkte: <b>${a.punkte}</b> · Platz ${a.platz} von ${a.anzahl}`;
        $('.noten', app).innerHTML = notenHtml(a);
      },
    };
  },

  /* ---------- Demo 4: Lernkarten ---------- */
  lernkarten() {
    // Lernstand nur auf diesem Handy (übersteht Neuladen)
    let st = sitzung('lernkarten');
    if (!st || !Array.isArray(st.stapel)) st = { stapel: LERNKARTEN.map((_, i) => i), pos: 0, gewusst: [], nochmal: [] };
    const speichern = () => sitzung('lernkarten', st);
    let umgedreht = false;

    function zeigen() {
      if (st.pos >= st.stapel.length) return rundeEnde();
      const nr = st.stapel[st.pos];
      const [vorne, hinten] = LERNKARTEN[nr];
      umgedreht = false;
      app.innerHTML = `<div class="lern-kopf"><span>Karte ${st.pos + 1} von ${st.stapel.length}</span><span>✓ ${st.gewusst.length} von ${LERNKARTEN.length} gewusst</span></div>
        <div class="lern-balken"><i style="width:${100 * st.pos / st.stapel.length}%"></i></div>
        <div class="lernkarte" role="button" tabindex="0" aria-label="Karte umdrehen"><div class="innen">
          <div class="seite vorne"><span class="etikett">LATEIN</span><div class="wort">${esc(vorne)}</div><div class="klein">antippen zum Umdrehen</div></div>
          <div class="seite hinten"><span class="etikett">DEUTSCH</span><div class="wort">${esc(hinten)}</div><div class="klein">${esc(vorne)}</div></div>
        </div></div>
        <div class="bewerten"><button class="nein" disabled>✗ Noch nicht</button><button class="ja" disabled>✓ Gewusst</button></div>`;
      const karte = $('.lernkarte', app);
      const umdrehen = () => {
        karte.classList.toggle('um');
        umgedreht = true;
        app.querySelectorAll('.bewerten button').forEach(b => { b.disabled = false; });
      };
      karte.addEventListener('click', umdrehen);
      karte.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); umdrehen(); } });
      $('.ja', app).addEventListener('click', () => bewerten(nr, true));
      $('.nein', app).addEventListener('click', () => bewerten(nr, false));
    }
    function bewerten(nr, gewusst) {
      if (!umgedreht) return;
      if (gewusst) { if (!st.gewusst.includes(nr)) st.gewusst.push(nr); }
      else st.nochmal.push(nr);
      st.pos++;
      speichern();
      zeigen();
    }
    function rundeEnde() {
      const offen = st.nochmal.slice();
      app.innerHTML = `<div class="warten" style="padding-top:4vh"><div class="symbol">${offen.length ? '💪' : '🌟'}</div>
        <p class="gross">${offen.length ? `Runde geschafft! Noch ${offen.length} ${offen.length === 1 ? 'Karte' : 'Karten'} zum Wiederholen.` : 'Super – alle Karten gewusst!'}</p>
        <button class="knopf" id="weiterlernen">${offen.length ? 'Diese Karten wiederholen' : 'Alle Karten noch einmal'}</button></div>`;
      $('#weiterlernen').addEventListener('click', () => {
        st = offen.length
          ? { stapel: offen, pos: 0, gewusst: st.gewusst, nochmal: [] }
          : { stapel: LERNKARTEN.map((_, i) => i).sort(() => Math.random() - 0.5), pos: 0, gewusst: [], nochmal: [] };
        speichern();
        zeigen();
      });
    }
    zeigen();
    return {};
  },

  /* ---------- Sortieraufgabe ---------- */
  sortieren() {
    app.innerHTML = `<h1>Pflegeprozess nach Fiechter und Meier</h1>
      <p class="leise">Bring die 6 Schritte in die richtige Reihenfolge: Tippe bei jedem Schritt auf seine Nummer (1–6). <b>Jede falsche Zahl kostet 10 Punkte.</b></p>
      <div id="geschafft"></div><div class="sortier-stand"><span class="pkt"></span><span class="feh"></span></div><div id="schritte"></div>`;
    const liste = $('#schritte', app);
    let s = null;
    let warFertig = null;
    function bauen(ordnung) {
      liste.innerHTML = ordnung.map(i => `<div class="schritt-karte" data-i="${i}"><div class="text">${esc(PFLEGEPROZESS[i])}</div>
        <div class="zahlen">${PFLEGEPROZESS.map((_, p) => `<button data-p="${p + 1}">${p + 1}</button>`).join('')}</div></div>`).join('');
      liste.querySelectorAll('.schritt-karte').forEach(karte => {
        const i = +karte.dataset.i;
        karte.querySelectorAll('button').forEach(b => b.addEventListener('click', () => {
          const p = +b.dataset.p;
          if (!s || s.richtig[i] || b.disabled) return;
          // sofortige Rückmeldung; der Server rechnet die Punkte
          if (p === i + 1) {
            s.richtig[i] = true;
            vibrieren(25);
          } else {
            s.falsch[i] = (s.falsch[i] || []).concat(p);
            s.fehler++;
            karte.classList.remove('wackeln'); void karte.offsetWidth; karte.classList.add('wackeln');
            toast('✗ Falsch – 10 Punkte Abzug', 'schlecht', 1400);
            vibrieren([80, 50, 80]);
          }
          s.punkte = sortierPunkte(s);
          zeigen();
          senden({ type: 'sortieren', schritt: i, position: p });
        }));
      });
    }
    function zeigen() {
      const vergeben = new Set(s.richtig.map((r, i) => r ? i + 1 : 0).filter(Boolean));
      liste.querySelectorAll('.schritt-karte').forEach(karte => {
        const i = +karte.dataset.i;
        const geloest = s.richtig[i];
        karte.classList.toggle('geloest', geloest);
        karte.querySelectorAll('button').forEach(b => {
          const p = +b.dataset.p;
          const falsch = (s.falsch[i] || []).includes(p);
          b.classList.toggle('falsch', falsch);
          b.disabled = geloest || falsch || vergeben.has(p);
          b.style.display = geloest && p !== i + 1 ? 'none' : '';
          if (geloest && p === i + 1) { b.textContent = '✓ ' + p; b.classList.add('loesung'); b.style.gridColumn = '1 / -1'; }
        });
      });
      const fertig = s.richtig.every(Boolean);
      $('.sortier-stand .pkt', app).textContent = `Punkte: ${s.punkte} von ${PFLEGEPROZESS.length * PUNKTE.jeSchritt}`;
      $('.sortier-stand .feh', app).textContent = `Fehler: ${s.fehler}`;
      $('#geschafft').innerHTML = fertig ? `<div class="geschafft">🎉 Geschafft! Du bekommst ${s.punkte} Punkte.<br><small>Richte deine Aufmerksamkeit nach vorne.</small></div>` : '';
      if (fertig && warFertig === false) { window.scrollTo({ top: 0, behavior: 'smooth' }); vibrieren([60, 40, 60, 40, 120]); }
      warFertig = fertig;
    }
    return {
      aktualisieren(a) {
        const neu = a.sortieren;
        if (!s) bauen(neu.ordnung);
        s = { richtig: neu.richtig.slice(), falsch: neu.falsch.map(f => f.slice()), fehler: neu.fehler, punkte: neu.punkte };
        zeigen();
      },
    };
  },

  /* ---------- Demo 6: Sprachen ---------- */
  sprachen(a) {
    const tts = 'speechSynthesis' in window ? window.speechSynthesis : null;
    let sprache, niveau;
    let fragen = SPRACHEN_LOESUNG.map(() => ({ versuche: 0, richtig: false }));
    const falsch = SPRACHEN_LOESUNG.map(() => []);   // falsch getippte Antworten (nur auf diesem Handy)
    let zuletztGetippt = 0;
    let liest = false;
    let sig = '';
    if (a.sprachen) {
      sprache = a.sprachen.sprache;
      niveau = a.sprachen.niveau;
    } else {
      // Erster Aufruf: Sprache des Handys vorschlagen, sonst Deutsch
      const vorschlag = String(navigator.language || 'de').slice(0, 2).toLowerCase();
      sprache = SPRACHEN.some(s => s.code === vorschlag) ? vorschlag : 'de';
      niveau = 1;
      senden({ type: 'sprachwahl', sprache, niveau, erstes: true });
    }
    app.innerHTML = `<div class="sprachen">
      <div class="sprach-wahl">${SPRACHEN.map(sp => `<button data-sprache="${sp.code}" lang="${sp.code}"><span class="flagge">${FLAGGEN[sp.code]}</span><span>${esc(sp.eigen)}</span></button>`).join('')}</div>
      <div class="niveau-wahl"></div><div class="sprach-inhalt"></div></div>`;
    const wurzel = $('.sprachen', app);

    function stoppen() {
      if (tts) tts.cancel();
      liest = false;
      const k = $('[data-vorlesen]', wurzel);
      if (k) k.textContent = INHALT[sprache].ui.vorlesen;
    }
    function vorlesen() {
      const ui = INHALT[sprache].ui;
      if (liest) { stoppen(); return; }
      if (!tts) { toast(ui.keineStimme, 'schlecht', 3500); return; }
      const sp = SPRACHEN.find(s => s.code === sprache);
      const stimmen = tts.getVoices();
      const passend = l => String(l).replace('_', '-').toLowerCase();
      const stimme = stimmen.find(v => passend(v.lang) === sp.stimme.toLowerCase()) || stimmen.find(v => passend(v.lang).startsWith(sp.code));
      if (stimmen.length && !stimme) { toast(ui.keineStimme, 'schlecht', 3500); return; }
      // In kurzen Stücken vorlesen – manche Handys brechen lange Texte sonst ab
      const text = INHALT[sprache].titel + '.\n' + INHALT[sprache].texte[niveau];
      const saetze = (text.match(/[^.!?…\n]+[.!?…]*/g) || []).map(s => s.trim()).filter(Boolean);
      tts.cancel();
      liest = true;
      $('[data-vorlesen]', wurzel).textContent = ui.stopp;
      saetze.forEach((satz, i) => {
        const u = new SpeechSynthesisUtterance(satz);
        u.lang = sp.stimme;
        if (stimme) u.voice = stimme;
        u.rate = niveau === 0 ? 0.85 : 0.95;
        if (i === saetze.length - 1) u.onend = stoppen;
        u.onerror = stoppen;
        tts.speak(u);
      });
    }
    function zeichnen() {
      const neu = JSON.stringify([sprache, niveau, fragen, falsch]);
      if (neu === sig) return;
      const textNeu = !sig || JSON.parse(sig)[0] !== sprache || JSON.parse(sig)[1] !== niveau;
      sig = neu;
      const inhalt = INHALT[sprache];
      const ui = inhalt.ui;
      wurzel.querySelectorAll('[data-sprache]').forEach(b => b.classList.toggle('an', b.dataset.sprache === sprache));
      $('.niveau-wahl', wurzel).innerHTML = inhalt.niveaus.map((n, i) => `<button data-niveau="${i}" class="${i === niveau ? 'an' : ''}">${esc(n)}</button>`).join('');
      const fertig = fragen.every(f => f.richtig);
      const scrollY = window.scrollY;
      $('.sprach-inhalt', wurzel).innerHTML = `<article class="karte sprach-text" lang="${sprache}">
          <div class="sprach-titel"><h1>${esc(inhalt.titel)}</h1><button class="vorlese-knopf" data-vorlesen>${esc(liest ? ui.stopp : ui.vorlesen)}</button></div>
          ${inhalt.texte[niveau].split('\n').map(t => `<p>${esc(t)}</p>`).join('')}
        </article>
        <h2 lang="${sprache}">${esc(ui.fragen)}</h2><p class="leise" lang="${sprache}">${esc(ui.hinweis)}</p>
        ${fertig ? `<div class="geschafft" lang="${sprache}">🎉 ${esc(ui.fertig)}<br><small>+${sprachPunkte({ fragen })} P.</small></div>` : ''}
        ${inhalt.fragen[niveau].map((f, q) => `<div class="karte sprach-frage" lang="${sprache}"><p class="frage"><b>${q + 1}.</b> ${esc(f.frage)}</p>
          ${f.optionen.map((o, i) => {
            const richtig = fragen[q].richtig && i === SPRACHEN_LOESUNG[q];
            const fehler = falsch[q].includes(i);
            return `<button class="wahl${richtig ? ' richtig' : ''}${fehler ? ' falsch' : ''}" data-q="${q}" data-o="${i}" ${fragen[q].richtig || fehler ? 'disabled' : ''}>${richtig ? '✓ ' : fehler ? '✗ ' : ''}${esc(o)}</button>`;
          }).join('')}
          ${fragen[q].richtig ? `<p class="rueck gut">${esc(ui.richtig)}</p>` : falsch[q].length ? `<p class="rueck schlecht">${esc(ui.falsch)}</p>` : ''}</div>`).join('')}`;
      if (!textNeu) window.scrollTo(0, scrollY);
    }
    wurzel.addEventListener('click', e => {
      const b = e.target.closest('button');
      if (!b || b.disabled) return;
      if (b.dataset.sprache || b.dataset.niveau) {
        if (b.dataset.sprache) sprache = b.dataset.sprache;
        if (b.dataset.niveau) niveau = +b.dataset.niveau;
        stoppen();
        zuletztGetippt = Date.now();
        zeichnen();
        senden({ type: 'sprachwahl', sprache, niveau });
        vibrieren(15);
      } else if ('vorlesen' in b.dataset) {
        vorlesen();
      } else if (b.dataset.q) {
        const q = +b.dataset.q, o = +b.dataset.o;
        zuletztGetippt = Date.now();
        fragen[q].versuche++;
        if (o === SPRACHEN_LOESUNG[q]) {
          fragen[q].richtig = true;
          vibrieren(25);
          if (fragen.every(f => f.richtig)) { toast('🎉 ' + INHALT[sprache].ui.fertig, 'gut', 2600); vibrieren([60, 40, 60, 40, 120]); }
        } else {
          falsch[q].push(o);
          vibrieren([80, 50, 80]);
        }
        zeichnen();
        senden({ type: 'sprachantwort', frage: q, option: o });
      }
    });
    zeichnen();
    return {
      aktualisieren(a) {
        // Während getippt wird, gilt die eigene Auswahl (der Server zieht nach)
        if (!a.sprachen || Date.now() - zuletztGetippt < 900) return;
        sprache = a.sprachen.sprache;
        niveau = a.sprachen.niveau;
        fragen = a.sprachen.fragen.map(f => ({ versuche: f.versuche, richtig: f.richtig }));
        zeichnen();
      },
      abbauen() { if (tts) tts.cancel(); },
    };
  },

  /* ---------- Demo 7: Grafiken ---------- */
  grafik(a) {
    let europa = null;
    let aufgaben = a.grafik.aufgaben.map(x => ({ versuche: x.versuche.slice() }));
    let nr = -1;              // angezeigte Aufgabe
    let bild = null;          // angezeigte Grafik
    let svg = null;
    let rueckmeldung = false; // während der Rückmeldung zählen keine Tipps
    let zuletztGetippt = 0;
    let weiterTimer = null;
    const erledigt = x => x.versuche.some(v => v.ok) || x.versuche.length >= GRAFIK_VERSUCHE;
    app.innerHTML = `<div class="grafik">
      <div class="lern-kopf"><span class="nr"></span><span class="pkt"></span></div><div class="lern-balken"><i></i></div>
      <h1 class="grafik-aufgabe"></h1><p class="grafik-versuch leise"></p><div class="grafik-bild"></div><div class="grafik-rueck"></div></div>`;
    const wurzel = $('.grafik', app);
    import('./grafik-europa.js').then(m => {
      europa = m.EUROPA;
      if (nr >= 0 && GRAFIK_AUFGABEN[nr].bild === 'europa' && !rueckmeldung) zeigen();
    }).catch(() => { $('.grafik-bild', wurzel).innerHTML = '<p class="leise">Die Karte konnte nicht geladen werden – lade die Seite neu.</p>'; });

    function teilName(teil) {
      if (!teil) return '';
      if (bild === 'europa') { const l = europa && europa.laender.find(x => x.id === teil); return l ? l.name : ''; }
      return TEILE[teil] || '';
    }
    function bildBauen() {
      const art = GRAFIK_AUFGABEN[nr].bild;
      if (art === bild) {
        svg.querySelectorAll('.treffer, .falsch, .ziel').forEach(e => e.classList.remove('treffer', 'falsch', 'ziel'));
        $('.tipps', svg).innerHTML = '';
        return;
      }
      const ort = $('.grafik-bild', wurzel);
      if (art === 'europa' && !europa) { bild = null; ort.innerHTML = '<p class="laden" style="margin:60px 0">Karte wird geladen …</p>'; return; }
      bild = art;
      const quelle = art === 'europa' ? { viewBox: europa.viewBox, svg: europaSvg(europa) } : art === 'koerper' ? KOERPER : SKELETT;
      ort.innerHTML = `<svg class="bild-${art}" viewBox="${quelle.viewBox}" preserveAspectRatio="xMidYMid meet">${quelle.svg}<g class="tipps"></g></svg>`;
      svg = $('svg', ort);
      svg.addEventListener('click', tippen);
    }
    function markieren(teil, klasse) {
      if (teil) svg.querySelectorAll(`[data-teil="${teil}"]`).forEach(e => e.classList.add(klasse));
    }
    function zeigen() {
      clearTimeout(weiterTimer);
      rueckmeldung = false;
      nr = aufgaben.findIndex(x => !erledigt(x));
      const p = grafikPunkte({ aufgaben });
      if (nr < 0) {
        const getroffen = aufgaben.filter(x => x.versuche.some(v => v.ok)).length;
        wurzel.innerHTML = `<div class="warten"><div class="symbol">🗺️</div><div class="modus">GESCHAFFT!</div>
          <p class="gross">Du hast ${getroffen} von ${GRAFIK_AUFGABEN.length} getroffen und bekommst ${p} Punkte.</p>
          <p class="leise">Richte deine Aufmerksamkeit nach vorne – dort siehst du, wo alle hingetippt haben.</p></div>`;
        return;
      }
      $('.nr', wurzel).textContent = `Aufgabe ${nr + 1} von ${GRAFIK_AUFGABEN.length}`;
      $('.pkt', wurzel).textContent = `${p} Punkte`;
      $('.lern-balken i', wurzel).style.width = (100 * nr / GRAFIK_AUFGABEN.length) + '%';
      $('.grafik-aufgabe', wurzel).textContent = GRAFIK_AUFGABEN[nr].text;
      const v = aufgaben[nr].versuche.length;
      $('.grafik-versuch', wurzel).textContent = v ? `Noch ein Versuch (für ${PUNKTE.grafikZweiter} Punkte)!` : `Treffer beim ersten Versuch: ${PUNKTE.grafikErster} Punkte`;
      $('.grafik-rueck', wurzel).innerHTML = '';
      bildBauen();
      if (svg && bild) aufgaben[nr].versuche.forEach(x => { if (x.teil && !x.ok) markieren(x.teil, 'falsch'); });
    }
    function tippen(e) {
      if (rueckmeldung || nr < 0 || !svg) return;
      const ctm = svg.getScreenCTM();
      if (!ctm) return;
      const pt = svg.createSVGPoint();
      pt.x = e.clientX; pt.y = e.clientY;
      const p = pt.matrixTransform(ctm.inverse());
      const el = e.target.closest('[data-teil]');
      const teil = el ? el.dataset.teil : '';
      const aufgabe = GRAFIK_AUFGABEN[nr];
      const ok = teil === aufgabe.ziel;
      const x = Math.round(p.x * 10) / 10, y = Math.round(p.y * 10) / 10;
      aufgaben[nr].versuche.push({ ok, teil });
      zuletztGetippt = Date.now();
      senden({ type: 'tippen', aufgabe: nr, x, y, teil });
      const r = bild === 'europa' ? 11 : 4.5;
      $('.tipps', svg).insertAdjacentHTML('beforeend', `<circle class="tipp ${ok ? 'ok' : 'nein'}" cx="${x}" cy="${y}" r="${r}"/>`);
      const rueck = $('.grafik-rueck', wurzel);
      if (ok) {
        rueckmeldung = true;
        markieren(teil, 'treffer');
        const punkte = aufgaben[nr].versuche.length === 1 ? PUNKTE.grafikErster : PUNKTE.grafikZweiter;
        rueck.innerHTML = `<div class="rueck-box gut">✓ Richtig! +${punkte} Punkte</div>`;
        vibrieren(30);
        weiterTimer = setTimeout(zeigen, 1300);
        return;
      }
      vibrieren([80, 50, 80]);
      const name = teilName(teil);
      const daneben = name ? `✗ Daneben – das ist ${esc(name)}.` : '✗ Daneben.';
      markieren(teil, 'falsch');
      if (aufgaben[nr].versuche.length >= GRAFIK_VERSUCHE) {
        rueckmeldung = true;
        markieren(aufgabe.ziel, 'ziel');
        rueck.innerHTML = `<div class="rueck-box schlecht">${daneben}<br>Hier wäre es gewesen: <b>grün</b> markiert.</div><button class="knopf" data-weiter>Weiter →</button>`;
        $('[data-weiter]', rueck).addEventListener('click', zeigen);
      } else {
        rueck.innerHTML = `<div class="rueck-box schlecht">${daneben} Noch ein Versuch!</div>`;
        $('.grafik-versuch', wurzel).textContent = `Noch ein Versuch (für ${PUNKTE.grafikZweiter} Punkte)!`;
      }
    }
    zeigen();
    return {
      aktualisieren(a) {
        // Der Server zählt mit; während einer Rückmeldung oder kurz nach dem Tippen gilt die eigene Anzeige
        if (rueckmeldung || Date.now() - zuletztGetippt < 900) return;
        const neu = a.grafik.aufgaben.map(x => ({ versuche: x.versuche.slice() }));
        if (JSON.stringify(neu) === JSON.stringify(aufgaben)) return;
        aufgaben = neu;
        zeigen();
      },
      abbauen() { clearTimeout(weiterTimer); },
    };
  },

  /* ---------- Demo 8: Gruppen ---------- */
  gruppen() {
    app.innerHTML = '<div class="gruppen"></div>';
    const wurzel = $('.gruppen', app);
    document.body.classList.add('gruppen-bunt');
    let sig = '';
    let gruppeVorher;
    wurzel.addEventListener('click', e => {
      const b = e.target.closest('[data-g]');
      if (!b || b.disabled) return;
      senden({ type: 'gruppeWaehlen', g: +b.dataset.g });
      vibrieren(20);
    });
    return {
      aktualisieren(a) {
        const gr = a.gruppe;
        const neu = JSON.stringify(gr);
        if (neu === sig) return;
        sig = neu;
        let html = '';
        if (gr.g !== null) {
          const info = gruppeInfo(gr.g);
          document.body.style.setProperty('--gruppe', info.farbe);
          html += `<div class="gruppen-gross"><div class="tier">${info.tier}</div><div class="klein">Deine Gruppe</div><h1>${esc(info.name)}</h1>
            <ul>${gr.mitglieder.map(n => `<li>${esc(n)}${n === a.name ? ' (du)' : ''}</li>`).join('')}</ul>
            <p>Findet euch und setzt euch zusammen!</p></div>`;
          if (gruppeVorher !== undefined && gruppeVorher !== gr.g) vibrieren([60, 40, 60]);
        } else {
          document.body.style.removeProperty('--gruppe');
          if (!gr.selbstWahl) html += `<div class="warten"><div class="symbol">⏳</div><div class="modus">GRUPPEN-MODUS</div><p class="gross">Gleich bekommst du deine Gruppe – schau nach vorne.</p></div>`;
        }
        gruppeVorher = gr.g;
        if (gr.selbstWahl && gr.anzahl) {
          html += `<h2 class="wahl-titel">${gr.g === null ? 'Wähle deine Gruppe:' : 'Gruppe wechseln:'}</h2><div class="gruppen-wahl">${Array.from({ length: gr.anzahl }, (_, i) => {
            const info = gruppeInfo(i);
            const meine = gr.g === i;
            const voll = !meine && gr.belegung[i] >= gr.kapazitaet;
            return `<button data-g="${i}" style="--farbe:${info.farbe}" class="${meine ? 'meine' : ''}" ${meine || voll ? 'disabled' : ''}>
              <span class="tier">${info.tier}</span><span class="name">${esc(info.name)}</span><small>${meine ? 'deine Gruppe' : voll ? 'voll' : `${gr.belegung[i]} von ${gr.kapazitaet}`}</small></button>`;
          }).join('')}</div>`;
        }
        wurzel.innerHTML = html;
      },
      abbauen() {
        document.body.classList.remove('gruppen-bunt');
        document.body.style.removeProperty('--gruppe');
      },
    };
  },

  /* ---------- Demo 8: Gruppenpuzzle ---------- */
  puzzle() {
    app.innerHTML = '<div class="pz"><div class="pz-kopf"></div><div class="pz-meldung"></div><div class="pz-koerper"></div></div>';
    const wurzel = $('.pz', app);
    let p = null;               // letzter Puzzle-Stand vom Server
    let versatz = 0;            // Serverzeit − eigene Zeit
    let tab = 'aufgaben';
    let sig = '';
    let meldungZeit = null;
    let phaseVorher = null;
    let entwurf = {};           // Antworten je Abschnitt (übersteht Neuladen)
    let loesungEingetragen = null;
    const mmss = ms => { const s = Math.max(0, Math.floor(ms / 1000)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };
    const textKarte = (k, von) => {
      const e = EXPERTEN[k];
      return `<article class="karte pz-text"><div class="pz-experte">${e.symbol} ${esc(e.titel)}</div>
        ${von ? `<p class="leise klein">Text von ${esc(von)} – ist gerade nicht verbunden, deshalb seht ihr ihn alle.</p>` : ''}
        ${e.text.map(t => `<p>${esc(t)}</p>`).join('')}</article>`;
    };
    const fallKarte = offen => `<details class="karte pz-fall" ${offen ? 'open' : ''}><summary>📋 Der Fall: Herr Brenner</summary><p>${esc(FALL)}</p></details>`;
    function entwurfSpeichern() { sitzung('puzzle', { start: p.start, entwurf }); }

    function kopf() {
      const jetzt = Date.now() + versatz;
      const info = gruppeInfo(ansicht.gruppe.g);
      wurzel.style.setProperty('--farbe', info.farbe);
      const status = m => {
        if (!m.aktiv) return '📵';
        if (p.phase === 'lesen') return m.gelesen ? '✓' : '📖';
        if (p.phase === 'fertig') return '🎉';
        return m.abgegeben ? '📨' : '✏️';
      };
      $('.pz-kopf', wurzel).innerHTML = `<div class="pz-gruppe"><span class="tier">${info.tier}</span><b>${esc(info.name)}</b><span class="uhr">⏱ ${mmss((p.fertigNach ?? jetzt - p.start))}</span></div>
        <div class="pz-mitglieder">${p.mitglieder.map(m => `<span class="${m.aktiv ? '' : 'weg'}">${status(m)} ${m.ich ? 'Du' : esc(m.name)}</span>`).join('')}</div>`;
      const gesperrt = p.phase === 'aufgaben' && p.sperreBis > jetzt;
      $('.pz-meldung', wurzel).innerHTML = gesperrt
        ? `<div class="rueck-box schlecht">🔒 Mindestens eine Antwort in eurer Gruppe ist noch falsch. Besprecht euch und vergleicht eure Texte! Neuer Versuch in <b>${Math.ceil((p.sperreBis - jetzt) / 1000)} s</b>.</div>`
        : '';
      const lesestand = $('.pz-lese-status', wurzel);
      if (lesestand) {
        const warten = p.mitglieder.filter(m => m.aktiv && !m.gelesen && !m.ich).map(m => esc(m.name));
        lesestand.innerHTML = `✓ Gelesen! ${warten.length ? `Warte noch auf: ${warten.join(', ')}` : 'Gleich geht’s los …'}`;
      }
      const abgeben = $('[data-abgeben]', wurzel);
      if (abgeben) abgeben.disabled = gesperrt || !vollstaendig();
    }
    function antworten() { return entwurf[p.abschnitt] || ABSCHNITTE[p.abschnitt].fragen.map(() => ''); }
    function vollstaendig() { return antworten().every(x => String(x).trim() !== ''); }

    function koerper() {
      const k = $('.pz-koerper', wurzel);
      if (p.phase === 'lesen') {
        k.innerHTML = `<h1>Lies deinen Expertentext</h1>
          <p class="leise">Nur du hast ${p.experten.length > 1 ? 'diese Texte' : 'diesen Text'}. Merk dir das Wichtigste – deine Gruppe braucht dein Wissen! Später kannst du jederzeit wieder reinschauen.</p>
          ${fallKarte(true)}${p.experten.map(x => textKarte(x)).join('')}${p.freigegeben.map(f => f.experten.map(x => textKarte(x, f.name)).join('')).join('')}
          ${p.gelesen ? '<div class="rueck-box gut pz-lese-status"></div>' : '<button class="knopf" data-gelesen>Text gelesen ✓</button>'}`;
        return;
      }
      if (p.phase === 'fertig') {
        const medaille = ['🥇', '🥈', '🥉'][p.platz - 1] || '🏁';
        k.innerHTML = `<div class="warten"><div class="symbol">${medaille}</div><div class="modus">FALL GELÖST!</div>
          <p class="gross">Ihr seid Platz ${p.platz} – nach ${mmss(p.fertigNach)} Minuten.</p>
          <p>Dafür bekommt jede*r von euch <b>${puzzlePunkte(p.platz)} Punkte</b>.</p>
          <p class="leise">Richte deine Aufmerksamkeit nach vorne.</p></div>`;
        return;
      }
      const tabs = [['aufgaben', '✏️ Aufgaben'], ['text', '📄 Mein Text']].concat(p.freigegeben.map((f, i) => ['frei' + i, '📄 ' + f.name]));
      if (!tabs.some(t => t[0] === tab)) tab = 'aufgaben';
      let inhalt;
      if (tab === 'text') inhalt = p.experten.map(x => textKarte(x)).join('');
      else if (tab.startsWith('frei')) { const f = p.freigegeben[+tab.slice(4)]; inhalt = f.experten.map(x => textKarte(x, f.name)).join(''); }
      else {
        const ab = ABSCHNITTE[p.abschnitt];
        const werte = p.abgabe || antworten();
        const fest = !!p.abgabe;
        const hilfe = p.hilfe;
        // Nach mehreren Fehlversuchen: erst ✓/✗ je Frage mit Tipp, dann die Lösung (nicht, wer falsch lag)
        const hilfeKopf = !hilfe ? '' : hilfe.stufe === 'loesung'
          ? `<div class="pz-hilfe loesung">🔑 <b>Lösung</b> nach ${hilfe.fehler} Versuchen: Die richtigen Antworten sind eingetragen. Lest die Erklärungen und gebt dann ab.</div>`
          : `<div class="pz-hilfe hinweis">💡 <b>Hinweis</b> nach ${hilfe.fehler} Versuchen: Bei den mit ✗ markierten Fragen stimmt es noch nicht bei allen. Lest den Tipp und schaut in die passenden Texte!</div>`;
        const hilfeFrage = (f, k) => {
          if (!hilfe) return '';
          if (hilfe.stufe === 'loesung') {
            const loesung = f.art === 'zahl' ? f.richtig + ' ' + f.einheit : f.optionen[f.richtig];
            return `<p class="pz-tipp loesung">🔑 <b>${esc(loesung)}</b><br>${esc(f.erklaerung)}</p>`;
          }
          return hilfe.richtig && hilfe.richtig[k]
            ? '<span class="pz-status ok">✓ stimmt bei allen</span>'
            : `<span class="pz-status nein">✗ stimmt noch nicht bei allen</span><p class="pz-tipp">💡 ${esc(f.tipp)}</p>`;
        };
        inhalt = `<div class="pz-abschnitt">${esc(ab.titel)} <small>(${p.abschnitt + 1} von ${ABSCHNITTE.length})</small></div>${hilfeKopf}${fallKarte(p.abschnitt === 0)}
          ${ab.fragen.map((nr, k) => {
            const f = PUZZLE_FRAGEN[nr];
            const feld = f.art === 'zahl'
              ? `<div class="pz-zahl"><input class="feld" inputmode="decimal" maxlength="8" data-k="${k}" value="${esc(werte[k])}" ${fest ? 'disabled' : ''} aria-label="Antwort"><span>${esc(f.einheit)}</span></div>`
              : f.optionen.map((o, i) => `<button class="wahl${String(werte[k]) === String(i) ? ' gewaehlt' : ''}" data-k="${k}" data-o="${i}" ${fest ? 'disabled' : ''}>${esc(o)}</button>`).join('');
            return `<div class="karte pz-frage"><p class="frage"><b>${k + 1}.</b> ${esc(f.frage)}</p>${hilfeFrage(f, k)}${feld}</div>`;
          }).join('')}
          ${fest
            ? `<div class="rueck-box gut">📨 Abgegeben – warte auf die anderen.</div><button class="knopf zweit" data-zurueck>Abgabe ändern</button>`
            : '<p class="leise klein">Weiter geht es erst, wenn alle abgegeben haben und bei allen alles richtig ist. Besprecht euch!</p><button class="knopf" data-abgeben>Abschnitt abgeben</button>'}`;
      }
      k.innerHTML = `<div class="pz-tabs">${tabs.map(t => `<button data-tab="${t[0]}" class="${t[0] === tab ? 'an' : ''}">${esc(t[1])}</button>`).join('')}</div>${inhalt}`;
    }

    wurzel.addEventListener('click', e => {
      const b = e.target.closest('button');
      if (!b || b.disabled || !p) return;
      if ('gelesen' in b.dataset) { senden({ type: 'gelesen' }); b.disabled = true; vibrieren(20); return; }
      if (b.dataset.tab) { tab = b.dataset.tab; sig = ''; zeichnen(); window.scrollTo(0, 0); return; }
      if (b.dataset.o !== undefined) {
        const w = antworten().slice();
        w[+b.dataset.k] = +b.dataset.o;
        entwurf[p.abschnitt] = w;
        entwurfSpeichern();
        b.parentElement.querySelectorAll('.wahl').forEach(x => x.classList.toggle('gewaehlt', x === b));
        vibrieren(15);
        kopf();
        return;
      }
      if ('abgeben' in b.dataset) {
        const w = antworten().map((x, k) => PUZZLE_FRAGEN[ABSCHNITTE[p.abschnitt].fragen[k]].art === 'zahl' ? String(x).trim() : x);
        senden({ type: 'abgeben', abschnitt: p.abschnitt, antworten: w });
        b.disabled = true;
        vibrieren(25);
        return;
      }
      if ('zurueck' in b.dataset) { senden({ type: 'abgabeZurueck' }); b.disabled = true; }
    });
    wurzel.addEventListener('input', e => {
      if (!e.target.matches('input[data-k]') || !p) return;
      const w = antworten().slice();
      w[+e.target.dataset.k] = e.target.value;
      entwurf[p.abschnitt] = w;
      entwurfSpeichern();
      kopf();
    });

    let ansicht = null;
    function zeichnen() {
      if (!p) return;
      // Neu aufbauen nur, wenn sich der Inhalt ändert – sonst gehen Eingaben verloren
      const neu = JSON.stringify([p.phase, p.abschnitt, tab, p.experten, p.freigegeben, p.gelesen, p.abgabe, p.platz, p.hilfe]);
      if (neu !== sig) { sig = neu; koerper(); }
      kopf();
    }
    const uhr = setInterval(() => { if (p) kopf(); }, 500);
    return {
      aktualisieren(a) {
        ansicht = a;
        if (!a.puzzle) {
          p = null;
          sig = '';
          wurzel.innerHTML = `<div class="warten"><div class="symbol">🧩</div><div class="modus">GRUPPENPUZZLE</div>
            <p class="gross">Du bist noch in keiner Gruppe. Melde dich kurz bei der Lehrkraft.</p></div>`;
          return;
        }
        if (!$('.pz-kopf', wurzel)) wurzel.innerHTML = '<div class="pz-kopf"></div><div class="pz-meldung"></div><div class="pz-koerper"></div>';
        versatz = a.serverZeit - Date.now();
        p = a.puzzle;
        if (!Object.keys(entwurf).length) {
          const gemerkt = sitzung('puzzle');
          if (gemerkt && gemerkt.start === p.start) entwurf = gemerkt.entwurf || {};
        }
        const m = p.meldung;
        if (m && meldungZeit !== null && m.zeit !== meldungZeit) {
          if (m.art === 'falsch') { toast('✗ Noch nicht alles richtig – besprecht euch!', 'schlecht', 3000); vibrieren([120, 60, 120]); }
          if (m.art === 'hinweis') { toast('💡 Noch nicht alles richtig – jetzt gibt es einen Hinweis!', '', 3200); vibrieren([120, 60, 120]); tab = 'aufgaben'; window.scrollTo(0, 0); }
          if (m.art === 'loesung') { toast('🔑 Hier ist die Lösung – lest sie und gebt ab.', '', 3200); vibrieren([120, 60, 120]); tab = 'aufgaben'; window.scrollTo(0, 0); }
          if (m.art === 'weiter') { toast(`✓ Alles richtig! Weiter mit Abschnitt ${p.abschnitt + 1}`, 'gut', 2600); vibrieren([40, 30, 40]); tab = 'aufgaben'; window.scrollTo(0, 0); }
          if (m.art === 'fertig') vibrieren([60, 40, 60, 40, 200]);
        }
        meldungZeit = m ? m.zeit : 0;
        // Lösung einmal je Abschnitt in die Felder eintragen
        if (p.hilfe && p.hilfe.stufe === 'loesung' && loesungEingetragen !== p.abschnitt) {
          entwurf[p.abschnitt] = ABSCHNITTE[p.abschnitt].fragen.map(nr => {
            const f = PUZZLE_FRAGEN[nr];
            return f.art === 'zahl' ? String(f.richtig) : f.richtig;
          });
          entwurfSpeichern();
          loesungEingetragen = p.abschnitt;
          sig = '';
        }
        if (phaseVorher === 'lesen' && p.phase === 'aufgaben') { toast('Alle haben gelesen – los geht’s!', 'gut', 2400); tab = 'aufgaben'; window.scrollTo(0, 0); }
        phaseVorher = p.phase;
        zeichnen();
      },
      abbauen() { clearInterval(uhr); },
    };
  },

  gruppensieg(a) {
    const s = warten({ symbol: '🏆', modus: 'SIEGEREHRUNG', text: 'Richte deine Aufmerksamkeit nach vorne, leg dein Smartphone erstmal zur Seite.', mitPunkten: false });
    if (a.puzzle && a.puzzle.platz) $('.stand', app).insertAdjacentHTML('afterend', `<p class="leise" style="margin-top:20px">Eure Gruppe: <b>Platz ${a.puzzle.platz}</b> · +${puzzlePunkte(a.puzzle.platz)} Punkte</p>`);
    return s;
  },

  /* ---------- Demo 10: Test mit Note ---------- */
  test(a) {
    app.innerHTML = '<div class="test"></div>';
    const wurzel = $('.test', app);
    let antworten = a.test.antworten ? a.test.antworten.slice() : TEST_FRAGEN.map(() => null);
    let pos = 0;                // angezeigte Frage (Position in der eigenen Reihenfolge)
    let bestaetigen = false;    // „Wirklich abgeben?“ wird gezeigt
    let abgabeGesendet = false;
    let zuletztGetippt = 0;
    let versatz = a.serverZeit - Date.now();
    let t = a.test;
    if (!t.begonnen && !t.abgegeben) senden({ type: 'testBeginn' });

    const rest = () => Math.max(0, t.start + t.dauer - (Date.now() + versatz));
    const mmss = ms => { const s = Math.ceil(ms / 1000); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };

    function frageZeigen() {
      const q = t.reihenfolge[pos];
      const f = TEST_FRAGEN[q];
      const offen = antworten.filter(x => x === null).length;
      const letzte = pos === TEST_FRAGEN.length - 1;
      wurzel.innerHTML = `<div class="test-kopf"><span>Frage ${pos + 1} von ${TEST_FRAGEN.length}</span><span class="test-uhr">⏱ ${mmss(rest())}</span></div>
        <div class="test-punkte">${t.reihenfolge.map((x, i) => `<button data-pos="${i}" class="${antworten[x] !== null ? 'beantwortet' : ''}${i === pos ? ' hier' : ''}" aria-label="Frage ${i + 1}">${i + 1}</button>`).join('')}</div>
        ${bestaetigen
          ? `<div class="karte test-abgabe"><h2>Test abgeben?</h2>
              <p>${offen ? `<b>${offen} ${offen === 1 ? 'Frage ist' : 'Fragen sind'} noch offen</b> – sie zählen als falsch.` : 'Alle Fragen sind beantwortet.'} Danach kannst du nichts mehr ändern.</p>
              <button class="knopf" data-abgeben>Ja, abgeben</button><button class="knopf zweit" data-zurueck-fragen>Zurück zu den Fragen</button></div>`
          : `<div class="karte"><p class="frage">${esc(f.frage)}</p>
              ${t.optionen[q].map(o => `<button class="wahl${antworten[q] === o ? ' gewaehlt' : ''}" data-o="${o}">${esc(f.optionen[o])}</button>`).join('')}</div>
              <div class="test-nav"><button class="knopf zweit" data-zurueck ${pos === 0 ? 'disabled' : ''}>← Zurück</button>
              ${letzte ? '<button class="knopf" data-fertig>Abgeben …</button>' : '<button class="knopf" data-weiter>Weiter →</button>'}</div>`}
        <p class="leise klein test-hinweis">🔒 Deine Note siehst nur du.</p>`;
    }

    function ergebnisZeigen() {
      const e = t.ergebnis;
      if (!e) {
        wurzel.innerHTML = `<div class="warten"><div class="symbol">📝</div><div class="modus">TEST</div>
          <p class="gross">${abgabeGesendet ? 'Wird abgegeben …' : 'Du hast nicht am Test teilgenommen.'}</p></div>`;
        return;
      }
      wurzel.innerHTML = `<div class="test-ergebnis"><div class="note-kreis note-${e.note}">${e.note}</div>
        <p class="gross">Note ${e.note} – ${esc(NOTEN_NAMEN[e.note])}</p>
        <p>${e.richtig} von ${e.von} richtig (${e.prozent} %)</p>
        <p class="leise klein">🔒 Diese Note siehst nur du.</p></div>
        ${e.falsch.length ? `<h2>Das war nicht richtig:</h2>${e.falsch.map(x => {
          const f = TEST_FRAGEN[x.frage];
          return `<div class="karte test-falsch"><p class="frage">${esc(f.frage)}</p>
            <p class="rueck schlecht">✗ ${x.gewaehlt === null ? 'keine Antwort' : esc(f.optionen[x.gewaehlt])}</p>
            <p class="rueck gut">✓ ${esc(f.optionen[x.richtig])}</p></div>`;
        }).join('')}` : '<div class="geschafft">🎉 Alles richtig!</div>'}`;
    }

    function zeichnen() {
      if (t.abgegeben) ergebnisZeigen(); else frageZeigen();
    }

    wurzel.addEventListener('click', e => {
      const b = e.target.closest('button');
      if (!b || b.disabled || t.abgegeben) return;
      if (b.dataset.o !== undefined) {
        const q = t.reihenfolge[pos];
        antworten[q] = +b.dataset.o;
        zuletztGetippt = Date.now();
        senden({ type: 'testAntwort', frage: q, option: antworten[q] });
        vibrieren(15);
        frageZeigen();
        return;
      }
      if (b.dataset.pos !== undefined) { pos = +b.dataset.pos; bestaetigen = false; }
      else if ('weiter' in b.dataset) pos++;
      else if ('zurueck' in b.dataset) pos--;
      else if ('fertig' in b.dataset) bestaetigen = true;
      else if ('zurueckFragen' in b.dataset) bestaetigen = false;
      else if ('abgeben' in b.dataset) {
        abgabeGesendet = true;
        senden({ type: 'testAbgeben' });
        b.disabled = true;
        vibrieren(30);
        return;
      }
      window.scrollTo(0, 0);
      frageZeigen();
    });

    // Countdown; ist die Zeit um, wird automatisch abgegeben
    const uhr = setInterval(() => {
      if (t.abgegeben) return;
      if (rest() <= 0 && !abgabeGesendet) {
        abgabeGesendet = true;
        senden({ type: 'testAbgeben' });
        toast('⏱ Die Zeit ist um – dein Test wird abgegeben.', '', 3000);
      }
      const u = $('.test-uhr', wurzel);
      if (u) { u.textContent = '⏱ ' + mmss(rest()); u.classList.toggle('knapp', rest() < 30000); }
    }, 500);

    zeichnen();
    return {
      aktualisieren(neu) {
        versatz = neu.serverZeit - Date.now();
        const warAbgegeben = t.abgegeben;
        t = neu.test;
        if (t.abgegeben) {
          if (!warAbgegeben) { window.scrollTo(0, 0); vibrieren([60, 40, 60]); }
          ergebnisZeigen();
          return;
        }
        // Während getippt wird, gilt die eigene Auswahl (der Server zieht nach)
        if (t.antworten && Date.now() - zuletztGetippt > 900) {
          const geaendert = t.antworten.some((x, i) => x !== antworten[i]);
          antworten = t.antworten.slice();
          if (geaendert) frageZeigen();
        }
      },
      abbauen() { clearInterval(uhr); },
    };
  },

  notenspiegel(a) {
    return BILDSCHIRME.test(a);
  },

  /* ---------- Demo 9: KAROLINE-RUN! ---------- */
  spiel() {
    app.innerHTML = '';
    const rahmen = document.createElement('iframe');
    rahmen.id = 'spiel-rahmen';
    rahmen.title = 'KAROLINE-RUN!';
    rahmen.src = 'spiel/index.html';
    document.body.appendChild(rahmen);
    // Das Spiel meldet seinen Stand; nach jedem Lauf geht die Punktzahl an den Beamer
    function nachricht(e) {
      if (e.source !== rahmen.contentWindow || !e.data || e.data.quelle !== 'karoline-run') return;
      const d = e.data;
      if (d.art === 'stand') senden({ type: 'spielstand', punkte: d.punkte, ende: false });
      if (d.art === 'ende') senden({ type: 'spielstand', punkte: d.punkte, ende: true });
    }
    window.addEventListener('message', nachricht);
    return {
      abbauen() {
        window.removeEventListener('message', nachricht);
        rahmen.remove();
      },
    };
  },
};

// Schnittstelle für die automatischen Tests (liest nur aus)
window.__handy = { get a() { return a; } };
