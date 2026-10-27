/*
 * Verbindung zum Workshop-Dienst (worker/index.js) – für Beamer und Handys.
 * Handys: WebSocket; klappt der nicht (manche WLANs sperren ihn), automatisch
 * HTTP-Abfragen alle 1,5 Sekunden. Nach dem Entsperren des Handys wird sofort neu verbunden.
 */

const TOKEN_SCHLUESSEL = 'kbs-ki-workshop:token';
const PIN_SCHLUESSEL = 'kbs-ki-workshop:pin';
const POLL_MS = 1500;

function lesen(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
function schreiben(k, w) { try { if (w === null) localStorage.removeItem(k); else localStorage.setItem(k, w); } catch (e) { /* ohne Speicher weiter */ } }

function wsAdresse(params) {
  const u = new URL('/api/ws', location.href);
  u.protocol = u.protocol === 'https:' ? 'wss:' : 'ws:';
  u.search = new URLSearchParams(params).toString();
  return u.toString();
}

function parsen(daten) {
  try { const m = JSON.parse(daten); return m && typeof m === 'object' ? m : null; } catch (e) { return null; }
}

const nichts = () => {};

/* ---------- Handy ---------- */

export function handyVerbindung(handler) {
  const h = Object.assign({ onNachricht: nichts, onStatus: nichts }, handler);
  let token = lesen(TOKEN_SCHLUESSEL) || '';
  let modus = new URLSearchParams(location.search).get('verbindung') === 'abfrage' ? 'abfrage' : 'ws';
  let ws = null;
  let wsFehler = 0;
  let neuTimer = null;
  let pollTimer = null;
  let pollOk = false;
  let unterwegs = false;
  let ausgang = [];
  let letzteNachricht = Date.now();
  let gastGemeldet = false;

  function ankommen(m) {
    letzteNachricht = Date.now();
    if (m.type === 'angemeldet') { token = m.token; gastGemeldet = false; schreiben(TOKEN_SCHLUESSEL, token); }
    if (m.type === 'abgemeldet') { token = ''; gastGemeldet = true; schreiben(TOKEN_SCHLUESSEL, null); }
    if (m.type === 'pong') return;
    h.onNachricht(m);
  }

  function wsStarten() {
    clearTimeout(neuTimer);
    const params = { rolle: 'tn' };
    if (token) params.token = token;
    let w;
    try { w = new WebSocket(wsAdresse(params)); } catch (e) { zuAbfrage(); return; }
    ws = w;
    let offen = false;
    const zeitlimit = setTimeout(() => {
      if (offen || ws !== w) return;
      try { w.close(); } catch (e) { /* egal */ }
      zuAbfrage();
    }, 6000);
    w.onopen = () => {
      offen = true;
      wsFehler = 0;
      clearTimeout(zeitlimit);
      h.onStatus('verbunden');
      const warten = ausgang;
      ausgang = [];
      warten.forEach(senden);
    };
    w.onmessage = e => { const m = parsen(e.data); if (m) ankommen(m); };
    w.onclose = () => {
      clearTimeout(zeitlimit);
      if (ws !== w || modus !== 'ws') return;
      ws = null;
      if (!offen) { zuAbfrage(); return; }
      h.onStatus('getrennt');
      if (++wsFehler >= 4) zuAbfrage();
      else neuTimer = setTimeout(wsStarten, 1200);
    };
    w.onerror = nichts;
  }

  function zuAbfrage() {
    if (modus === 'abfrage') return;
    modus = 'abfrage';
    ws = null;
    abfragen();
  }

  async function abfragen() {
    if (unterwegs) return;
    clearTimeout(pollTimer);
    unterwegs = true;
    const msgs = ausgang;
    ausgang = [];
    try {
      const r = await fetch('/api/poll', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ token, msgs }),
        cache: 'no-store',
      });
      if (!r.ok) throw new Error('HTTP ' + r.status);
      const d = await r.json();
      if (!pollOk) { pollOk = true; h.onStatus('verbunden'); }
      (d.msgs || []).forEach(m => { if (m && typeof m === 'object') ankommen(m); });
      if (d.ansicht) ankommen({ type: 'ansicht', a: d.ansicht });
      else if (!token && !gastGemeldet && !(d.msgs || []).length) { gastGemeldet = true; ankommen({ type: 'abgemeldet' }); }
    } catch (e) {
      ausgang = msgs.concat(ausgang).slice(-30);
      if (pollOk) { pollOk = false; h.onStatus('getrennt'); }
    }
    unterwegs = false;
    pollTimer = setTimeout(abfragen, POLL_MS);
  }

  function senden(m) {
    if (modus === 'ws' && ws && ws.readyState === 1) {
      try { ws.send(JSON.stringify(m)); return; } catch (e) { /* unten puffern */ }
    }
    ausgang.push(m);
    if (ausgang.length > 30) ausgang.splice(0, ausgang.length - 30);
    if (modus === 'abfrage') abfragen();
  }

  // Nach dem Entsperren des Handys oder bei toter Verbindung sofort neu verbinden
  function pruefen() {
    if (document.hidden) return;
    if (modus === 'abfrage') { abfragen(); return; }
    if (!ws || ws.readyState > 1 || Date.now() - letzteNachricht > 45000) {
      if (ws) { const alt = ws; ws = null; try { alt.close(); } catch (e) { /* egal */ } }
      wsStarten();
    }
  }
  document.addEventListener('visibilitychange', pruefen);
  window.addEventListener('pageshow', pruefen);
  window.addEventListener('online', pruefen);
  setInterval(() => {
    if (modus === 'ws' && ws && ws.readyState === 1) senden({ type: 'ping' });
    pruefen();
  }, 20000);

  if (modus === 'abfrage') abfragen();
  else wsStarten();

  return {
    senden,
    get angemeldet() { return !!token; },
    anmelden(daten) { senden(Object.assign({ type: 'anmelden' }, daten)); },
  };
}

/* ---------- Beamer ---------- */

export function beamerVerbindung(handler) {
  const h = Object.assign({ onNachricht: nichts, onStatus: nichts, onPin: nichts }, handler);
  let ws = null;
  let pin = lesen(PIN_SCHLUESSEL) || '';
  let freigeschaltet = false;

  function starten() {
    const w = new WebSocket(wsAdresse({ rolle: 'lehrer' }));
    ws = w;
    freigeschaltet = false;
    w.onopen = () => h.onStatus('verbunden');
    w.onmessage = e => {
      const m = parsen(e.data);
      if (!m) return;
      if (m.type === 'pin') {
        if (pin && m.eingerichtet) senden({ type: 'pin', pin });
        else h.onPin({ eingerichtet: m.eingerichtet });
        return;
      }
      if (m.type === 'pin-falsch') {
        pin = '';
        schreiben(PIN_SCHLUESSEL, null);
        h.onPin({ eingerichtet: m.eingerichtet, fehler: m.grund });
        return;
      }
      if (m.type === 'pin-ok') { freigeschaltet = true; schreiben(PIN_SCHLUESSEL, pin); h.onStatus('freigeschaltet'); return; }
      if (m.type === 'pong') return;
      h.onNachricht(m);
    };
    w.onclose = () => {
      if (ws !== w) return;
      ws = null;
      h.onStatus('getrennt');
      setTimeout(starten, 1500);
    };
    w.onerror = nichts;
  }

  function senden(m) {
    try { if (ws && ws.readyState === 1) ws.send(JSON.stringify(m)); } catch (e) { /* egal */ }
  }

  setInterval(() => { if (freigeschaltet) senden({ type: 'aktualisieren' }); }, 10000);
  starten();

  return {
    senden,
    pinSenden(p) { pin = String(p || '').trim(); senden({ type: 'pin', pin }); },
    pinVergessen() { pin = ''; schreiben(PIN_SCHLUESSEL, null); },
  };
}
