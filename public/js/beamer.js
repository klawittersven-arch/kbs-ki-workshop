/*
 * Beamer-Ansicht der Lehrkraft: Folien, Demos, Punktestand, Export und Zurücksetzen.
 * Der Server schickt nach jeder Änderung den ganzen Zustand („zustand“). Wechselt der
 * Schritt, wird der Bildschirm neu aufgebaut, sonst nur aktualisiert (damit Animationen
 * und das Video weiterlaufen).
 */
import { ABLAUF, UMFRAGE_FRAGE, UMFRAGE_OPTIONEN, PFLEGEPROZESS, GRAFIK_AUFGABEN, GRAFIK_BILDER, GRUPPENGROESSE, gruppeInfo, NOTEN_NAMEN } from './gemeinsam.js';
import { SPRACHEN, FLAGGEN, NIVEAU_NAMEN_DE } from './inhalte-sprachen.js';
import { ABSCHNITTE } from './inhalte-puzzle.js';
import { KOERPER, SKELETT, europaSvg } from './grafik-koerper.js';
import { beamerVerbindung, zuschauerVerbindung } from './verbindung.js';
import { Wortwolke } from './wortwolke.js';
import { xlsxErstellen } from './export.js';

/* =====================================================================
   Einstellungen und Folientexte
   ===================================================================== */
const HANDY_ADRESSE = location.origin + '/';
// Zuschauer-Link (…/beamer?zuschauen=CODE): gleiche Ansicht, aber ohne Steuerung und ohne PIN
const ZUSCHAUER_CODE = new URLSearchParams(location.search).get('zuschauen') || '';
const ZUSCHAUER = !!ZUSCHAUER_CODE;
if (ZUSCHAUER) { document.body.classList.add('zuschauer'); document.title = 'KI-Workshop – Zuschauer'; }
const VIDEO_DATEI = 'video/pflegeprozess.mp4';
const VIDEO_DRIVE = 'https://drive.google.com/file/d/1C42lMvY-1WYxzDCiLV_dKR-cuAuybSPk/preview';
const LERNZEIT_SEKUNDEN = 120;
const CLAUDE_ADRESSE = 'https://claude.ai';

const DEMOS = {
  demo1: {
    nr: 1, titel: 'interaktiven Präsentationstools', unter: 'Abstimmungen mit Balkendiagramm',
    prompt: 'Erstelle mir eine Multiple-Choice-Abstimmung mit dynamischem Balkendiagramm.', bild: 'balken',
  },
  demo2: {
    nr: 2, titel: 'interaktiven Präsentationstools', unter: 'Interaktive Wortwolke (à la Mentimeter)',
    prompt: 'Erstelle mir eine Word Cloud im Stil von Mentimeter.', bild: 'wolke',
  },
  demo3: {
    nr: 3, titel: 'messbarem Fortschritt für erledigte Aufgaben', unter: '',
    prompt: 'Erstelle mir eine Übersicht, mit der meine SuS Feedback zu ihrer Mitarbeit am Unterricht in Form von Punktewerten bekommen.', bild: 'punkte',
  },
  demo4: {
    nr: 4, titel: 'digitalen Karteikarten', unter: '',
    prompt: 'Erstelle mir eine Webanwendung mit digitalen Lernkarten (im Stil von Quizlet).', bild: 'karten',
  },
  demo5: {
    nr: 5, titel: 'KI-Songs', unter: '',
    prompt: 'Erstelle mir einen kurzen Merksong, der den SuS hilft, sich die 6 Schritte des Pflegeprozesses (nach Fiechter und Meier) einzuprägen, und eine passende Aufgabe dazu.', bild: 'song',
  },
  demo6: {
    nr: 6, titel: 'unterschiedlichen Sprachen', unter: '',
    prompt: 'Erstelle mir eine Aufgabe, bei der die SuS am Smartphone zwischen Deutsch, Türkisch, Russisch, Ukrainisch, Französisch und Spanisch sowie verschiedenen Sprachniveaus wechseln können.', bild: 'sprachen',
  },
  demo7: {
    nr: 7, titel: 'Grafiken', unter: '',
    prompt: 'Erstelle mir ein Lernspiel, bei dem die SuS auf einer Landkarte Länder und auf Körperdarstellungen Organe und Knochen antippen.', bild: 'grafik',
  },
  demo8: {
    nr: 8, titel: 'Gruppenarbeiten', unter: '',
    prompt: 'Erstelle mir eine Anwendung, die meine SuS in Gruppen einteilt, und ein Gruppenpuzzle, das nur gemeinsam lösbar ist.', bild: 'gruppen',
  },
  demo9: {
    nr: 9, titel: 'Minispielen', unter: '',
    prompt: 'Erstelle mir einen Endless Runner mit Highscore-Funktion.', bild: 'spiel',
  },
  demo10: {
    nr: 10, titel: 'automatisch korrigierten Tests', unter: '',
    prompt: 'Erstelle mir einen Multiple-Choice-Test mit Notenberechnung, bei dem die Fragen für alle SuS anders gemischt sind und die Note nur auf dem eigenen Smartphone erscheint.', bild: 'test',
  },
};

// Ausschnitt aus der Verlaufsbeschreibung (Folie „Und der Prompt?“)
const PROMPT_AUSZUG = [
  'Ich werde im Folgenden beschreiben, wie ich mir den Stundenverlauf für den Workshop vorstelle und welche Features die Webanwendung, die du schreiben sollst, dabei haben soll.',
  '[LOGIN-MODUS – Auf den Smartphones: Nach dem Scannen des QR-Codes müssen die TN ihren Vornamen sowie den Anfangsbuchstaben ihres Nachnamens eingeben und ein Passwort vergeben …]',
  '[DEMO 2: WORTWOLKE – Auf dem Beamer: Oben steht: „Was sind die ersten Begriffe, die euch spontan zum Thema KI einfallen?“ Unter dieser Überschrift entsteht die dynamische Wortwolke. Wörter, die mehrfach genannt werden, rücken in die Mitte und werden größer …]',
  '[PUNKTESTAND-MODUS – Wenn ein TN auf „Ich habe eine Frage“ drückt, wird der Name des TN rot markiert. Wenn ein TN auf „Ich habe eine Antwort“ drückt, wird der Name grün markiert …]',
  '[DEMO 9: MINISPIEL – Auf den Smartphones startet der Endless Runner … umbenannt in „KAROLINE-RUN!“ …]',
];

// Folie „Wünsch dir was!“ (gleich nach der Anmeldung): erst die Impulsfrage ans Kollegium,
// dann die Karten nach und nach aufdecken. „ort“ sagt, wo man es in der Stunde sieht.
const WUNSCH = {
  frage: 'Stell dir vor, du hast einen Wunsch frei: eine Software für deinen Unterricht, die einfach alles kann.',
  nachfrage: 'Was soll sie können?',
  schluss: 'Heute live – alles in einer einzigen Anwendung.',
  gruppen: [
    {
      titel: 'IM UNTERRICHT', art: 'unterricht', karten: [
        { symbol: '🗳️', text: 'Abstimmen, Meinungen einholen, Feedback', ort: 'Demo 1 & 2' },
        { symbol: '📈', text: 'Mitarbeit oder Lernstand sichtbar machen', ort: 'Demo 3' },
        { symbol: '🔁', text: 'Üben, Wiederholen, Prüfungsvorbereitung', ort: 'Demo 4 & 5' },
        { symbol: '🌍', text: 'Differenzieren, Sprachbarrieren/DaZ, Inklusion', ort: 'Demo 6' },
        { symbol: '🖼️', text: 'Anschaulich erklären, visualisieren', ort: 'Demo 5 & 7' },
        { symbol: '👥', text: 'Gruppen bilden, Zusammenarbeit fördern', ort: 'Demo 8' },
        { symbol: '🎮', text: 'Motivieren, Spaß, Wettbewerb', ort: 'Demo 9 & Punktestand' },
      ],
    },
    {
      titel: 'RUND UM DEN UNTERRICHT', art: 'rund', karten: [
        { symbol: '📱', text: 'Einfach & datensparsam: ohne App, ohne Konto, kostenlos', ort: 'ganze Stunde' },
        { symbol: '✅', text: 'Korrigieren & benoten', ort: 'Demo 10' },
        { symbol: '🗂️', text: 'Verwaltung: Anwesenheit, Noten, Excel-Export', ort: 'Anmeldung & Export' },
        { symbol: '🤖', text: 'KI im Hintergrund: Planung, Material & Übersetzungen', ort: 'Vorbereitung' },
      ],
    },
  ],
};

const SCHRITT_NAMEN = ABLAUF.map((s, i) => {
  const n = {
    login: 'Anmeldung', umfrage: 'Demo 1: Balkendiagramm', wortwolke: 'Demo 2: Wortwolke',
    punkte: 'Punktestand', lernkarten: 'Demo 4: Lernkarten', video: 'Demo 5: KI-Song',
    sortieren: 'Sortieraufgabe', sprachen: 'Demo 6: Sprachen', grafik: 'Demo 7: Grafiken',
    gruppen: 'Demo 8: Gruppen einteilen', puzzle: 'Demo 8: Gruppenpuzzle', gruppensieg: 'Demo 8: Siegerehrung der Gruppen',
    spiel: 'Demo 9: Minispiel', siegerehrung: 'Siegerehrung', test: 'Demo 10: Test', notenspiegel: 'Demo 10: Notenspiegel',
  }[s.modus];
  if (n) return (i + 1) + '. ' + n + (s.fragerunde ? ' (Fragerunde + Export)' : '');
  const f = { wunsch: 'Wünsch dir was! (Übersicht)', wort: 'Im Anfang war das Wort', prompt: 'Und der Prompt?', fragerunde: 'Fragerunde', jetzt: 'Jetzt seid ihr dran!' }[s.folie];
  return (i + 1) + '. Folie: ' + (f || 'Demo ' + DEMOS[s.folie].nr);
});

/* =====================================================================
   Hilfsfunktionen
   ===================================================================== */
const $ = (sel, wurzel = document) => wurzel.querySelector(sel);

function esc(s) {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function qr(el, text, groesse) {
  el.textContent = '';
  if (typeof QRCode === 'undefined') { el.textContent = text; return; }
  new QRCode(el, { text, width: groesse, height: groesse, correctLevel: QRCode.CorrectLevel.M });
}

let hinweisTimer = null;
function hinweis(text) {
  const h = $('#hinweis');
  h.textContent = text;
  h.classList.add('zeigen');
  clearTimeout(hinweisTimer);
  hinweisTimer = setTimeout(() => h.classList.remove('zeigen'), 3200);
}

// Einfacher Dialog: knoepfe = [{ text, art, wert }]
function dialog({ titel, text, knoepfe, eingabe }) {
  return new Promise(fertig => {
    const ebene = document.createElement('div');
    ebene.className = 'ebene';
    ebene.innerHTML = `<div class="dialog" role="dialog" aria-modal="true"><h2>${esc(titel)}</h2>${text ? `<p>${text}</p>` : ''}<div class="knoepfe"></div></div>`;
    const reihe = $('.knoepfe', ebene);
    const schliessen = wert => { ebene.remove(); document.removeEventListener('keydown', taste, true); fertig(wert); };
    for (const k of knoepfe) {
      const b = document.createElement('button');
      b.textContent = k.text;
      if (k.art) b.className = k.art;
      b.addEventListener('click', () => schliessen(k.wert));
      reihe.appendChild(b);
    }
    const taste = e => { if (e.key === 'Escape') { e.stopPropagation(); schliessen(null); } };
    document.addEventListener('keydown', taste, true);
    document.body.appendChild(ebene);
    const haupt = $('button.haupt, button.warn', ebene) || $('button', ebene);
    if (haupt && !eingabe) haupt.focus();
  });
}

function rangliste(tn) {
  const sortiert = tn.slice().sort((a, b) => b.punkte.gesamt - a.punkte.gesamt || a.name.localeCompare(b.name, 'de'));
  let rang = 0, vorher = null;
  sortiert.forEach((t, i) => {
    if (t.punkte.gesamt !== vorher) { rang = i + 1; vorher = t.punkte.gesamt; }
    t.rang = rang;
  });
  return sortiert;
}

/* =====================================================================
   Video zum KI-Song: gleich nach dem Start im Hintergrund komplett laden,
   damit es in Demo 5 sofort läuft. Alternativ: Datei vom Laptop öffnen.
   ===================================================================== */
const video = { quelle: VIDEO_DATEI, status: 'wartet', prozent: 0 };   // status: wartet | laedt | bereit | lokal | fehler

async function videoVorladen() {
  if (video.status !== 'wartet') return;
  video.status = 'laedt';
  videoAnzeigen();
  try {
    const r = await fetch(VIDEO_DATEI);
    if (!r.ok || !r.body) throw new Error('HTTP ' + r.status);
    const gesamt = Number(r.headers.get('content-length')) || 0;
    const leser = r.body.getReader();
    const teile = [];
    let geladen = 0;
    for (;;) {
      const { done, value } = await leser.read();
      if (done) break;
      teile.push(value);
      geladen += value.length;
      const p = gesamt ? Math.floor(100 * geladen / gesamt) : 0;
      if (p !== video.prozent) { video.prozent = p; videoAnzeigen(); }
    }
    if (video.status !== 'laedt') return;           // inzwischen Datei vom Laptop gewählt
    video.quelle = URL.createObjectURL(new Blob(teile, { type: 'video/mp4' }));
    video.status = 'bereit';
  } catch (e) {
    if (video.status === 'laedt') video.status = 'fehler';
  }
  videoAnzeigen();
}

function videoText() {
  return {
    wartet: '🎬 Video: noch nicht geladen',
    laedt: `🎬 Video wird vorgeladen … ${video.prozent} %`,
    bereit: '🎬 Video vorgeladen ✓',
    lokal: '🎬 Video vom Laptop ✓',
    fehler: '🎬 Video konnte nicht vorgeladen werden',
  }[video.status];
}

// Statuszeilen auf Anmeldebildschirm, Video-Bildschirm und im Menü aktualisieren
function videoAnzeigen() {
  document.querySelectorAll('[data-video-status]').forEach(e => { e.textContent = videoText(); });
  if (bildschirm && bildschirm.videoBereit) bildschirm.videoBereit();
}

// Datei vom Laptop wählen (z. B. aus dem Ordner „Videos“) – läuft ohne Internet
function videoVomLaptop() {
  const feld = document.createElement('input');
  feld.type = 'file';
  feld.accept = 'video/*';
  feld.addEventListener('change', () => {
    const datei = feld.files && feld.files[0];
    if (!datei) return;
    if (video.quelle.startsWith('blob:')) URL.revokeObjectURL(video.quelle);
    video.quelle = URL.createObjectURL(datei);
    video.status = 'lokal';
    videoAnzeigen();
    hinweis('Video vom Laptop geladen: ' + datei.name);
  });
  feld.click();
}

/* =====================================================================
   Bühne einpassen (16:9, 1600 × 900)
   ===================================================================== */
const buehne = $('#buehne');
function einpassen() {
  const s = Math.min(window.innerWidth / 1600, window.innerHeight / 900);
  buehne.style.transform = `translate(-50%, -50%) scale(${s})`;
}
window.addEventListener('resize', einpassen);
einpassen();

/* =====================================================================
   Verbindung
   ===================================================================== */
let z = null;                 // letzter Zustand vom Server
let zeitVersatz = 0;          // Serverzeit − eigene Zeit
let aufgebaut = { schritt: -1, durchgang: -1 };
let bildschirm = null;        // { aktualisieren(z), abbauen() }
let verbunden = false;

const handler = {
  onPin: zeigePinDialog,
  onUngueltig: zuschauenBeendet,
  onStatus(s) {
    verbunden = s === 'verbunden' || s === 'freigeschaltet';
    if (s === 'freigeschaltet') { $('#pin-ebene').hidden = true; videoVorladen(); }
    $('#verbindung-weg').hidden = verbunden;
    const p = $('.kopf .punkt');
    if (p) p.classList.toggle('weg', !verbunden);
  },
  onNachricht(m) {
    if (m.type !== 'zustand') return;
    if (ZUSCHAUER) videoVorladen();
    z = m.z;
    zeitVersatz = z.serverZeit - Date.now();
    if (z.schritt !== aufgebaut.schritt || z.durchgang !== aufgebaut.durchgang) aufbauen();
    else if (bildschirm) bildschirm.aktualisieren(z);
    kopfAktualisieren();
    if (!$('#menue').hidden) menueAufbauen();
  },
};
const verbindung = ZUSCHAUER ? zuschauerVerbindung(ZUSCHAUER_CODE, handler) : beamerVerbindung(handler);
const senden = m => { if (!ZUSCHAUER) verbindung.senden(m); };

// Zuschauer-Link gelöscht, neu erstellt oder alles zurückgesetzt
function zuschauenBeendet() {
  if (bildschirm && bildschirm.abbauen) bildschirm.abbauen();
  bildschirm = null;
  z = null;
  aufgebaut = { schritt: -1, durchgang: -1 };
  buehne.className = '';
  buehne.innerHTML = `<div class="zuschauen-ende"><img src="img/kbs-logo.png" alt=""><h1>Dieser Zuschauer-Link ist nicht (mehr) gültig.</h1>
    <p>Die Präsentation wurde beendet oder zurückgesetzt. Bitte frag die Lehrkraft nach einem neuen Link.</p></div>`;
}

/* ---------- PIN ---------- */
function zeigePinDialog({ eingerichtet, fehler }) {
  const ebene = $('#pin-ebene');
  ebene.hidden = false;
  $('#pin-titel').textContent = eingerichtet ? 'Lehrkraft-PIN eingeben' : 'Lehrkraft-PIN festlegen';
  $('#pin-text').textContent = eingerichtet
    ? 'Nur mit der PIN lässt sich die Präsentation steuern. Dieses Gerät merkt sich die PIN.'
    : 'Lege eine PIN fest (mindestens 4 Zeichen). Nur mit dieser PIN lässt sich die Präsentation steuern. Dieses Gerät merkt sich die PIN.';
  $('#pin-fehler').textContent = {
    falsch: 'Die PIN ist falsch.', gesperrt: 'Zu viele Versuche – bitte eine Minute warten.', kurz: 'Bitte mindestens 4 Zeichen.',
  }[fehler] || '';
  const feld = $('#pin-feld');
  feld.value = '';
  setTimeout(() => feld.focus(), 50);
}
$('#pin-form').addEventListener('submit', e => {
  e.preventDefault();
  const p = $('#pin-feld').value.trim();
  if (!p) return;
  $('#pin-fehler').textContent = '';
  verbindung.pinSenden(p);
});

/* =====================================================================
   Grundgerüst eines Bildschirms
   ===================================================================== */
function kopfHtml() {
  return `<header class="kopf"><img src="img/kbs-logo.png" alt="">
    <div class="schule">Karoline-Breitinger-Schule<small>Multimedia-Nachmittag · Digitale Tools &amp; KI</small></div>
    <div class="rechts">${ZUSCHAUER ? '<span class="zuschauer-marke">👁 ZUSCHAUER-ANSICHT</span>' : ''}<span class="titel-klein">KI-WORKSHOP</span>
    <span class="zaehler" title="verbundene Handys"><span class="punkt${verbunden ? '' : ' weg'}"></span><span class="online-zahl">0</span>&nbsp;Handys</span></div></header>`;
}

function kopfAktualisieren() {
  const n = z ? z.tn.filter(t => t.online).length : 0;
  document.querySelectorAll('.online-zahl').forEach(e => { e.textContent = n; });
}

function fussHtml({ miniQr = false, links = '' } = {}) {
  const s = ABLAUF[z.schritt];
  return `<footer class="fuss"><div class="links">${miniQr
    ? `<div class="mini-qr" data-qr></div><div class="mini-text"><b>Rausgeflogen?</b><br>QR-Code scannen,<br>Name + Passwort eingeben.</div>`
    : ''}${links}</div>${s.knopf ? `<button class="weiter" data-weiter>${esc(s.knopf)}</button>` : ''}</footer>`;
}

function aufbauen() {
  if (bildschirm && bildschirm.abbauen) bildschirm.abbauen();
  bildschirm = null;
  aufgebaut = { schritt: z.schritt, durchgang: z.durchgang };
  const s = ABLAUF[z.schritt];
  buehne.className = '';
  buehne.innerHTML = '';
  const bauer = s.modus === 'folie' ? FOLIEN_BAUER[s.folie] : BILDSCHIRME[s.modus];
  bildschirm = bauer(s) || { aktualisieren() {} };
  buehne.querySelectorAll('[data-qr]').forEach(e => qr(e, HANDY_ADRESSE, 140));
  buehne.querySelectorAll('[data-weiter]').forEach(b => b.addEventListener('click', weiter));
  bildschirm.aktualisieren(z);
}

function weiter() {
  if (z && z.schritt === 0) vollbild(true);
  if (bildschirm && bildschirm.weiter && bildschirm.weiter()) return;   // z. B. erst die nächste Karte aufdecken
  senden({ type: 'weiter' });
}

function vollbild(an) {
  try {
    if (an && !document.fullscreenElement) document.documentElement.requestFullscreen().catch(() => {});
    if (!an && document.fullscreenElement) document.exitFullscreen().catch(() => {});
  } catch (e) { /* Browser ohne Vollbild */ }
}

function gerüst({ dunkel = false, miniQr = false, links = '' } = {}) {
  if (dunkel) buehne.classList.add('dunkel-folie');
  buehne.innerHTML = kopfHtml() + '<div class="inhalt"></div>' + fussHtml({ miniQr, links });
  kopfAktualisieren();
  return $('.inhalt', buehne);
}

/* =====================================================================
   Illustrationen der Demo-Folien
   ===================================================================== */
const BILDER = {
  balken: `<svg viewBox="0 0 440 380"><rect x="14" y="20" width="412" height="340" rx="30" fill="#fff" stroke="#DCE7E9" stroke-width="3"/>
    <text x="50" y="72" font-size="24" font-weight="700" fill="#25434B">Wozu nutzt du KI?</text>
    <rect class="wachs" style="animation-delay:.2s" x="58" y="200" width="62" height="110" rx="10" fill="#3F6C72"/>
    <rect class="wachs" style="animation-delay:.35s" x="140" y="120" width="62" height="190" rx="10" fill="#E8833A"/>
    <rect class="wachs" style="animation-delay:.5s" x="222" y="165" width="62" height="145" rx="10" fill="#7B5EA7"/>
    <rect class="wachs" style="animation-delay:.65s" x="304" y="230" width="62" height="80" rx="10" fill="#2E9E5B"/>
    <line x1="44" y1="312" x2="396" y2="312" stroke="#CBD8DB" stroke-width="5" stroke-linecap="round"/></svg>`,
  wolke: `<svg viewBox="0 0 440 380"><path d="M110 300 C40 300 30 210 95 195 C80 120 170 90 210 140 C240 70 360 90 350 175 C420 180 420 300 340 300 Z" fill="#fff" stroke="#DCE7E9" stroke-width="4"/>
    <text x="215" y="235" text-anchor="middle" font-size="46" font-weight="800" fill="#3F6C72">Chatbot</text>
    <text x="160" y="190" text-anchor="middle" font-size="26" font-weight="800" fill="#E8833A">Zukunft</text>
    <text x="290" y="185" text-anchor="middle" font-size="22" font-weight="800" fill="#7B5EA7">Texte</text>
    <text x="300" y="275" text-anchor="middle" font-size="24" font-weight="800" fill="#C2416B">Hilfe</text>
    <text x="150" y="280" text-anchor="middle" font-size="20" font-weight="800" fill="#2E9E5B">Daten</text>
    <text transform="translate(108 252) rotate(-90)" font-size="20" font-weight="800" fill="#2B7BB9">Angst</text>
    <text transform="translate(358 260) rotate(-90)" font-size="18" font-weight="800" fill="#B5523B">Ideen</text></svg>`,
  punkte: `<svg viewBox="0 0 440 380">
    <g><rect x="30" y="70" width="330" height="64" rx="16" fill="#fff" stroke="#E9B949" stroke-width="4"/><circle cx="66" cy="102" r="20" fill="#E9B949"/><text x="66" y="110" text-anchor="middle" font-size="22" font-weight="800" fill="#5A4300">1</text><text x="100" y="111" font-size="26" font-weight="700" fill="#16262A">Anna M.</text><text x="340" y="112" text-anchor="end" font-size="28" font-weight="800" fill="#25434B">180</text></g>
    <g><rect x="30" y="150" width="330" height="64" rx="16" fill="#DDF3E6" stroke="#2E9E5B" stroke-width="4"/><circle cx="66" cy="182" r="20" fill="#AEB8BC"/><text x="66" y="190" text-anchor="middle" font-size="22" font-weight="800" fill="#2C3A3E">2</text><text x="100" y="191" font-size="26" font-weight="700" fill="#16262A">Jonas K.</text><text x="340" y="192" text-anchor="end" font-size="28" font-weight="800" fill="#25434B">150</text></g>
    <g><rect x="30" y="230" width="330" height="64" rx="16" fill="#FBE3E3" stroke="#D64545" stroke-width="4"/><circle cx="66" cy="262" r="20" fill="#C98A55"/><text x="66" y="270" text-anchor="middle" font-size="22" font-weight="800" fill="#fff">3</text><text x="100" y="271" font-size="26" font-weight="700" fill="#16262A">Lea S.</text><text x="340" y="272" text-anchor="end" font-size="28" font-weight="800" fill="#25434B">120</text></g>
    <g class="huepf"><circle cx="380" cy="140" r="44" fill="#2E9E5B"/><text x="380" y="153" text-anchor="middle" font-size="34" font-weight="900" fill="#fff">+50</text></g></svg>`,
  karten: `<svg viewBox="0 0 440 380">
    <g transform="rotate(-8 200 200)"><rect x="70" y="80" width="260" height="170" rx="20" fill="#EAF2F4" stroke="#7FA9AE" stroke-width="4"/></g>
    <g transform="rotate(4 230 210)"><rect x="110" y="110" width="270" height="180" rx="20" fill="#fff" stroke="#3F6C72" stroke-width="5"/>
    <text x="245" y="215" text-anchor="middle" font-size="62" font-weight="800" fill="#25434B">Cor</text>
    <text x="245" y="262" text-anchor="middle" font-size="20" fill="#5B6F74">antippen zum Umdrehen</text></g>
    <g transform="translate(330 70)"><circle r="40" fill="#E8833A"/><text y="12" text-anchor="middle" font-size="30" font-weight="800" fill="#fff">Herz</text></g>
    <path d="M300 300 q40 30 70 -10" stroke="#E8833A" stroke-width="6" fill="none" stroke-linecap="round"/><path d="M362 278 l10 14 l-16 4" stroke="#E8833A" stroke-width="6" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  song: `<svg viewBox="0 0 440 380">
    <circle cx="220" cy="190" r="150" fill="#fff" stroke="#DCE7E9" stroke-width="4"/>
    <g class="huepf"><path d="M175 255 V125 L295 100 V230" stroke="#25434B" stroke-width="12" fill="none" stroke-linejoin="round"/>
    <ellipse cx="155" cy="258" rx="30" ry="22" fill="#3F6C72"/><ellipse cx="275" cy="232" rx="30" ry="22" fill="#E8833A"/></g>
    <path d="M330 120 q25 30 0 60" stroke="#7FA9AE" stroke-width="7" fill="none" stroke-linecap="round"/>
    <path d="M352 100 q42 50 0 100" stroke="#7FA9AE" stroke-width="7" fill="none" stroke-linecap="round" opacity=".6"/>
    <text x="80" y="110" font-size="40" fill="#C2416B">♪</text><text x="95" y="330" font-size="34" fill="#7B5EA7">♫</text></svg>`,
  spiel: `<canvas class="pixel-szene" width="440" height="380"></canvas>`,
  sprachen: (() => {
    const gruesse = ['Hallo', 'Merhaba', 'Привет', 'Привіт', 'Bonjour', 'Hola'];
    const plaetze = [[40, 54], [170, 54], [300, 54], [40, 184], [170, 184], [300, 184]];
    return `<svg viewBox="0 0 440 380"><rect x="14" y="20" width="412" height="340" rx="30" fill="#fff" stroke="#DCE7E9" stroke-width="3"/>
      ${SPRACHEN.map((sp, i) => {
        const [x, y] = plaetze[i];
        return `<g class="wachs" style="animation-delay:${(0.15 * i).toFixed(2)}s">${FLAGGEN[sp.code].replace('<svg ', `<svg x="${x + 10}" y="${y}" width="80" height="48" `)}
          <text x="${x + 50}" y="${y + 82}" text-anchor="middle" font-size="22" font-weight="700" fill="#25434B">${gruesse[i]}</text></g>`;
      }).join('')}
      <g font-size="17" font-weight="700"><rect x="52" y="300" width="96" height="34" rx="17" fill="#EAF2F4"/><text x="100" y="323" text-anchor="middle" fill="#3F6C72">Leicht</text>
      <rect x="160" y="300" width="120" height="34" rx="17" fill="#3F6C72"/><text x="220" y="323" text-anchor="middle" fill="#fff">Standard</text>
      <rect x="292" y="300" width="96" height="34" rx="17" fill="#EAF2F4"/><text x="340" y="323" text-anchor="middle" fill="#3F6C72">Fach</text></g></svg>`;
  })(),
  grafik: `<svg viewBox="0 0 440 380"><rect x="14" y="20" width="412" height="340" rx="30" fill="#fff" stroke="#DCE7E9" stroke-width="3"/>
    <svg x="30" y="32" width="210" height="316" viewBox="0 0 240 326">${KOERPER.svg}</svg>
    <svg x="235" y="32" width="185" height="316" viewBox="0 0 240 426">${SKELETT.svg}</svg>
    <g class="huepf"><circle cx="122" cy="207" r="9" fill="#2E9E5B" stroke="#fff" stroke-width="3"/><circle cx="152" cy="232" r="9" fill="#D64545" stroke="#fff" stroke-width="3"/>
    <circle cx="303" cy="300" r="9" fill="#2E9E5B" stroke="#fff" stroke-width="3"/><text x="160" y="196" font-size="34">👆</text></g></svg>`,
  test: `<svg viewBox="0 0 440 380">
    <g transform="rotate(-4 220 190)"><rect x="70" y="30" width="260" height="320" rx="16" fill="#fff" stroke="#DCE7E9" stroke-width="3"/>
    <text x="96" y="78" font-size="24" font-weight="800" fill="#25434B">Test</text>
    ${[0, 1, 2, 3].map(i => `<g class="wachs" style="animation-delay:${(0.2 + 0.25 * i).toFixed(2)}s">
      <rect x="96" y="${108 + i * 52}" width="30" height="30" rx="7" fill="${i === 2 ? '#FBE3E3' : '#DDF3E6'}" stroke="${i === 2 ? '#D64545' : '#2E9E5B'}" stroke-width="3"/>
      <text x="111" y="${131 + i * 52}" text-anchor="middle" font-size="22" font-weight="900" fill="${i === 2 ? '#D64545' : '#2E9E5B'}">${i === 2 ? '✗' : '✓'}</text>
      <rect x="140" y="${117 + i * 52}" width="${[150, 120, 160, 100][i]}" height="12" rx="6" fill="#EAF2F4"/></g>`).join('')}</g>
    <g class="huepf"><circle cx="340" cy="290" r="58" fill="#fff" stroke="#D64545" stroke-width="7"/>
    <text x="340" y="318" text-anchor="middle" font-size="80" font-weight="900" fill="#D64545">2</text></g>
    <g transform="translate(330 40)"><circle r="38" fill="#3F6C72"/><text y="13" text-anchor="middle" font-size="36">🔀</text></g></svg>`,
  gruppen: (() => {
    const g = [0, 1, 2].map(i => gruppeInfo(i));
    const pos = [[220, 95], [105, 285], [335, 285]];
    return `<svg viewBox="0 0 440 380">
      <path d="M 220 95 L 105 285 L 335 285 Z" fill="none" stroke="#CBD8DB" stroke-width="6" stroke-dasharray="4 10" stroke-linecap="round"/>
      ${g.map((x, i) => `<g class="wachs" style="animation-delay:${(0.2 * i).toFixed(1)}s"><circle cx="${pos[i][0]}" cy="${pos[i][1]}" r="62" fill="${x.farbe}"/>
        <text x="${pos[i][0]}" y="${pos[i][1] + 18}" text-anchor="middle" font-size="54">${x.tier}</text>
        <circle cx="${pos[i][0] + 46}" cy="${pos[i][1] - 44}" r="20" fill="#fff" stroke="${x.farbe}" stroke-width="4"/>
        <text x="${pos[i][0] + 46}" y="${pos[i][1] - 36}" text-anchor="middle" font-size="22" font-weight="800" fill="${x.farbe}">${'ABC'[i]}</text></g>`).join('')}
      <text class="huepf" x="220" y="236" text-anchor="middle" font-size="64">🧩</text></svg>`;
  })(),
};

// Kleine Szene aus KAROLINE-RUN! (Figur läuft auf der Stelle)
function pixelSzene(canvas) {
  if (!window.PIXEL) return () => {};
  const g = canvas.getContext('2d');
  g.imageSmoothingEnabled = false;
  const posen = ['lauf1', 'lauf2', 'lauf3', 'lauf4'].map(p => PIXEL.figur('schwester', p, 1));
  const sprung = PIXEL.figur('schwester', 'sprung', 1);
  const kuchen = PIXEL.rasterZeichnen(PIXEL.GRAFIK.kuchen, 1);
  const rollator = PIXEL.rasterZeichnen(PIXEL.GRAFIK.rollator, 1);
  let bild = 0, x = 0;
  const id = setInterval(() => {
    bild = (bild + 1) % 4;
    x = (x + 6) % 480;
    g.clearRect(0, 0, 440, 380);
    g.fillStyle = '#CFE5EC'; g.beginPath(); g.roundRect(10, 30, 420, 320, 30); g.fill();
    g.fillStyle = '#6E7377'; g.fillRect(10, 290, 420, 60);
    g.fillStyle = '#F4F4F4';
    for (let s = -x % 80; s < 440; s += 80) if (s > 10 && s < 410) g.fillRect(s, 318, 36, 6);
    const kx = 430 - (x % 480);
    const rx = 430 - ((x + 240) % 480);
    // Springen, sobald ein Hindernis heranrollt (Bogen über das Hindernis)
    let hoehe = 0;
    for (const ox of [kx, rx]) {
      const d = ox - 80;
      if (d < 150 && d > -110) { const t = (150 - d) / 260; hoehe = Math.max(hoehe, 4 * 120 * t * (1 - t)); }
    }
    const f = hoehe > 4 ? sprung : posen[bild];
    g.drawImage(f, 80, 290 - hoehe - f.height * 6, f.width * 6, f.height * 6);
    if (kx > 10 && kx < 420) g.drawImage(kuchen, kx, 290 - kuchen.height * 5, kuchen.width * 5, kuchen.height * 5);
    if (rx > 10 && rx < 420) g.drawImage(rollator, rx, 290 - rollator.height * 5, rollator.width * 5, rollator.height * 5);
    g.fillStyle = '#25434B'; g.font = '800 26px system-ui, sans-serif'; g.textAlign = 'right';
    g.fillText('HIGHSCORE 1250', 410, 76);
  }, 110);
  return () => clearInterval(id);
}

/* =====================================================================
   Folien
   ===================================================================== */
const FOLIEN_BAUER = {
  wunsch() {
    const inhalt = gerüst();
    let nr = 0;
    const karte = k => {
      const i = nr++;
      return `<button class="wunsch-karte" data-karte="${i}">
        <span class="seite rueckseite"><b>?</b><small>${esc(k.ort)}</small></span>
        <span class="seite vorderseite"><span class="symbol">${k.symbol}</span><span class="text">${esc(k.text)}</span><small>${esc(k.ort)}</small></span>
      </button>`;
    };
    inhalt.innerHTML = `<div class="folie-wunsch">
      <div class="wunsch-frage"><span class="kicker">✨ WÜNSCH DIR WAS!</span>
        <h1>${esc(WUNSCH.frage)}</h1><p class="nachfrage">${esc(WUNSCH.nachfrage)}</p>
        <p class="schluss">${esc(WUNSCH.schluss)}</p></div>
      <div class="wunsch-bloecke">${WUNSCH.gruppen.map(g => `<section class="wunsch-block ${g.art}"><h2>${esc(g.titel)}</h2>
        <div class="wunsch-karten">${g.karten.map(karte).join('')}</div></section>`).join('')}</div></div>`;
    const karten = [...inhalt.querySelectorAll('.wunsch-karte')];
    const n = karten.length;
    let offen = [];
    function zeigen() {
      karten.forEach((k, i) => k.classList.toggle('offen', offen.includes(i)));
      const alle = offen.length >= n;
      $('.schluss', inhalt).classList.toggle('sichtbar', alle);   // Platz ist reserviert, nichts verrutscht
      const knopf = $('[data-weiter]', buehne);
      if (knopf) knopf.textContent = alle ? ABLAUF[z.schritt].knopf : `AUFDECKEN (${offen.length}/${n})`;
    }
    function aufdecken(i) {
      if (offen.includes(i)) return;
      offen = offen.concat(i);
      zeigen();
      senden({ type: 'aufdecken', karte: i });
    }
    // Karte anklicken = genau diese aufdecken (passend zu einer Antwort aus dem Kollegium)
    karten.forEach((k, i) => k.addEventListener('click', () => { if (!ZUSCHAUER) aufdecken(i); }));
    return {
      aktualisieren(z) {
        offen = offen.concat((z.aufgedeckt || []).filter(i => !offen.includes(i)));
        zeigen();
      },
      // Weiter-Knopf und Pfeiltaste decken erst die nächste verdeckte Karte auf
      weiter() {
        const i = karten.findIndex((_, k) => !offen.includes(k));
        if (i < 0) return false;
        aufdecken(i);
        return true;
      },
    };
  },
  wort() {
    const inhalt = gerüst({ dunkel: true });
    const text = '„Im Anfang war das Wort“';
    const zeichen = [...text].map((c, i) => `<span class="zeichen" style="animation-delay:${(0.3 + i * 0.05).toFixed(2)}s">${c === ' ' ? '&nbsp;' : esc(c)}</span>`).join('');
    inhalt.innerHTML = `<div class="folie-wort"><blockquote>${zeichen}</blockquote><div class="strich"></div><cite>Johannes 1,1</cite></div>`;
  },
  demo1: demoFolie, demo2: demoFolie, demo3: demoFolie, demo4: demoFolie, demo5: demoFolie, demo6: demoFolie,
  demo7: demoFolie, demo8: demoFolie, demo9: demoFolie, demo10: demoFolie,
  prompt() {
    const inhalt = gerüst();
    inhalt.innerHTML = `<div class="folie-prompt">
      <div class="word-dok"><div class="leiste"><b>W</b> VerlaufBeschreibung.docx</div>
      <div class="seite">${PROMPT_AUSZUG.map(p => `<p>${esc(p)}</p>`).join('')}</div></div>
      <div><h1>Und der Prompt für diese ganze Stunde?</h1>
      <div class="gleichung"><span>📄 9 Seiten Beschreibung in Word</span><i>↓</i><span>💻 diese Anwendung</span></div>
      <p class="zitat">„Im Anfang war das Wort.“</p></div></div>`;
  },
  fragerunde() {
    const inhalt = gerüst();
    inhalt.innerHTML = `<div class="folie-fragerunde"><span class="kicker">FRAGERUNDE</span>
      <p class="einleitung">Nach dieser Übersicht und Inspiration …</p>
      <div class="fragen">
        <div class="frage-karte"><span class="symbol">💡</span><p>Welche eurer <b>Wünsche vom Anfang</b> fehlen noch – und <b>was würdet ihr damit bauen</b>?</p></div>
        <div class="frage-karte"><span class="symbol">🛠️</span><p>Welche <b>Probleme</b> würdet ihr gerne damit <b>lösen</b>?</p></div>
        <div class="frage-karte warn"><span class="symbol">⚠️</span><p>Oder: Wo seht ihr <b>Probleme</b>, die durch die Verwendung solcher KI-generierten Webanwendungen <b>entstehen</b> könnten?</p></div>
      </div></div>`;
  },
  jetzt() {
    const inhalt = gerüst({
      dunkel: true,
      links: '<button class="knopf2 warn" data-zuruecksetzen>↺ ALLES ZURÜCKSETZEN FÜR DEN NÄCHSTEN DURCHGANG</button>',
    });
    inhalt.innerHTML = `<div class="folie-jetzt"><div><h1>JETZT SEID IHR DRAN!</h1>
      <p>Wenn ihr wollt, könnt ihr jetzt selbst ausprobieren, mit der kostenlosen Version von Claude Software schreiben zu lassen. Ich helfe euch gerne bei den ersten Schritten!</p></div>
      <div class="qr-karte"><div class="qr" data-claude-qr></div>claude.ai</div></div>`;
    qr($('[data-claude-qr]', inhalt), CLAUDE_ADRESSE, 340);
    $('[data-zuruecksetzen]', buehne).addEventListener('click', zuruecksetzenFragen);
  },
};

function demoFolie(s) {
  const d = DEMOS[s.folie];
  const inhalt = gerüst();
  inhalt.innerHTML = `<div class="demo">
    <div class="text"><span class="kicker">DEMO ${d.nr}</span>
      <p class="lernen">Lernen mit …</p><h1>${esc(d.titel)}</h1>${d.unter ? `<p class="unter">${esc(d.unter)}</p>` : ''}</div>
    <div class="bild">${BILDER[d.bild]}</div>
    <div class="prompt"><span class="etikett">PROMPT</span><div class="tipp"></div>
      <span class="senden"><svg viewBox="0 0 24 24"><path d="M4 12h14M12 5l7 7-7 7" stroke="#fff" stroke-width="2.6" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg></span></div></div>`;
  // Prompt erscheint wie getippt
  const feld = $('.tipp', inhalt);
  let i = 0;
  let tippen = null;
  const start = setTimeout(() => {
    tippen = setInterval(() => {
      i += 1;
      feld.textContent = d.prompt.slice(0, i);
      if (i >= d.prompt.length) clearInterval(tippen);
    }, 28);
  }, 700);
  const stopp = d.bild === 'spiel' ? pixelSzene($('.pixel-szene', inhalt)) : () => {};
  return { aktualisieren() {}, abbauen() { clearTimeout(start); clearInterval(tippen); stopp(); } };
}

/* =====================================================================
   Bildschirme
   ===================================================================== */
const BILDSCHIRME = {
  /* ---------- Anmeldung ---------- */
  login() {
    const inhalt = gerüst({ links: '<a class="knopf2" href="handout.html" target="_blank" rel="noopener">🖨 QR-Code fürs Handout</a><span class="mini-text" data-video-status></span>' });
    inhalt.innerHTML = `<div class="login">
      <div class="qr-karte"><div class="qr-gross" id="qr-login"></div><div class="adresse">${esc(HANDY_ADRESSE.replace(/^https?:\/\//, '').replace(/\/$/, ''))}</div></div>
      <div><h1>Willkommen zum KI-Workshop!</h1>
        <ol><li><span>Scannt den QR-Code.</span></li>
        <li><span>Gebt euren Vornamen und den Anfangsbuchstaben eures Nachnamens ein.</span></li>
        <li><span>Vergebt ein Passwort.<span class="hinweis">mindestens 3 Zeichen, Groß- und Kleinschreibung ist egal</span></span></li>
        <li><span><span class="wichtig">Notiert euch bitte euer Passwort.</span></span></li></ol>
        <div class="dabei"><h2>Schon dabei: <b class="anzahl">0</b></h2><div class="chips"></div></div></div></div>`;
    qr($('#qr-login', inhalt), HANDY_ADRESSE, 440);
    const chips = $('.chips', inhalt);
    const elemente = new Map();
    return {
      aktualisieren(z) {
        $('.anzahl', inhalt).textContent = z.tn.length;
        chips.classList.toggle('viele', z.tn.length > 18);
        const da = new Set();
        for (const t of z.tn) {
          da.add(t.id);
          let c = elemente.get(t.id);
          if (!c) {
            c = document.createElement('button');
            c.className = 'chip';
            c.title = 'Passwort zurücksetzen oder entfernen';
            c.addEventListener('click', () => { if (!ZUSCHAUER) tnVerwalten(t.id); });
            chips.appendChild(c);
            elemente.set(t.id, c);
          }
          c.textContent = t.name;
          c.classList.toggle('weg', !t.online);
          c.classList.toggle('ohne-pw', t.ohnePasswort);
        }
        for (const [id, c] of elemente) if (!da.has(id)) { c.remove(); elemente.delete(id); }
      },
    };
  },

  /* ---------- Demo 1: Balkendiagramm ---------- */
  umfrage() {
    const inhalt = gerüst({ miniQr: true, links: '<div class="mini-text" data-info></div>' });
    const farben = ['#3F6C72', '#E8833A', '#7B5EA7', '#2E9E5B', '#9AA5A8'];
    inhalt.innerHTML = `<div class="frage-kopf"><h1>${esc(UMFRAGE_FRAGE)}</h1><p>Mehrfachauswahl möglich</p></div>
      <div class="balken-feld">${UMFRAGE_OPTIONEN.map((o, i) => `<div class="balken-spalte">
        <div class="balken-raum"><div class="balken-zahl">0</div><div class="balken" style="background:${farben[i]}"></div></div>
        <div class="balken-name">${i + 1}. ${esc(o)}</div></div>`).join('')}</div>`;
    const spalten = [...inhalt.querySelectorAll('.balken-spalte')];
    return {
      aktualisieren(z) {
        const st = z.umfrage.stimmen;
        const max = Math.max(1, ...st);
        const raum = $('.balken-raum', inhalt).clientHeight - 70;
        spalten.forEach((s, i) => {
          $('.balken-zahl', s).textContent = st[i];
          $('.balken', s).style.height = Math.max(6, raum * st[i] / max) + 'px';
        });
        $('[data-info]', buehne).innerHTML = `<b>${z.umfrage.abgestimmt}</b> ${z.umfrage.abgestimmt === 1 ? 'Person hat' : 'Personen haben'} abgestimmt`;
      },
    };
  },

  /* ---------- Demo 2: Wortwolke ---------- */
  wortwolke() {
    const inhalt = gerüst({ miniQr: true, links: '<div class="mini-text" data-info></div>' });
    inhalt.innerHTML = `<div class="frage-kopf"><h1>Was sind die ersten Begriffe, die euch spontan zum Thema KI einfallen?</h1></div><div class="wolke-feld"></div>`;
    const wolke = new Wortwolke($('.wolke-feld', inhalt), async schluessel => {
      if (ZUSCHAUER) return;
      const w = z.wolke.begriffe.find(b => b.schluessel === schluessel);
      const ja = await dialog({
        titel: 'Begriff ausblenden?',
        text: `„${esc(w ? w.text : schluessel)}“ verschwindet aus der Wortwolke. Die Punkte dafür werden abgezogen. Über das Menü (⚙) lässt er sich wieder einblenden.`,
        knoepfe: [{ text: 'Abbrechen', wert: false }, { text: 'Ausblenden', art: 'warn', wert: true }],
      });
      if (ja) senden({ type: 'verstecken', schluessel });
    });
    return {
      aktualisieren(z) {
        wolke.zeichnen(z.wolke.begriffe.filter(b => !b.versteckt));
        $('[data-info]', buehne).innerHTML = `<b>${z.wolke.abgeschickt}</b> ${z.wolke.abgeschickt === 1 ? 'Person hat' : 'Personen haben'} Begriffe geschickt${ZUSCHAUER ? '' : '<br><span style="font-size:14px">Klick auf ein Wort blendet es aus</span>'}`;
      },
    };
  },

  punkte: punkteBildschirm,

  /* ---------- Demo 10: Test mit Note ---------- */
  test() {
    const inhalt = gerüst({ miniQr: true });
    const U = 2 * Math.PI * 200;
    inhalt.innerHTML = `<div class="test-feld">
      <div class="test-text"><h1>Test auf eurem Smartphone</h1>
        <ul><li>🔀 Jede*r bekommt die Fragen in einer <b>eigenen Reihenfolge</b>.</li>
        <li>🔒 Die Note siehst <b>nur du</b> – auf deinem Smartphone.</li>
        <li>⏱ Wenn die Zeit um ist, wird automatisch abgegeben.</li></ul>
        <div class="test-stand"><span class="gross">0</span> <small>von 0 abgegeben</small></div><div class="sprach-fortschritt"><i></i></div></div>
      <div class="uhr"><svg viewBox="0 0 460 460"><circle cx="230" cy="230" r="200" fill="#fff" stroke="#EAF2F4" stroke-width="34"/>
      <circle class="ring" cx="230" cy="230" r="200" fill="none" stroke="#3F6C72" stroke-width="34" stroke-linecap="round" stroke-dasharray="${U}" stroke-dashoffset="0"/></svg>
      <div class="zeit">3:00</div></div></div>`;
    const uhr = $('.uhr', inhalt), ring = $('.ring', inhalt), zeit = $('.zeit', inhalt);
    let letzte = null;
    function ticken() {
      const t = letzte && letzte.test;
      if (!t || !t.start) return;
      const gesamt = t.dauer / 1000;
      const rest = Math.max(0, gesamt - (Date.now() + zeitVersatz - t.start) / 1000);
      ring.setAttribute('stroke-dashoffset', (U * (1 - rest / gesamt)).toFixed(1));
      ring.setAttribute('stroke', rest < 20 ? '#D64545' : rest < 60 ? '#E8833A' : '#3F6C72');
      if (rest <= 0) { uhr.classList.add('um'); zeit.textContent = 'Zeit um!'; return; }
      const s = Math.ceil(rest);
      zeit.textContent = Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
    }
    const id = setInterval(ticken, 250);
    return {
      aktualisieren(z) {
        letzte = z;
        const t = z.test;
        if (!t) return;
        const gesamt = Math.max(t.begonnen, z.tn.filter(x => x.online).length);
        $('.test-stand .gross', inhalt).textContent = t.abgegeben;
        $('.test-stand small', inhalt).textContent = `von ${gesamt} abgegeben`;
        $('.sprach-fortschritt i', inhalt).style.width = (gesamt ? 100 * t.abgegeben / gesamt : 0) + '%';
        ticken();
      },
      abbauen() { clearInterval(id); },
    };
  },

  notenspiegel() {
    const inhalt = gerüst();
    inhalt.innerHTML = `<div class="frage-kopf"><h1>Notenspiegel</h1><p>anonym – deine eigene Note siehst nur du auf deinem Smartphone</p></div>
      <div class="noten-feld">${[1, 2, 3, 4, 5, 6].map(n => `<div class="noten-spalte"><div class="balken-raum"><div class="balken-zahl">0</div>
        <div class="balken note-${n}"></div></div><div class="noten-name"><b>${n}</b><small>${esc(NOTEN_NAMEN[n])}</small></div></div>`).join('')}</div>
      <div class="noten-schnitt"></div>`;
    const spalten = [...inhalt.querySelectorAll('.noten-spalte')];
    return {
      aktualisieren(z) {
        const d = z.notenspiegel;
        if (!d) return;
        const max = Math.max(1, ...d.noten);
        const raum = $('.balken-raum', inhalt).clientHeight - 60;
        spalten.forEach((s, i) => {
          $('.balken-zahl', s).textContent = d.noten[i];
          $('.balken', s).style.height = Math.max(6, raum * d.noten[i] / max) + 'px';
        });
        $('.noten-schnitt', inhalt).innerHTML = d.teilgenommen
          ? `<b>${d.teilgenommen}</b> ${d.teilgenommen === 1 ? 'Test' : 'Tests'} · Durchschnitt <b>${d.schnitt.toFixed(1).replace('.', ',')}</b>`
          : 'Niemand hat am Test teilgenommen.';
      },
    };
  },

  /* ---------- Demo 6: Sprachen ---------- */
  sprachen() {
    const inhalt = gerüst({ miniQr: true, links: '<div class="mini-text" data-info></div>' });
    const zeile = (attr, links, rechts = '') => `<div class="sprach-zeile" ${attr}>${links}<span class="sbalken"><i></i></span><b>0</b>${rechts}</div>`;
    inhalt.innerHTML = `<div class="frage-kopf"><h1>Händehygiene – in deiner Sprache, auf deinem Niveau</h1></div>
      <div class="sprach-feld">
        <div class="sprach-karte"><h2>Gewählte Sprache</h2>
          ${SPRACHEN.map(sp => zeile(`data-sprache="${sp.code}"`, `<span class="flagge">${FLAGGEN[sp.code]}</span><span class="sname">${esc(sp.name)}<small>${esc(sp.eigen)}</small></span>`)).join('')}</div>
        <div class="sprach-karte"><h2>Gewähltes Niveau</h2>
          ${NIVEAU_NAMEN_DE.map((n, i) => zeile(`data-niveau="${i}"`, `<span class="sname">${esc(n)}</span>`)).join('')}
          <div class="fertig-zeile"><span class="gross">0</span> <small>von 0 fertig</small></div><div class="sprach-fortschritt"><i></i></div></div>
      </div>`;
    return {
      aktualisieren(z) {
        const d = z.sprachen || { je: {}, niveaus: [0, 0, 0], begonnen: 0, fertig: 0 };
        const maxS = Math.max(1, ...Object.values(d.je));
        const maxN = Math.max(1, ...d.niveaus);
        inhalt.querySelectorAll('[data-sprache]').forEach(e => {
          const n = d.je[e.dataset.sprache] || 0;
          $('b', e).textContent = n;
          $('.sbalken i', e).style.width = (100 * n / maxS) + '%';
        });
        inhalt.querySelectorAll('[data-niveau]').forEach(e => {
          const n = d.niveaus[+e.dataset.niveau] || 0;
          $('b', e).textContent = n;
          $('.sbalken i', e).style.width = (100 * n / maxN) + '%';
        });
        const gesamt = Math.max(d.begonnen, z.tn.filter(t => t.online).length);
        $('.fertig-zeile .gross', inhalt).textContent = d.fertig;
        $('.fertig-zeile small', inhalt).textContent = `von ${gesamt} fertig`;
        $('.sprach-fortschritt i', inhalt).style.width = (gesamt ? 100 * d.fertig / gesamt : 0) + '%';
        $('[data-info]', buehne).innerHTML = `<b>${d.begonnen}</b> ${d.begonnen === 1 ? 'Person hat' : 'Personen haben'} die Aufgabe geöffnet`;
      },
    };
  },

  /* ---------- Demo 7: Grafiken ---------- */
  grafik() {
    const inhalt = gerüst({ miniQr: true, links: '<div class="mini-text" data-info></div>' });
    inhalt.innerHTML = `<div class="frage-kopf"><h1>Wo haben alle hingetippt?</h1>
      <p>live: <b class="ok-text">● Treffer</b> · <b class="nein-text">● daneben</b></p></div>
      <div class="grafik-feld">${GRAFIK_BILDER.map(b => `<div class="grafik-karte" data-bild="${b.bild}"><h2>${esc(b.titel)}</h2>
        <div class="grafik-svg"></div><ul class="grafik-aufgaben">${GRAFIK_AUFGABEN.map((a, i) => a.bild === b.bild
          ? `<li data-aufgabe="${i}"><span>${esc(a.kurz)}</span><span class="ok-text">✓ 0</span><span class="nein-text">✗ 0</span></li>` : '').join('')}</ul></div>`).join('')}</div>`;
    const radius = { europa: 12, koerper: 4.5, skelett: 4.5 };
    const svgs = {};
    const gesehen = new Set();
    let letzte = null;
    function bauen(bild, viewBox, inhaltSvg) {
      const karte = $(`[data-bild="${bild}"]`, inhalt);
      $('.grafik-svg', karte).innerHTML = `<svg viewBox="${viewBox}" preserveAspectRatio="xMidYMid meet" class="bild-${bild}">${inhaltSvg}<g class="tipps"></g></svg>`;
      svgs[bild] = $('svg', karte);
    }
    bauen('koerper', KOERPER.viewBox, KOERPER.svg);
    bauen('skelett', SKELETT.viewBox, SKELETT.svg);
    import('./grafik-europa.js').then(({ EUROPA }) => {
      bauen('europa', EUROPA.viewBox, europaSvg(EUROPA));
      if (letzte) zeichnen(letzte);
    });
    function zeichnen(z) {
      letzte = z;
      const d = z.grafik;
      if (!d) return;
      for (const b of GRAFIK_BILDER) {
        const svg = svgs[b.bild];
        if (!svg) continue;
        $('.tipps', svg).innerHTML = d.punkte[b.bild].map(p => {
          const k = `${b.bild}:${p.x}:${p.y}:${p.ok}`;
          const neu = !gesehen.has(k);
          gesehen.add(k);
          return `<circle class="tipp ${p.ok ? 'ok' : 'nein'}${neu ? ' neu' : ''}" cx="${p.x}" cy="${p.y}" r="${radius[b.bild]}"/>`;
        }).join('');
      }
      inhalt.querySelectorAll('[data-aufgabe]').forEach(li => {
        const a = d.aufgaben[+li.dataset.aufgabe];
        li.children[1].textContent = '✓ ' + a.treffer;
        li.children[2].textContent = '✗ ' + a.daneben;
      });
      $('[data-info]', buehne).innerHTML = `<b>${d.fertig}</b> von ${Math.max(d.begonnen, z.tn.filter(t => t.online).length)} fertig`;
    }
    return { aktualisieren: zeichnen };
  },

  /* ---------- Demo 8: Gruppen einteilen ---------- */
  gruppen() {
    const inhalt = gerüst({ links: `<button class="knopf2" data-gruppen-zufall>🎲 Zufällig einteilen</button>
      <button class="knopf2" data-gruppen-wahl>✋ Selbst wählen lassen</button>
      <button class="knopf2" data-gruppen-rest hidden>🎲 Rest zufällig verteilen</button>` });
    inhalt.innerHTML = `<div class="gruppen-kopf"><h1>Gruppen einteilen</h1><p class="gruppen-info"></p></div><div class="gruppen-raster"></div>`;
    const raster = $('.gruppen-raster', inhalt);
    $('[data-gruppen-zufall]', buehne).addEventListener('click', () => senden({ type: 'gruppenZufall' }));
    $('[data-gruppen-wahl]', buehne).addEventListener('click', () => senden({ type: 'gruppenWahl', an: !(z.gruppen && z.gruppen.selbstWahl) }));
    $('[data-gruppen-rest]', buehne).addEventListener('click', () => senden({ type: 'gruppenZufall', nurRest: true }));
    raster.addEventListener('click', e => {
      const b = e.target.closest('[data-id]');
      if (b && !ZUSCHAUER) senden({ type: 'gruppeWechseln', id: b.dataset.id });
    });
    const name = m => `<button class="gk-name${m.online ? '' : ' weg'}" data-id="${m.id}" title="Klicken: in die nächste Gruppe">${esc(m.name)}</button>`;
    return {
      aktualisieren(z) {
        const d = z.gruppen;
        if (!d) return;
        $('.gruppen-info', inhalt).textContent = d.anzahl
          ? `${d.anzahl} ${d.anzahl === 1 ? 'Gruppe' : 'Gruppen'} à ${GRUPPENGROESSE}${d.kapazitaet > GRUPPENGROESSE ? ` (manche ${d.kapazitaet})` : ''}${ZUSCHAUER ? '' : ' · Namen anklicken = in die nächste Gruppe'}${d.selbstWahl ? ' · Auf den Handys wählt jede*r selbst.' : ''}`
          : 'Noch keine Gruppen: „Zufällig einteilen“ oder „Selbst wählen lassen“.';
        const wahl = $('[data-gruppen-wahl]', buehne);
        wahl.textContent = d.selbstWahl ? '✋ Selbst wählen: AN' : '✋ Selbst wählen lassen';
        wahl.classList.toggle('akzent', d.selbstWahl);
        $('[data-gruppen-rest]', buehne).hidden = !(d.anzahl && d.ohne.some(m => m.online));
        const karten = d.liste.map(gr => {
          const info = gruppeInfo(gr.g);
          return `<div class="gruppen-karte" style="--farbe:${info.farbe}"><div class="gk-kopf"><span class="tier">${info.tier}</span><span class="gk-titel">${esc(info.name)}</span><small>${gr.mitglieder.length} 👤</small></div>
            <div class="gk-namen">${gr.mitglieder.map(name).join('') || '<span class="gk-leer">noch leer</span>'}</div></div>`;
        });
        if (d.ohne.length || !d.anzahl) {
          karten.push(`<div class="gruppen-karte ohne"><div class="gk-kopf"><span class="tier">⏳</span><span class="gk-titel">Noch ohne Gruppe</span><small>${d.ohne.length}</small></div>
            <div class="gk-namen">${d.ohne.map(name).join('')}</div></div>`);
        }
        raster.innerHTML = karten.join('');
        raster.style.gridTemplateColumns = `repeat(${Math.min(5, Math.max(2, karten.length <= 4 ? karten.length : Math.ceil(karten.length / 2)))}, 1fr)`;
      },
    };
  },

  /* ---------- Demo 8: Gruppenpuzzle (Rennen) ---------- */
  puzzle() {
    const inhalt = gerüst({ miniQr: true, links: '<div class="mini-text">Fall: Herr Brenner, Unterzuckerung bei der Weinlese<br>Jede Gruppe: Expert*innen A · B · C</div>' });
    inhalt.innerHTML = `<div class="puzzle-kopf"><h1>Gruppenpuzzle: Wer knackt den Fall zuerst?</h1><div class="uhr-klein">0:00</div></div><div class="puzzle-liste"></div>`;
    const liste = $('.puzzle-liste', inhalt);
    const medaille = ['🥇', '🥈', '🥉'];
    const mmss = ms => { const s = Math.max(0, Math.floor(ms / 1000)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };
    let letzte = null;
    function zeichnen() {
      const z = letzte;
      if (!z || !z.puzzle) return;
      const jetzt = Date.now() + zeitVersatz;
      $('.uhr-klein', inhalt).textContent = '⏱ ' + mmss(jetzt - z.puzzle.start);
      liste.style.fontSize = (z.puzzle.gruppen.length > 9 ? 17 : 20) + 'px';
      liste.innerHTML = z.puzzle.gruppen.map(gr => {
        const info = gruppeInfo(gr.g);
        const stufen = ['Lesen'].concat(ABSCHNITTE.map((_, k) => 'Abschnitt ' + (k + 1))).map((t, k) => {
          const erledigt = gr.phase === 'fertig' || (k === 0 ? gr.phase !== 'lesen' : gr.abschnitt > k - 1);
          const aktiv = !erledigt && (k === 0 ? gr.phase === 'lesen' : gr.phase === 'aufgaben' && gr.abschnitt === k - 1);
          return `<i class="${erledigt ? 'erledigt' : aktiv ? 'aktiv' : ''}">${k === 0 ? '📖' : k}</i>`;
        }).join('');
        let status;
        if (gr.platz) status = `${medaille[gr.platz - 1] || '🏁'} Platz ${gr.platz} · ${mmss(gr.fertigNach)}`;
        else if (gr.sperreBis > jetzt) status = `🔒 falsch – ${Math.ceil((gr.sperreBis - jetzt) / 1000)} s gesperrt`;
        else if (gr.phase === 'lesen') status = 'liest …';
        else if (gr.hilfe) status = `${gr.hilfe.stufe === 'loesung' ? '🔑 Lösung' : '💡 Hinweis'} · Abschnitt ${gr.abschnitt + 1}`;
        else status = `Abschnitt ${gr.abschnitt + 1} von ${z.puzzle.abschnitte}`;
        const m = gr.mitglieder.map(x => {
          const symbol = gr.phase === 'lesen' ? (x.gelesen ? '✓' : '📖') : gr.phase === 'fertig' ? '🎉' : (x.abgegeben ? '📨' : '✏️');
          return `<span class="pz-m${x.aktiv ? '' : ' weg'}">${symbol} ${esc(x.name)}<small>${x.experten.join('')}</small></span>`;
        }).join('');
        return `<div class="pz-zeile${gr.platz ? ' fertig' : ''}${gr.sperreBis > jetzt ? ' gesperrt' : ''}" style="--farbe:${info.farbe}">
          <div class="pz-name"><span class="tier">${info.tier}</span>${esc(info.name)}${gr.hilfe ? ` <span title="${gr.hilfe.stufe === 'loesung' ? 'Lösung angezeigt' : 'Hinweis angezeigt'}">${gr.hilfe.stufe === 'loesung' ? '🔑' : '💡'}</span>` : ''}</div><div class="pz-mitglieder">${m}</div>
          <div class="pz-schritte">${stufen}</div><div class="pz-status">${status}</div></div>`;
      }).join('') || '<div class="punkte-leer">Noch keine Gruppen.</div>';
    }
    const uhr = setInterval(zeichnen, 1000);
    return { aktualisieren(z) { letzte = z; zeichnen(); }, abbauen() { clearInterval(uhr); } };
  },

  /* ---------- Demo 8: Siegerehrung der Gruppen ---------- */
  gruppensieg() {
    const inhalt = gerüst({ dunkel: true });
    inhalt.innerHTML = `<div class="sieger-kopf"><h1>GRUPPENPUZZLE – SIEGEREHRUNG</h1></div><div class="podest"></div><div class="konfetti"></div>`;
    konfettiStarten($('.konfetti', inhalt));
    const podest = $('.podest', inhalt);
    const mmss = ms => { const s = Math.max(0, Math.floor(ms / 1000)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };
    let vorher = null;
    return {
      aktualisieren(z) {
        const top = (z.puzzleRangliste || []).slice(0, 3);
        const sig = JSON.stringify(top);
        if (sig === vorher) return;
        vorher = sig;
        const stufe = platz => {
          const e = top[platz - 1];
          const info = e ? gruppeInfo(e.g) : null;
          return `<div class="stufe p${platz}">${platz === 1 ? POKAL : ''}<div class="wer">${e
            ? `<span class="gruppen-tier">${info.tier}</span><b>${esc(info.name)}</b><span>${mmss(e.fertigNach)} min</span><em>${e.mitglieder.map(esc).join(' · ')}</em>`
            : '<b>–</b>'}</div><div class="block">${platz}</div></div>`;
        };
        podest.innerHTML = stufe(2) + stufe(1) + stufe(3);
      },
    };
  },

  /* ---------- Demo 4: Lernkarten ---------- */
  lernkarten() {
    const inhalt = gerüst({ miniQr: true });
    const U = 2 * Math.PI * 200;
    inhalt.innerHTML = `<div class="lern"><h1>Präge dir die Lernkarten auf deinem Smartphone ein.<br><em>In 2 Minuten wird abgefragt!</em></h1>
      <div class="uhr"><svg viewBox="0 0 460 460"><circle cx="230" cy="230" r="200" fill="#fff" stroke="#EAF2F4" stroke-width="34"/>
      <circle class="ring" cx="230" cy="230" r="200" fill="none" stroke="#3F6C72" stroke-width="34" stroke-linecap="round" stroke-dasharray="${U}" stroke-dashoffset="0"/></svg>
      <div class="zeit">2:00</div></div></div>`;
    const uhr = $('.uhr', inhalt), ring = $('.ring', inhalt), zeit = $('.zeit', inhalt);
    function ticken() {
      const vergangen = (Date.now() + zeitVersatz - z.schrittSeit) / 1000;
      const rest = Math.max(0, LERNZEIT_SEKUNDEN - vergangen);
      ring.setAttribute('stroke-dashoffset', (U * (1 - rest / LERNZEIT_SEKUNDEN)).toFixed(1));
      ring.setAttribute('stroke', rest < 20 ? '#D64545' : rest < 60 ? '#E8833A' : '#3F6C72');
      if (rest <= 0) { uhr.classList.add('um'); zeit.textContent = 'Zeit um!'; return; }
      const s = Math.ceil(rest);
      zeit.textContent = Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
    }
    ticken();
    const id = setInterval(ticken, 250);
    return { aktualisieren() {}, abbauen() { clearInterval(id); } };
  },

  /* ---------- Demo 5: KI-Song ---------- */
  video() {
    const inhalt = gerüst({ links: '<button class="knopf2" data-laptop>📁 Video vom Laptop öffnen</button><span class="mini-text" data-video-status></span>' });
    inhalt.innerHTML = `<div class="video-seite"><div class="frage-kopf"><h1>Die 6 Schritte im Pflegeprozess</h1></div>
      <div class="video-feld"><video controls preload="auto" playsinline></video></div></div>`;
    const el = $('video', inhalt);
    el.src = video.quelle;
    $('[data-laptop]', buehne).addEventListener('click', videoVomLaptop);
    // Fehlt die Datei ganz (und ist nichts vom Laptop gewählt), wird das Video aus Google Drive eingebettet
    el.addEventListener('error', () => {
      if (video.status === 'lokal' || video.status === 'bereit' || !el.isConnected) return;
      const f = document.createElement('iframe');
      f.src = VIDEO_DRIVE;
      f.allow = 'autoplay; fullscreen';
      f.allowFullscreen = true;
      el.replaceWith(f);
    });
    videoAnzeigen();
    return {
      aktualisieren() {},
      // Vorladen fertig oder Datei vom Laptop gewählt: auf die schnelle Quelle umschalten, solange noch nicht gespielt wird
      videoBereit() {
        if (el.src === video.quelle || !el.isConnected) return;
        if ((video.status === 'bereit' && el.paused && el.currentTime === 0) || video.status === 'lokal') {
          el.src = video.quelle;
          el.load();
        }
      },
      abbauen() { try { el.pause(); } catch (e) { /* egal */ } },
    };
  },

  /* ---------- Sortieraufgabe ---------- */
  sortieren() {
    const inhalt = gerüst({ miniQr: true });
    inhalt.innerHTML = `<div class="sortier"><div><h1>Löse die Sortieraufgabe zu den 6 Schritten auf dem Smartphone.</h1>
      <div class="achtung">ACHTUNG: Für jede falsche Zuordnung<br>werden 10 Punkte abgezogen!</div></div>
      <div class="fortschritt"><div class="gross"><span class="fertig">0</span> <small>von <span class="von">0</span> fertig</small></div>
      <div class="leiste"><i></i></div><h2>Schon fertig:</h2><div class="chips"></div></div></div>`;
    const chips = $('.chips', inhalt);
    const gezeigt = new Set();
    return {
      aktualisieren(z) {
        const gesamt = Math.max(z.tn.filter(t => t.online).length, z.sortieren.fertig.length);
        $('.fertig', inhalt).textContent = z.sortieren.fertig.length;
        $('.von', inhalt).textContent = gesamt;
        $('.leiste i', inhalt).style.width = (gesamt ? 100 * z.sortieren.fertig.length / gesamt : 0) + '%';
        for (const f of z.sortieren.fertig) {
          if (gezeigt.has(f.id)) continue;
          gezeigt.add(f.id);
          const c = document.createElement('span');
          c.className = 'chip';
          c.innerHTML = `${esc(f.name)}<b>${f.punkte}</b>`;
          chips.appendChild(c);
        }
      },
    };
  },

  /* ---------- Demo 9: Minispiel ---------- */
  spiel() {
    const inhalt = gerüst({ miniQr: true, links: '<div class="mini-text" data-info></div>' });
    inhalt.innerHTML = `<div class="spiel-kopf"><canvas width="16" height="24"></canvas><h1>MINISPIEL: KAROLINE-RUN! – HIGHSCORE</h1></div><div class="bestenliste"></div>`;
    const figur = $('.spiel-kopf canvas', inhalt);
    let bild = 0;
    const animation = setInterval(() => {
      if (!window.PIXEL) return;
      const f = PIXEL.figur('schwester', 'lauf' + (bild % 4 + 1), 1);
      bild++;
      figur.width = f.width; figur.height = f.height;
      figur.getContext('2d').drawImage(f, 0, 0);
    }, 120);
    const liste = $('.bestenliste', inhalt);
    let vorher = '';
    return {
      aktualisieren(z) {
        const s = z.spiel;
        const sig = JSON.stringify(s.slice(0, 11));
        $('[data-info]', buehne).innerHTML = 'Punkte erscheinen hier,<br>sobald eine Runde vorbei ist.';
        if (sig === vorher) return;
        vorher = sig;
        if (!s.length) { liste.innerHTML = '<div class="bl-leer">Noch niemand hat eine Runde beendet …</div>'; return; }
        let rang = 0, last = null;
        liste.innerHTML = s.slice(0, 10).map((e, i) => {
          if (e.punkte !== last) { rang = i + 1; last = e.punkte; }
          return `<div class="bl-zeile${rang <= 3 ? ' p' + rang : ''}"><span class="rang">${rang}.</span><span class="name">${esc(e.name)}</span><span class="pkt">${e.punkte}</span></div>`;
        }).join('') + (s.length > 10 ? `<div class="bl-mehr">+ ${s.length - 10} weitere</div>` : '');
      },
      abbauen() { clearInterval(animation); },
    };
  },

  /* ---------- Siegerehrung ---------- */
  siegerehrung() {
    const inhalt = gerüst({ dunkel: true });
    inhalt.innerHTML = `<div class="sieger-kopf"><h1>KAROLINE-RUN! – SIEGEREHRUNG</h1></div><div class="podest"></div><div class="konfetti"></div>`;
    const podest = $('.podest', inhalt);
    konfettiStarten($('.konfetti', inhalt));
    const pokal = POKAL;
    let vorher = null;
    return {
      aktualisieren(z) {
        const top = z.spiel.slice(0, 3);
        const sig = JSON.stringify(top);
        if (sig === vorher) return;
        vorher = sig;
        const stufe = (platz) => {
          const e = top[platz - 1];
          return `<div class="stufe p${platz}">${platz === 1 ? pokal : ''}<div class="wer"><b>${e ? esc(e.name) : '–'}</b><span>${e ? e.punkte + ' Punkte' : ''}</span></div><div class="block">${platz}</div></div>`;
        };
        podest.innerHTML = stufe(2) + stufe(1) + stufe(3);
      },
    };
  },
};

function konfettiStarten(konfetti) {
  const farben = ['#E9B949', '#E8833A', '#C2416B', '#7FA9AE', '#2E9E5B', '#fff', '#7B5EA7'];
  for (let i = 0; i < 90; i++) {
    const k = document.createElement('i');
    k.style.left = Math.random() * 100 + '%';
    k.style.background = farben[i % farben.length];
    k.style.animationDuration = (3 + Math.random() * 4).toFixed(2) + 's';
    k.style.animationDelay = (1.2 + Math.random() * 3).toFixed(2) + 's';
    k.style.transform = `rotate(${Math.random() * 360}deg)`;
    konfetti.appendChild(k);
  }
}

const POKAL = `<svg class="pokal" viewBox="0 0 100 100"><path d="M28 12h44v18c0 16-10 28-22 28S28 46 28 30z" fill="#F3CF6B" stroke="#B8860B" stroke-width="3"/>
  <path d="M28 18H14c0 14 8 22 18 22M72 18h14c0 14-8 22-18 22" fill="none" stroke="#B8860B" stroke-width="5"/>
  <rect x="44" y="57" width="12" height="16" fill="#D9A62E"/><rect x="30" y="73" width="40" height="12" rx="3" fill="#B8860B"/>
  <path d="M50 22l3.5 7 7.5 1-5.5 5 1.5 7.5L50 39l-7 3.5 1.5-7.5-5.5-5 7.5-1z" fill="#fff" opacity=".9"/></svg>`;

/* =====================================================================
   Punktestand (Demo 3 und später)
   ===================================================================== */
function punkteBildschirm(s) {
  const links = `<button class="knopf2" data-zufall="alle">🎲 Zufällig aufrufen: ALLE</button>
    <button class="knopf2" data-zufall="meldung">🎲 Zufällig aufrufen: NUR MIT MELDUNG</button>
    <button class="knopf2" data-rueckgaengig hidden>↶ Rückgängig</button>
    ${s.final ? '<button class="knopf2 akzent" data-export>📥 FINALEN PUNKTESTAND EXPORTIEREN!</button>' : ''}`;
  const inhalt = gerüst({ links });
  inhalt.innerHTML = `<div class="punkte-kopf"><h1>AKTUELLER PUNKTESTAND</h1>${s.fragerunde ? '<span class="fragerunde-hinweis">Fragerunde: 💡 Fehlende Wünsche · 🛠️ Probleme lösen · ⚠️ Bedenken</span>' : ''}
    <div class="legende"><span><i style="background:var(--rot)"></i>hat eine Frage</span><span><i style="background:var(--gruen)"></i>hat eine Antwort</span><span><i style="background:var(--gold)"></i>ist dran</span></div></div>
    <div class="punkte-raster"></div>`;
  const raster = $('.punkte-raster', inhalt);
  const karten = new Map();          // id → Element
  let reihenfolge = [];
  let letzteVergaben = -1;
  let anzahlVorher = -1;
  let punkteVorher = new Map();
  let vergabeFenster = null;
  let auslosung = null;
  let zuletztGezogen = null;
  let punkteTrotzFrage = null;       // id: trotz offener Frage das Punkte-Fenster zeigen

  buehne.querySelectorAll('[data-zufall]').forEach(b => b.addEventListener('click', () => zufall(b.dataset.zufall)));
  $('[data-rueckgaengig]', buehne).addEventListener('click', () => senden({ type: 'rueckgaengig' }));
  const exp = $('[data-export]', buehne);
  if (exp) exp.addEventListener('click', exportieren);

  // Spalten und Schriftgröße so wählen, dass alle Namen auf eine Folie passen
  function rasterMass(n) {
    const spalten = n <= 6 ? 2 : n <= 12 ? 3 : n <= 32 ? 4 : 5;
    const zeilen = Math.max(1, Math.ceil(n / spalten));
    const luecke = zeilen > 6 ? 10 : 12;
    const hoehe = Math.max(42, Math.min(96, (raster.clientHeight - (zeilen - 1) * luecke) / zeilen));
    raster.style.gap = luecke + 'px';
    raster.style.gridTemplateColumns = `repeat(${spalten}, 1fr)`;
    raster.style.gridAutoRows = hoehe + 'px';
    raster.style.fontSize = Math.round(Math.min(34, hoehe * 0.44, spalten >= 4 ? 29 : 34)) + 'px';
  }

  // FLIP: Karten gleiten an ihren neuen Platz
  function neuSortieren(z) {
    const vorher = new Map();
    for (const [id, el] of karten) vorher.set(id, el.getBoundingClientRect());
    reihenfolge = rangliste(z.tn).map(t => t.id);
    for (const id of reihenfolge) raster.appendChild(karten.get(id));
    const skala = buehne.getBoundingClientRect().width / 1600 || 1;
    for (const [id, el] of karten) {
      const a = vorher.get(id);
      if (!a || !a.width) continue;
      const b = el.getBoundingClientRect();
      const dx = (a.left - b.left) / skala, dy = (a.top - b.top) / skala;
      if (!dx && !dy) continue;
      el.style.transition = 'none';
      el.style.transform = `translate(${dx}px, ${dy}px)`;
      void el.offsetWidth;
      el.style.transition = '';
      el.style.transform = '';
    }
  }

  function aktualisieren(z) {
    // Karten anlegen / entfernen
    const ids = new Set(z.tn.map(t => t.id));
    for (const t of z.tn) {
      if (karten.has(t.id)) continue;
      const k = document.createElement('button');
      k.className = 'tn-karte';
      k.innerHTML = '<span class="rang"></span><span class="name"><span class="n"></span><span class="status"></span></span><span class="pkt"></span>';
      k.addEventListener('click', () => { if (!auslosung && !ZUSCHAUER) senden({ type: 'aufrufen', id: t.id }); });
      karten.set(t.id, k);
      raster.appendChild(k);
    }
    for (const [id, k] of karten) if (!ids.has(id)) { k.remove(); karten.delete(id); }

    const sortiert = rangliste(z.tn);
    const rang = new Map(sortiert.map(t => [t.id, t.rang]));
    for (const t of z.tn) {
      const k = karten.get(t.id);
      const r = rang.get(t.id);
      k.className = 'tn-karte' + (r <= 3 && t.punkte.gesamt > 0 ? ' r' + r : '') + (t.meldung ? ' ' + t.meldung : '')
        + (z.aufgerufen === t.id ? ' dran' : '') + (t.online ? '' : ' offline');
      $('.rang', k).textContent = r;
      $('.n', k).textContent = t.name;
      $('.status', k).textContent = z.aufgerufen === t.id ? '★ ist dran' : t.meldung === 'frage' ? '✋ Frage' : t.meldung === 'antwort' ? '💡 Antwort' : t.online ? '' : 'offline';
      $('.pkt', k).innerHTML = `${t.punkte.gesamt}<small>P.</small>`;
      const alt = punkteVorher.get(t.id);
      if (alt !== undefined && t.punkte.gesamt > alt) {
        const p = document.createElement('span');
        p.className = 'plus';
        p.textContent = '+' + (t.punkte.gesamt - alt);
        k.appendChild(p);
        setTimeout(() => p.remove(), 1700);
      }
      punkteVorher.set(t.id, t.punkte.gesamt);
    }
    if (z.tn.length !== anzahlVorher) rasterMass(z.tn.length);
    if (z.tn.length !== anzahlVorher || z.vergaben !== letzteVergaben) neuSortieren(z);
    anzahlVorher = z.tn.length;
    letzteVergaben = z.vergaben;

    raster.classList.toggle('leer', !z.tn.length);
    if (!z.tn.length) raster.innerHTML = '<div class="punkte-leer">Noch niemand angemeldet.</div>';
    else { const l = $('.punkte-leer', raster); if (l) l.remove(); }

    const rueck = $('[data-rueckgaengig]', buehne);
    rueck.hidden = !z.letzteVergabe;
    if (z.letzteVergabe) rueck.title = `Letzte Vergabe zurücknehmen: ${z.letzteVergabe.name} +${z.letzteVergabe.punkte}`;

    // Vergabe-Fenster passend zum aufgerufenen Namen
    const dran = z.aufgerufen && z.tn.find(t => t.id === z.aufgerufen);
    if (punkteTrotzFrage && !auslosung && (!dran || dran.id !== punkteTrotzFrage)) punkteTrotzFrage = null;
    if (dran && !auslosung && !ZUSCHAUER) vergabeOeffnen(dran);
    else if (!dran && vergabeFenster) vergabeSchliessen();
  }

  // Wer eine Frage gestellt hat, bekommt dafür keine Punkte: Dann gibt es nur „Frage beantwortet“.
  // Ausnahme: zufällig aufgerufen oder „Stattdessen Punkte geben“ gewählt.
  function vergabeOeffnen(t) {
    const art = t.meldung === 'frage' && punkteTrotzFrage !== t.id ? 'frage' : 'punkte';
    if (vergabeFenster && vergabeFenster.dataset.id === t.id && vergabeFenster.dataset.art === art) {
      if (art === 'punkte') $('.wer span', vergabeFenster).textContent = t.meldung === 'frage' ? '✋ hat eine Frage' : t.meldung === 'antwort' ? '💡 hat eine Antwort' : 'ist dran';
      return;
    }
    vergabeSchliessen();
    const f = document.createElement('div');
    f.className = 'vergabe' + (art === 'frage' ? ' frage' : '');
    f.dataset.id = t.id;
    f.dataset.art = art;
    if (art === 'frage') {
      f.innerHTML = `<div class="wer"><b>${esc(t.name)}</b><span>✋ hat eine Frage</span></div>
        <div class="reihe"><button class="pk beantwortet" data-beantwortet>✓ Frage beantwortet</button></div>
        <div class="unten"><button class="link-knopf" data-stattdessen>Stattdessen Punkte für eine Antwort geben</button>
        <button class="knopf2" data-abbrechen>Abbrechen</button></div>`;
      $('[data-beantwortet]', f).addEventListener('click', () => {
        senden({ type: 'frageBeantwortet', id: t.id });
        hinweis(`Frage von ${t.name} beantwortet`);
        vergabeSchliessen();
      });
      $('[data-stattdessen]', f).addEventListener('click', () => { punkteTrotzFrage = t.id; vergabeOeffnen(t); });
      $('[data-abbrechen]', f).addEventListener('click', () => senden({ type: 'aufrufen', id: null }));
      inhalt.appendChild(f);
      vergabeFenster = f;
      return;
    }
    f.innerHTML = `<div class="wer"><b>${esc(t.name)}</b><span></span></div>
      <div class="reihe">${[0, 10, 25, 50, 75, 100].map(p => `<button class="pk" data-p="${p}">${p}</button>`).join('')}
      <input type="number" min="0" max="100" step="1" placeholder="…" aria-label="eigene Punktzahl"><button class="knopf2" data-eigene>Vergeben</button></div>
      <div class="unten"><span style="color:var(--leise);font-size:18px">Punkte für die Antwort (0–100) – sie werden zum Punktestand addiert.</span>
      <button class="knopf2" data-abbrechen>Abbrechen</button></div>`;
    $('.wer span', f).textContent = t.meldung === 'frage' ? '✋ hat eine Frage' : t.meldung === 'antwort' ? '💡 hat eine Antwort' : 'ist dran';
    f.querySelectorAll('[data-p]').forEach(b => b.addEventListener('click', () => vergeben(t.id, +b.dataset.p)));
    const feld = $('input', f);
    const eigene = () => {
      const p = Math.round(Number(feld.value));
      if (feld.value === '' || !(p >= 0 && p <= 100)) { feld.focus(); return; }
      vergeben(t.id, p);
    };
    $('[data-eigene]', f).addEventListener('click', eigene);
    feld.addEventListener('keydown', e => { if (e.key === 'Enter') eigene(); });
    $('[data-abbrechen]', f).addEventListener('click', () => senden({ type: 'aufrufen', id: null }));
    inhalt.appendChild(f);
    vergabeFenster = f;
  }

  function vergabeSchliessen() {
    if (vergabeFenster) vergabeFenster.remove();
    vergabeFenster = null;
  }

  function vergeben(id, p) {
    senden({ type: 'vergeben', id, punkte: p });
    const t = z.tn.find(x => x.id === id);
    if (t) hinweis(`+${p} Punkte für ${t.name}`);
    vergabeSchliessen();
  }

  // Zufällig aufrufen – mit kurzer „Glücksrad“-Animation
  function zufall(art) {
    if (auslosung) return;
    let kandidaten = z.tn.filter(t => t.online && (art === 'alle' || t.meldung === 'antwort'));
    if (!kandidaten.length) {
      hinweis(art === 'alle' ? 'Gerade ist kein Handy verbunden.' : 'Niemand hat sich mit einer Antwort gemeldet.');
      return;
    }
    if (kandidaten.length > 1) kandidaten = kandidaten.filter(t => t.id !== zuletztGezogen);
    const zug = new Uint32Array(1);
    crypto.getRandomValues(zug);
    const sieger = kandidaten[zug[0] % kandidaten.length];
    zuletztGezogen = sieger.id;
    senden({ type: 'aufrufen', id: null });
    vergabeSchliessen();
    let schritte = 0;
    const gesamt = kandidaten.length > 1 ? 16 : 1;
    let vorher = null;
    const naechster = () => {
      if (vorher) vorher.classList.remove('los');
      schritte++;
      if (schritte >= gesamt) {
        auslosung = null;
        punkteTrotzFrage = sieger.id;      // aufgerufen, um zu antworten
        senden({ type: 'aufrufen', id: sieger.id });
        return;
      }
      const t = kandidaten[Math.floor(Math.random() * kandidaten.length)];
      vorher = karten.get(t.id);
      if (vorher) vorher.classList.add('los');
      auslosung = setTimeout(naechster, 70 + schritte * schritte * 1.6);
    };
    auslosung = setTimeout(naechster, 10);
  }

  return {
    aktualisieren,
    abbauen() { clearTimeout(auslosung); auslosung = null; },
  };
}

/* =====================================================================
   Export, Zurücksetzen, Teilnehmende verwalten
   ===================================================================== */
function exportieren() {
  if (!z) return;
  const sortiert = rangliste(z.tn);
  const zwei = n => String(n).padStart(2, '0');
  const uhrzeit = ms => { const d = new Date(ms); return zwei(d.getHours()) + ':' + zwei(d.getMinutes()); };
  const zeilen = [['Platz', 'Name', 'angemeldet um', 'Punkte gesamt', 'davon Abstimmung', 'davon Wortwolke', 'davon Sortieraufgabe',
    'davon Sprachen', 'davon Grafiken', 'davon Gruppenpuzzle', 'davon mündlich', 'mündliche Note',
    'Test: richtig (von 8)', 'Test: Prozent', 'schriftliche Note', 'KAROLINE-RUN! Highscore']];
  for (const t of sortiert) {
    const n = t.noten || {};
    zeilen.push([t.rang, t.name, t.seit ? uhrzeit(t.seit) : '', t.punkte.gesamt, t.punkte.umfrage, t.punkte.wolke, t.punkte.sortieren,
      t.punkte.sprachen, t.punkte.grafik, t.punkte.puzzle, t.punkte.muendlich, n.muendlich ?? '',
      n.test ? n.test.richtig : 'nicht teilgenommen', n.test ? n.test.prozent : '', n.schriftlich ?? '', t.spiel ?? '']);
  }
  const d = new Date();
  const name = `Punktestand_Durchgang-${z.durchgang}_${d.getFullYear()}-${zwei(d.getMonth() + 1)}-${zwei(d.getDate())}_${zwei(d.getHours())}-${zwei(d.getMinutes())}.xlsx`;
  const blob = xlsxErstellen(zeilen, 'Punktestand', [7, 22, 15, 14, 18, 17, 21, 16, 16, 20, 15, 15, 20, 14, 17, 24]);
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 2000);
  senden({ type: 'exportiert' });
  hinweis('Excel-Datei wird heruntergeladen: ' + name);
}

async function zuruecksetzenFragen() {
  if (!z) return;
  let wahl;
  if (!z.exportiert && z.tn.length) {
    wahl = await dialog({
      titel: 'Punktestand noch nicht exportiert',
      text: 'Beim Zurücksetzen werden alle Namen, Passwörter und Punkte gelöscht. Der Punktestand wurde in diesem Durchgang noch nicht als Excel-Datei heruntergeladen.',
      knoepfe: [{ text: 'Abbrechen', wert: null }, { text: 'Erst exportieren', art: 'haupt', wert: 'export' }, { text: 'Trotzdem zurücksetzen', art: 'warn', wert: 'ja' }],
    });
    if (wahl === 'export') { exportieren(); return; }
  } else {
    wahl = await dialog({
      titel: 'Alles zurücksetzen?',
      text: 'Alle Namen, Passwörter und Punkte werden gelöscht, alle Handys abgemeldet. Die Anwendung startet wieder mit der Anmeldung – wie neu.',
      knoepfe: [{ text: 'Abbrechen', wert: null }, { text: 'Zurücksetzen', art: 'warn', wert: 'ja' }],
    });
  }
  if (wahl === 'ja') {
    senden({ type: 'zuruecksetzen' });
    $('#menue').hidden = true;
    hinweis('Alles zurückgesetzt – bereit für den nächsten Durchgang.');
  }
}

async function tnVerwalten(id) {
  const t = z && z.tn.find(x => x.id === id);
  if (!t) return;
  const wahl = await dialog({
    titel: t.name,
    text: `${t.online ? 'Verbunden' : 'Nicht verbunden'} · ${t.punkte.gesamt} Punkte${t.ohnePasswort ? '<br><b>Passwort zurückgesetzt:</b> Beim nächsten Anmelden mit diesem Namen wird ein neues Passwort festgelegt.' : ''}`,
    knoepfe: [
      { text: 'Schließen', wert: null },
      { text: 'Passwort zurücksetzen', art: 'haupt', wert: 'pw' },
      { text: 'Entfernen', art: 'warn', wert: 'weg' },
    ],
  });
  if (wahl === 'pw') {
    senden({ type: 'passwortZuruecksetzen', id });
    hinweis(`${t.name} kann jetzt mit einem neuen Passwort einsteigen.`);
  }
  if (wahl === 'weg') {
    const sicher = await dialog({
      titel: `${t.name} entfernen?`,
      text: 'Name und alle Punkte dieser Person werden gelöscht, das Handy wird abgemeldet.',
      knoepfe: [{ text: 'Abbrechen', wert: false }, { text: 'Entfernen', art: 'warn', wert: true }],
    });
    if (sicher) senden({ type: 'tnEntfernen', id });
  }
}

/* =====================================================================
   Menü der Lehrkraft (⚙ unten links)
   ===================================================================== */
function menueAufbauen() {
  const m = $('#menue');
  if (!z) { m.innerHTML = '<p>Noch nicht verbunden …</p>'; return; }
  const versteckt = z.wolke.begriffe.filter(b => b.versteckt);
  m.innerHTML = `<h3>Springen zu</h3><div class="schritte">${SCHRITT_NAMEN.map((n, i) => `<button data-sprung="${i}" class="${i === z.schritt ? 'aktiv' : ''}">${esc(n)}</button>`).join('')}</div>
    <h3>Steuerung</h3>
    <button class="aktion" data-a="zurueck">← Eine Folie zurück (Taste ←)</button>
    <button class="aktion" data-a="vollbild">⛶ Vollbild an/aus</button>
    <button class="aktion" data-a="export">📥 Punktestand exportieren (Excel)</button>
    <button class="aktion" data-a="handout">🖨 QR-Code fürs Handout drucken</button>
    <button class="aktion" data-a="video">📁 Video vom Laptop öffnen</button>
    <p class="klein" data-video-status>${esc(videoText())}</p>
    <h3>Teilnehmende (${z.tn.length})</h3>
    ${z.tn.length ? z.tn.map(t => `<div class="tn-zeile"><span>${t.online ? '🟢' : '⚪'} ${esc(t.name)} <span class="klein">${t.punkte.gesamt} P.</span></span><button data-tn="${t.id}">verwalten</button></div>`).join('') : '<p class="klein">Noch niemand angemeldet.</p>'}
    ${versteckt.length ? `<h3>Ausgeblendete Begriffe</h3>${versteckt.map(b => `<div class="wort-zeile"><span>${esc(b.text)}</span><button data-zeigen="${esc(b.schluessel)}">wieder zeigen</button></div>`).join('')}` : ''}
    <h3>Zuschauer-Link</h3>
    ${zuschauerLink() ? `<p class="klein">Zeigt diese Ansicht live – nur anschauen, keine Steuerung, keine PIN nötig. Gilt bis zum Zurücksetzen. Gerade verbunden: <b>${z.zuschauer.verbunden || 0}</b></p>
    <input class="link-feld" readonly value="${esc(zuschauerLink())}" aria-label="Zuschauer-Link">
    <button class="aktion" data-a="zuschauer-kopieren">📋 Link kopieren</button>
    <button class="aktion" data-a="zuschauer-erstellen">↻ Neuen Link erstellen (der alte wird ungültig)</button>
    <button class="aktion warn" data-a="zuschauer-loeschen">🗑 Zuschauer-Link löschen</button>`
    : `<p class="klein">Für eine Vorführung aus der Ferne: Wer den Link hat, sieht diese Ansicht live mit – ohne PIN und ohne Steuerung.</p>
    <button class="aktion" data-a="zuschauer-erstellen">👁 Zuschauer-Link erstellen</button>`}
    <h3>Durchgang ${z.durchgang}</h3>
    <button class="aktion warn" data-a="reset">↺ Alles zurücksetzen …</button>
    <button class="aktion" data-a="pin">PIN auf diesem Gerät vergessen</button>
    <p class="klein">Tasten: → oder Bild↓ = weiter, ← oder Bild↑ = zurück, Esc = Menü schließen</p>`;
  m.querySelectorAll('[data-sprung]').forEach(b => b.addEventListener('click', () => senden({ type: 'springen', schritt: +b.dataset.sprung })));
  m.querySelectorAll('[data-tn]').forEach(b => b.addEventListener('click', () => tnVerwalten(b.dataset.tn)));
  m.querySelectorAll('[data-zeigen]').forEach(b => b.addEventListener('click', () => senden({ type: 'verstecken', schluessel: b.dataset.zeigen })));
  m.querySelectorAll('[data-a]').forEach(b => b.addEventListener('click', () => {
    const a = b.dataset.a;
    if (a === 'zurueck') senden({ type: 'zurueck' });
    if (a === 'vollbild') vollbild(!document.fullscreenElement);
    if (a === 'export') exportieren();
    if (a === 'handout') window.open('handout.html', '_blank', 'noopener');
    if (a === 'video') videoVomLaptop();
    if (a === 'zuschauer-erstellen') senden({ type: 'zuschauerErstellen' });
    if (a === 'zuschauer-loeschen') { senden({ type: 'zuschauerLoeschen' }); hinweis('Zuschauer-Link gelöscht.'); }
    if (a === 'zuschauer-kopieren') linkKopieren(zuschauerLink());
    if (a === 'reset') zuruecksetzenFragen();
    if (a === 'pin') { verbindung.pinVergessen(); hinweis('PIN vergessen – beim nächsten Öffnen wird sie wieder abgefragt.'); }
  }));
}

function zuschauerLink() {
  return z && z.zuschauer && z.zuschauer.code ? `${location.origin}/beamer?zuschauen=${encodeURIComponent(z.zuschauer.code)}` : '';
}

function linkKopieren(text) {
  const markieren = () => {
    const f = $('#menue .link-feld');
    if (f) { f.focus(); f.select(); }
    hinweis('Link markiert – mit Strg+C kopieren.');
  };
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(() => hinweis('Zuschauer-Link kopiert – z. B. per Messenger oder E-Mail verschicken.'), markieren);
  } else markieren();
}

$('#menue-knopf').addEventListener('click', () => {
  const m = $('#menue');
  m.hidden = !m.hidden;
  if (!m.hidden) menueAufbauen();
});

/* =====================================================================
   Tastatur (auch Presenter: Bild↓ / Bild↑)
   ===================================================================== */
document.addEventListener('keydown', e => {
  if (ZUSCHAUER) return;
  if (e.target && /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) return;
  if (document.querySelector('.ebene:not([hidden])')) return;
  if (e.key === 'Escape') { $('#menue').hidden = true; return; }
  if (!z) return;
  if (e.key === 'ArrowRight' || e.key === 'PageDown') {
    if (document.querySelector('.vergabe')) return;
    e.preventDefault();
    if (ABLAUF[z.schritt].knopf) weiter();
  } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
    e.preventDefault();
    senden({ type: 'zurueck' });
  }
});

// Zuschauer: eigener Vollbild-Knopf statt Menü
if (ZUSCHAUER) {
  const v = $('#vollbild-knopf');
  v.hidden = false;
  v.addEventListener('click', () => vollbild(!document.fullscreenElement));
}

// Zustand vor dem ersten Kontakt
buehne.innerHTML = '<div style="margin:auto;font-size:30px;color:#5B6F74">Verbinde …</div>';

// Schnittstelle für die automatischen Tests (liest nur aus)
window.__workshop = { get z() { return z; }, get video() { return video; } };
