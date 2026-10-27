/*
 * Handy-Ansicht der Teilnehmenden. Was zu sehen ist, bestimmt die Lehrkraft am Beamer:
 * Der Server schickt nach jeder Änderung die aktuelle „ansicht“ (Modus, Punkte, …).
 * Bei einem neuen Modus wird der Bildschirm neu aufgebaut, sonst nur aktualisiert –
 * so gehen angefangene Eingaben nicht verloren.
 */
import { UMFRAGE_OPTIONEN, UMFRAGE_KEINE, WOLKE_MAX_BEGRIFFE, WOLKE_MAX_LAENGE, PFLEGEPROZESS, LERNKARTEN, PUNKTE_SICHTBAR_AB, begriffGueltig, sortierPunkte, PUNKTE } from './gemeinsam.js';
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
function warten({ symbol, modus, text, mitPunkten = true }) {
  app.innerHTML = `<div class="warten"><div class="symbol">${symbol}</div>${modus ? `<div class="modus">${esc(modus)}</div>` : ''}
    <p class="gross">${text}</p><div class="stand"></div></div>`;
  return {
    aktualisieren(a) {
      const s = $('.stand', app);
      if (!s) return;
      s.innerHTML = mitPunkten && a.schritt >= PUNKTE_SICHTBAR_AB
        ? `Deine Punkte: <b>${a.punkte}</b> · Platz ${a.platz} von ${a.anzahl}` : '';
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
      </div><p class="stand-zeile"></p>`;
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

  /* ---------- Demo 6: KAROLINE-RUN! ---------- */
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
