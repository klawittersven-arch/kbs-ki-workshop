/*
 * Cloudflare Worker: liefert die Seiten aus (Ordner public/) und betreibt den Workshop-Dienst.
 * Der gesamte Zustand (Teilnehmende, Punkte, aktueller Bildschirm …) liegt in einem einzigen
 * Durable Object „Workshop“ und wird dort gespeichert. Beamer und Handys bekommen nach jeder
 * Änderung automatisch ihre aktuelle Ansicht.
 *
 *   GET  /api/ws?rolle=lehrer             WebSocket des Beamers (danach PIN schicken)
 *   GET  /api/ws?rolle=tn&token=<token>   WebSocket eines Handys (Token nach der Anmeldung)
 *   GET  /api/ws?rolle=zuschauer&code=<c>  WebSocket einer Zuschauer-Ansicht (nur anschauen)
 *   POST /api/poll  {token, msgs}          Reserve für Handys ohne WebSocket
 */
import { DurableObject } from 'cloudflare:workers';
import * as L from './logik.js';
import { OFFLINE_FREIGABE_MS } from '../public/js/gemeinsam.js';

const OBJEKT_NAME = 'kbs-ki-workshop';
const POLL_ONLINE_MS = 8000;      // so lange gilt ein Handy im Abfrage-Modus nach der letzten Abfrage als verbunden
const PIN_VERSUCHE = 5;           // falsche PIN-Eingaben, bevor für eine Minute gesperrt wird
const NAME_VERSUCHE = 8;          // falsche Passwörter je Name, bevor der Name kurz gesperrt wird

function json(daten, status = 200) {
  return new Response(JSON.stringify(daten), {
    status,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
  });
}

function lesen(daten) {
  try {
    const m = JSON.parse(typeof daten === 'string' ? daten : new TextDecoder().decode(daten));
    return m && typeof m === 'object' ? m : null;
  } catch (e) {
    return null;
  }
}

function senden(ws, obj) {
  try { ws.send(typeof obj === 'string' ? obj : JSON.stringify(obj)); } catch (e) { /* Verbindung schon zu */ }
}

function anhang(ws) {
  try { return ws.deserializeAttachment() || {}; } catch (e) { return {}; }
}

function anhangSetzen(ws, a) {
  try { ws.serializeAttachment(a); } catch (e) { /* Verbindung schon zu */ }
}

export class Workshop extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    this.env = env;
    this.z = null;
    this.pinHash = null;
    this.laufend = new Map();       // id → Punkte der gerade laufenden Spielrunde
    this.letzterPoll = new Map();   // id → Zeitpunkt der letzten Abfrage (Reserve-Modus)
    this.pinFehler = 0;
    this.pinSperreBis = 0;
    this.namensSperre = new Map();  // Name → { n, bis }
    this.offlineSeit = new Map();   // id → seit wann das Handy getrennt ist (Gruppenpuzzle)
    this.sendeTimer = null;
    ctx.blockConcurrencyWhile(async () => {
      this.z = L.zustandErgaenzen((await ctx.storage.get('zustand')) || L.neuerZustand(1));
      this.pinHash = (await ctx.storage.get('pin')) || null;
    });
  }

  speichern() {
    this.ctx.storage.put('zustand', this.z);
  }

  kontext() {
    return L.kontext({ jetzt: Date.now(), laufend: this.laufend, online: this.onlineSet(), offlineSeit: this.offlineSeit });
  }

  // Handy (wieder) da: nicht mehr als getrennt führen; wer noch keine Gruppe hat, bekommt eine
  verbunden(id) {
    this.offlineSeit.delete(id);
    if (L.nachzueglerEinteilen(this.z, id, this.kontext())) this.speichern();
  }

  // Länger getrennte Gruppenmitglieder zählen im Puzzle nicht mehr mit – Gruppen neu prüfen
  offlinePruefen() {
    if (L.puzzleAktualisieren(this.z, this.kontext())) this.speichern();
    this.planeSenden();
  }

  /* ---------- Verbindungen ---------- */

  async fetch(request) {
    const url = new URL(request.url);

    if (url.pathname === '/api/ws') {
      if (request.headers.get('Upgrade') !== 'websocket') return new Response('WebSocket erwartet', { status: 426 });
      const [client, server] = Object.values(new WebSocketPair());
      if (url.searchParams.get('rolle') === 'lehrer') {
        this.ctx.acceptWebSocket(server, ['lehrer']);
        anhangSetzen(server, { rolle: 'lehrer', ok: false });
        senden(server, { type: 'pin', eingerichtet: this.pinEingerichtet() });
      } else if (url.searchParams.get('rolle') === 'zuschauer') {
        // Zuschauer-Link: sieht die Beamer-Ansicht, kann aber nichts steuern
        this.ctx.acceptWebSocket(server, ['zuschauer']);
        const code = url.searchParams.get('code') || '';
        if (this.z.zuschauerCode && code === this.z.zuschauerCode) {
          anhangSetzen(server, { rolle: 'zuschauer', code });
          senden(server, this.beamerNachrichten().zuschauer);
          this.planeSenden();
        } else {
          anhangSetzen(server, { rolle: 'zu' });
          senden(server, { type: 'zuschauen-ungueltig' });
        }
      } else {
        this.ctx.acceptWebSocket(server, ['tn']);
        const tn = L.tnZuToken(this.z, url.searchParams.get('token'));
        if (tn) {
          anhangSetzen(server, { rolle: 'tn', id: tn.id });
          this.verbunden(tn.id);
          senden(server, { type: 'angemeldet', token: tn.token, name: tn.name });
          senden(server, { type: 'ansicht', a: L.tnAnsicht(this.z, tn.id, this.kontext()) });
          this.planeSenden();
        } else {
          anhangSetzen(server, { rolle: 'gast' });
          senden(server, { type: 'abgemeldet' });
        }
      }
      return new Response(null, { status: 101, webSocket: client });
    }

    if (url.pathname === '/api/poll' && request.method === 'POST') {
      let body = null;
      try { body = await request.json(); } catch (e) { /* unten geprüft */ }
      if (!body || typeof body !== 'object') return json({ fehler: 'ungültig' }, 400);
      return json(await this.abfrage(body));
    }

    return new Response('Nicht gefunden', { status: 404 });
  }

  // Reserve-Modus: Handy schickt Nachrichten und bekommt seine aktuelle Ansicht zurück
  async abfrage(body) {
    const z = this.z;
    const tn = L.tnZuToken(z, body.token);
    let id = tn ? tn.id : null;
    const antworten = [];
    let geaendert = false;
    const msgs = Array.isArray(body.msgs) ? body.msgs.slice(0, 20) : [];
    for (const m of msgs) {
      if (!m || typeof m !== 'object') continue;
      if (!id) {
        if (m.type === 'anmelden') {
          const r = await this.anmelden(m);
          antworten.push(r.antwort);
          if (r.id) { id = r.id; geaendert = true; }
        }
        continue;
      }
      if (L.tnAktion(this.z, id, m, this.kontext())) geaendert = true;
    }
    if (id && !this.z.tn[id]) id = null;
    if (id) {
      const warOnline = this.onlineSet().has(id);
      this.letzterPoll.set(id, Date.now());
      if (!warOnline) { this.verbunden(id); this.planeSenden(); }
    }
    if (geaendert) { this.speichern(); this.planeSenden(); }
    if (!id && body.token) antworten.push({ type: 'abgemeldet' });
    return { msgs: antworten, ansicht: id ? L.tnAnsicht(this.z, id, this.kontext()) : null };
  }

  async webSocketMessage(ws, daten) {
    const m = lesen(daten);
    if (!m) return;
    if (m.type === 'ping') { senden(ws, { type: 'pong' }); return; }
    const a = anhang(ws);
    if (a.rolle === 'lehrer') return this.vonLehrer(ws, a, m);
    if (a.rolle === 'zuschauer') {
      if (m.type === 'aktualisieren') senden(ws, this.beamerNachrichten().zuschauer);
      return;
    }
    if (a.rolle === 'gast') {
      if (m.type !== 'anmelden') return;
      const r = await this.anmelden(m);
      if (r.id) { anhangSetzen(ws, { rolle: 'tn', id: r.id }); this.verbunden(r.id); }
      senden(ws, r.antwort);
      if (r.id) { this.speichern(); this.planeSenden(); }
      return;
    }
    if (a.rolle === 'tn') {
      if (!this.z.tn[a.id]) {
        anhangSetzen(ws, { rolle: 'gast' });
        senden(ws, { type: 'abgemeldet' });
        return;
      }
      if (L.tnAktion(this.z, a.id, m, this.kontext())) { this.speichern(); this.planeSenden(); }
    }
  }

  async webSocketClose(ws, code, reason) {
    this.geschlossen(ws);
    try { ws.close(code, reason); } catch (e) { /* schon zu */ }
  }

  async webSocketError(ws) {
    this.geschlossen(ws);
  }

  geschlossen(ws) {
    const a = anhang(ws);
    anhangSetzen(ws, { rolle: 'zu' });
    if (a.rolle === 'tn' && !this.onlineSet().has(a.id)) {
      this.offlineSeit.set(a.id, Date.now());
      setTimeout(() => this.offlinePruefen(), OFFLINE_FREIGABE_MS + 500);
    }
    if (a.rolle === 'tn' || a.rolle === 'zuschauer') this.planeSenden();
  }

  /* ---------- Anmeldung ---------- */

  async anmelden(m) {
    const z = this.z;
    const n = L.namePruefen(m.vorname, m.initiale);
    const jetzt = Date.now();
    const sperre = n.schluessel && this.namensSperre.get(n.schluessel);
    if (sperre && sperre.bis > jetzt) return { antwort: { type: 'anmeldefehler', fehler: 'gesperrt' } };
    const r = await L.anmelden(z, m, jetzt);
    if (z !== this.z) return { antwort: { type: 'anmeldefehler', fehler: 'nochmal' } };  // gerade zurückgesetzt
    if (!r.ok) {
      if (r.fehler === 'name-belegt') {
        const s = this.namensSperre.get(n.schluessel) || { n: 0, bis: 0 };
        s.n++;
        if (s.n >= NAME_VERSUCHE) { s.n = 0; s.bis = jetzt + 60000; }
        this.namensSperre.set(n.schluessel, s);
      }
      return { antwort: { type: 'anmeldefehler', fehler: r.fehler } };
    }
    this.namensSperre.delete(r.tn.schluessel);
    return { id: r.tn.id, antwort: { type: 'angemeldet', token: r.tn.token, name: r.tn.name, neu: r.neu } };
  }

  /* ---------- Lehrkraft ---------- */

  pinEingerichtet() {
    return !!(this.env.LEHRER_PIN || this.pinHash);
  }

  async pinPruefen(pin) {
    pin = String(pin || '').trim();
    const jetzt = Date.now();
    if (jetzt < this.pinSperreBis) return 'gesperrt';
    let ok;
    if (this.env.LEHRER_PIN) {
      ok = pin === String(this.env.LEHRER_PIN).trim();
    } else if (this.pinHash) {
      ok = (await L.hashen('lehrer-pin', pin)) === this.pinHash;
    } else {
      // Erste Benutzung: Die PIN wird festgelegt
      if (pin.length < 4) return 'kurz';
      this.pinHash = await L.hashen('lehrer-pin', pin);
      await this.ctx.storage.put('pin', this.pinHash);
      ok = true;
    }
    if (ok) { this.pinFehler = 0; return 'ok'; }
    if (++this.pinFehler >= PIN_VERSUCHE) { this.pinFehler = 0; this.pinSperreBis = jetzt + 60000; }
    return 'falsch';
  }

  async vonLehrer(ws, a, m) {
    if (!a.ok) {
      if (m.type !== 'pin') return;
      const r = await this.pinPruefen(m.pin);
      if (r !== 'ok') { senden(ws, { type: 'pin-falsch', grund: r, eingerichtet: this.pinEingerichtet() }); return; }
      anhangSetzen(ws, { rolle: 'lehrer', ok: true });
      senden(ws, { type: 'pin-ok' });
      senden(ws, this.beamerNachrichten().lehrer);
      return;
    }
    if (m.type === 'aktualisieren') {
      senden(ws, this.beamerNachrichten().lehrer);
      return;
    }
    if (m.type === 'zuruecksetzen') { this.zuruecksetzen(); return; }
    const r = L.lehrerAktion(this.z, m, this.kontext());
    for (const id of r.abmelden) this.abmelden(id);
    if (m.type === 'zuschauerErstellen' || m.type === 'zuschauerLoeschen') this.zuschauerPruefen();
    if (r.geaendert) { this.speichern(); this.planeSenden(); }
  }

  abmelden(id) {
    this.letzterPoll.delete(id);
    for (const ws of this.ctx.getWebSockets('tn')) {
      const a = anhang(ws);
      if (a.rolle === 'tn' && (id === null || a.id === id)) {
        anhangSetzen(ws, { rolle: 'gast' });
        senden(ws, { type: 'abgemeldet' });
      }
    }
  }

  // Alles löschen (außer der PIN) – wie neu. Alle Handys werden abgemeldet.
  zuruecksetzen() {
    this.z = L.neuerZustand((this.z.durchgang || 0) + 1);
    this.laufend.clear();
    this.namensSperre.clear();
    this.offlineSeit.clear();
    this.abmelden(null);
    this.zuschauerPruefen();
    this.speichern();
    this.planeSenden();
  }

  /* ---------- Zuschauer-Link ---------- */

  // Zuschauer, deren Link nicht mehr gilt (gelöscht, neu erstellt, zurückgesetzt), abmelden
  zuschauerPruefen() {
    for (const ws of this.ctx.getWebSockets('zuschauer')) {
      const a = anhang(ws);
      if (a.rolle !== 'zuschauer' || a.code === this.z.zuschauerCode) continue;
      anhangSetzen(ws, { rolle: 'zu' });
      senden(ws, { type: 'zuschauen-ungueltig' });
      try { ws.close(4003, 'Link abgelaufen'); } catch (e) { /* schon zu */ }
    }
  }

  // Beamer-Ansicht für die Lehrkraft (mit Zuschauer-Code) und für Zuschauer (ohne)
  beamerNachrichten() {
    const v = L.beamerAnsicht(this.z, this.kontext());
    const zuschauer = this.ctx.getWebSockets('zuschauer').filter(ws => anhang(ws).rolle === 'zuschauer').length;
    return {
      lehrer: JSON.stringify({ type: 'zustand', z: Object.assign({}, v, { zuschauer: { code: this.z.zuschauerCode || null, verbunden: zuschauer } }) }),
      zuschauer: JSON.stringify({ type: 'zustand', z: Object.assign(L.ohneLehrerDaten(v), { zuschauer: { verbunden: zuschauer } }) }),
    };
  }

  /* ---------- Ansichten verschicken ---------- */

  onlineSet() {
    const s = new Set();
    for (const ws of this.ctx.getWebSockets('tn')) {
      const a = anhang(ws);
      if (a.rolle === 'tn') s.add(a.id);
    }
    const jetzt = Date.now();
    for (const [id, t] of this.letzterPoll) {
      if (jetzt - t < POLL_ONLINE_MS) s.add(id);
      else {
        this.letzterPoll.delete(id);
        if (!s.has(id) && !this.offlineSeit.has(id)) {
          this.offlineSeit.set(id, t + POLL_ONLINE_MS);
          setTimeout(() => this.offlinePruefen(), OFFLINE_FREIGABE_MS + 500);
        }
      }
    }
    return s;
  }

  // Viele Änderungen kurz hintereinander (z. B. 30 Stimmen) werden zu einer Sendung zusammengefasst
  planeSenden() {
    if (this.sendeTimer) return;
    this.sendeTimer = setTimeout(() => {
      this.sendeTimer = null;
      this.allesSenden();
    }, 40);
  }

  allesSenden() {
    let beamer = null;
    let kx = null;
    for (const ws of this.ctx.getWebSockets()) {
      const a = anhang(ws);
      if ((a.rolle === 'lehrer' && a.ok) || a.rolle === 'zuschauer') {
        if (!beamer) beamer = this.beamerNachrichten();
        senden(ws, a.rolle === 'lehrer' ? beamer.lehrer : beamer.zuschauer);
      } else if (a.rolle === 'tn') {
        const v = L.tnAnsicht(this.z, a.id, kx || (kx = this.kontext()));
        if (v) senden(ws, { type: 'ansicht', a: v });
      }
    }
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === '/api/ws' || url.pathname === '/api/poll') {
      const stub = env.WORKSHOP.get(env.WORKSHOP.idFromName(OBJEKT_NAME));
      return stub.fetch(request);
    }
    if (url.pathname.startsWith('/api/')) return new Response('Nicht gefunden', { status: 404 });
    return env.ASSETS.fetch(request);
  },
};
