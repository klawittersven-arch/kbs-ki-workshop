/* Automatischer Gesamttest: spielt eine komplette Workshop-Stunde mit vielen simulierten Handys durch.
 * Startet den Workshop lokal (wrangler dev, frischer Speicher), dann Beamer + Handys in Chromium.
 * Aufruf: cd tests && npm install && node ablauf.test.js   (Anzahl Handys: TN=30, Standard 30)
 * Bildschirmfotos landen in tests/ergebnisse/. */
'use strict';

const { spawn, execFileSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { chromium } = require('playwright');

const WURZEL = path.resolve(__dirname, '..');
const ERGEBNISSE = path.join(__dirname, 'ergebnisse');
const PORT = 8790 + Math.floor(Math.random() * 100);
const B = `http://127.0.0.1:${PORT}`;
const TN = Number(process.env.TN || 30);
const PIN = '2468';
const PFLEGEPROZESS_LAENGE = 6;

fs.mkdirSync(ERGEBNISSE, { recursive: true });
const warte = ms => new Promise(r => setTimeout(r, ms));
let fehler = 0;
function pruefe(bedingung, text) {
  if (bedingung) console.log('  ✓ ' + text);
  else { fehler++; console.log('  ✗ ' + text); }
}

async function warteBis(fn, text, ms = 15000) {
  const ende = Date.now() + ms;
  let letzter;
  while (Date.now() < ende) {
    try { letzter = await fn(); if (letzter) return letzter; } catch (e) { letzter = e.message; }
    await warte(150);
  }
  throw new Error('Zeitüberschreitung: ' + text + (letzter !== undefined ? ' (zuletzt: ' + JSON.stringify(letzter) + ')' : ''));
}

/* ---------- lokaler Server ---------- */
function serverStarten() {
  const speicher = fs.mkdtempSync(path.join(os.tmpdir(), 'kbs-ki-workshop-'));
  const wrangler = path.join(__dirname, 'node_modules', '.bin', 'wrangler');
  const p = spawn(wrangler, ['dev', '--port', String(PORT), '--ip', '127.0.0.1', '--persist-to', speicher, '--show-interactive-dev-session=false'], {
    cwd: WURZEL, env: Object.assign({}, process.env, { NO_PROXY: '127.0.0.1,localhost', no_proxy: '127.0.0.1,localhost' }),
  });
  let log = '';
  return new Promise((ok, nein) => {
    const t = setTimeout(() => nein(new Error('wrangler dev startet nicht:\n' + log)), 90000);
    const lesen = d => {
      log += d;
      if (/Ready on/.test(log)) { clearTimeout(t); ok({ p, speicher }); }
    };
    p.stdout.on('data', lesen);
    p.stderr.on('data', lesen);
    p.on('exit', c => nein(new Error('wrangler beendet (' + c + '):\n' + log)));
  });
}

/* ---------- Hilfen für Beamer und Handys ---------- */
const VORNAMEN = ['Anna', 'Jonas', 'Lea', 'Mehmet', 'Christine', 'Paul', 'Sofia', 'Lukas', 'Emma', 'Ben', 'Mia', 'Elias', 'Hannah', 'Noah', 'Lina',
  'Felix', 'Marie', 'Leon', 'Ida', 'Finn', 'Ella', 'Jakob', 'Clara', 'Tim', 'Lara', 'David', 'Nora', 'Erik', 'Zoe', 'Ali', 'Greta', 'Max', 'Rosa', 'Theo', 'Juna'];
const WORTPOOL = ['Chatbot', 'Zukunft', 'Texte', 'Hilfe', 'Daten', 'Angst', 'ChatGPT', 'Effizienz', 'Datenschutz', 'Kreativität', 'Fehler', 'Neugier', 'Claude', 'Hausaufgaben', 'Arbeit', 'Chance'];

async function zustand(beamer) {
  return beamer.evaluate(() => window.__workshop.z);
}

async function weiter(beamer, erwarteterModus) {
  const vorher = (await zustand(beamer)).schritt;
  await beamer.click('[data-weiter]');
  await warteBis(async () => (await zustand(beamer)).schritt === vorher + 1, 'Schritt ' + (vorher + 1));
  if (erwarteterModus) {
    const z = await zustand(beamer);
    pruefe(z.modus === erwarteterModus, `Beamer zeigt „${erwarteterModus}“ (Schritt ${z.schritt + 1})`);
  }
  await warte(400);
}

async function handyModus(handy, modus) {
  return warteBis(() => handy.page.evaluate(m => window.__handy.a && window.__handy.a.modus === m, modus), handy.name + ' in ' + modus);
}

async function foto(seite, name) {
  await seite.screenshot({ path: path.join(ERGEBNISSE, name + '.jpg'), type: 'jpeg', quality: 80 });
}

async function anmelden(page, vorname, initiale, passwort) {
  await page.waitForSelector('#vorname');
  await page.fill('#vorname', vorname);
  await page.fill('#initiale', initiale);
  await page.fill('#passwort', passwort);
  await page.click('#mitmachen');
}

/* =====================================================================
   Ablauf
   ===================================================================== */
(async () => {
  console.log(`Starte lokalen Workshop auf Port ${PORT} …`);
  const server = await serverStarten();
  const browser = await chromium.launch();
  const seitenFehler = [];
  const beobachten = (page, wer) => {
    page.on('pageerror', e => seitenFehler.push(wer + ': ' + e.message));
    page.on('console', m => { if (m.type() === 'error' && !/404|ERR_|drive\.google/.test(m.text())) seitenFehler.push(wer + ': ' + m.text()); });
  };

  try {
    /* ---------- Beamer + PIN ---------- */
    console.log('\nBeamer und PIN');
    const bctx = await browser.newContext({ viewport: { width: 1920, height: 1080 }, acceptDownloads: true });
    const beamer = await bctx.newPage();
    beobachten(beamer, 'Beamer');
    await beamer.goto(B + '/beamer');
    await beamer.waitForSelector('#pin-feld', { state: 'visible' });
    pruefe(/festlegen/.test(await beamer.textContent('#pin-titel')), 'Beim ersten Öffnen wird eine PIN festgelegt');
    await beamer.fill('#pin-feld', '12');
    await beamer.press('#pin-feld', 'Enter');
    await warteBis(async () => /mindestens 4/.test(await beamer.textContent('#pin-fehler')), 'Hinweis: PIN zu kurz');
    pruefe(true, 'Zu kurze PIN wird abgelehnt');
    await beamer.fill('#pin-feld', PIN);
    await beamer.press('#pin-feld', 'Enter');
    await warteBis(() => beamer.evaluate(() => !!window.__workshop.z), 'Beamer freigeschaltet');
    pruefe(await beamer.isHidden('#pin-ebene'), 'PIN angenommen, Anmeldebildschirm sichtbar');

    // Zweiter Beamer mit falscher PIN
    const fremd = await (await browser.newContext()).newPage();
    await fremd.goto(B + '/beamer');
    await fremd.waitForSelector('#pin-feld', { state: 'visible' });
    pruefe(/eingeben/.test(await fremd.textContent('#pin-titel')), 'Zweites Gerät muss die PIN eingeben');
    await fremd.fill('#pin-feld', '9999');
    await fremd.press('#pin-feld', 'Enter');
    await warteBis(async () => /falsch/.test(await fremd.textContent('#pin-fehler')), 'falsche PIN erkannt');
    pruefe(true, 'Falsche PIN wird abgelehnt');
    await fremd.context().close();

    /* ---------- Anmeldung der Handys ---------- */
    console.log(`\nAnmeldung von ${TN} Handys`);
    const handys = [];
    for (let i = 0; i < TN; i++) {
      const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
      const page = await ctx.newPage();
      const vorname = VORNAMEN[i % VORNAMEN.length] + (i >= VORNAMEN.length ? String(i) : '');
      const initiale = String.fromCharCode(65 + (i * 7) % 26);
      const h = { page, ctx, vorname, initiale, passwort: 'pw' + i, name: `${vorname} ${initiale}.` };
      beobachten(page, h.name);
      handys.push(h);
    }
    // Ein Handy nutzt absichtlich den Reserve-Modus (HTTP-Abfragen statt WebSocket)
    await Promise.all(handys.map((h, i) => h.page.goto(B + (i === 1 ? '/?verbindung=abfrage' : '/'))));
    for (let i = 0; i < TN; i += 10) {
      await Promise.all(handys.slice(i, i + 10).map(h => anmelden(h.page, h.vorname, h.initiale, h.passwort)));
    }
    await foto(handys[0].page, 'h-01-angemeldet');
    await warteBis(async () => (await zustand(beamer)).tn.length === TN, `${TN} Teilnehmende am Beamer`, 30000);
    pruefe(true, `${TN} Teilnehmende angemeldet`);
    pruefe(await beamer.textContent('.login .anzahl') === String(TN), 'Zähler auf dem Anmeldebildschirm stimmt');
    await warteBis(async () => (await zustand(beamer)).tn.every(t => t.online), 'alle online');
    pruefe(true, 'Alle Handys verbunden (auch das im Reserve-Modus)');

    // Gleicher Name, falsches Passwort → Fehler; richtiges Passwort → Wiedereinstieg
    const zweitCtx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    const zweit = await zweitCtx.newPage();
    await zweit.goto(B + '/');
    await anmelden(zweit, handys[0].vorname.toLowerCase(), handys[0].initiale.toLowerCase(), 'falsch');
    await warteBis(async () => /gibt es schon/.test(await zweit.textContent('#anmelde-fehler')), 'Fehlermeldung bei falschem Passwort');
    pruefe(true, 'Gleicher Name mit falschem Passwort wird abgelehnt');
    await zweit.fill('#passwort', handys[0].passwort.toUpperCase());
    await zweit.click('#mitmachen');
    await warteBis(() => zweit.evaluate(() => window.__handy.a && window.__handy.a.name), 'Wiedereinstieg auf zweitem Gerät');
    pruefe((await zustand(beamer)).tn.length === TN, 'Wiedereinstieg mit richtigem Passwort (Groß-/Kleinschreibung egal) – kein neuer Name');
    await zweitCtx.close();
    await foto(beamer, 'b-01-anmeldung');

    /* ---------- Folien ---------- */
    console.log('\nFolien und Demo 1');
    await weiter(beamer, 'folie');
    await warte(2500);
    await foto(beamer, 'b-02-im-anfang-war-das-wort');
    await handyModus(handys[0], 'folie');
    pruefe(/PRÄSENTATIONS-MODUS/.test(await handys[0].page.textContent('#app')), 'Handy zeigt den Präsentations-Modus');
    pruefe(await handys[0].page.isHidden('#ich-punkte'), 'Punkte auf dem Handy noch verborgen (Überraschung in Demo 3)');
    await foto(handys[0].page, 'h-02-praesentation');
    await weiter(beamer, 'folie');
    await warte(3500);
    await foto(beamer, 'b-03-demo1-folie');

    /* ---------- Demo 1: Abstimmung ---------- */
    await weiter(beamer, 'umfrage');
    await Promise.all(handys.map(h => handyModus(h, 'umfrage')));
    // Modell der Auswahl je Handy („Noch gar nicht“ = 4 schließt die anderen aus)
    const auswahl = handys.map(() => new Set());
    const tippen = async (i, o) => {
      const s = auswahl[i];
      if (s.has(o)) s.delete(o);
      else if (o === 4) { s.clear(); s.add(4); }
      else { s.delete(4); s.add(o); }
      await handys[i].page.click(`.option[data-o="${o}"]`);
    };
    await Promise.all(handys.map(async (h, i) => {
      const wahl = i % 7 === 6 ? [4] : [0, 1, 2, 3].filter(o => (i * 3 + o * 5) % 4 !== 0);
      for (const o of wahl) await tippen(i, o);
    }));
    await tippen(0, 1);   // eine Antwort wieder abwählen bzw. dazunehmen
    await tippen(2, 4);   // wechselt zu „Noch gar nicht“
    await tippen(6, 0);   // von „Noch gar nicht“ zu einer Antwort
    const stimmen = [0, 0, 0, 0, 0];
    auswahl.forEach(s => s.forEach(o => stimmen[o]++));
    const stimmenJe = auswahl.map(s => s.size);
    await warteBis(async () => JSON.stringify((await zustand(beamer)).umfrage.stimmen) === JSON.stringify(stimmen), 'Balken = ' + stimmen.join(','));
    pruefe(true, 'Balkendiagramm zählt alle Stimmen richtig, auch Abwählen und „Noch gar nicht“');
    await warte(1000);
    await foto(beamer, 'b-04-demo1-balkendiagramm');
    await foto(handys[0].page, 'h-03-abstimmung');

    /* ---------- Demo 2: Wortwolke ---------- */
    console.log('\nDemo 2: Wortwolke');
    await weiter(beamer, 'folie');
    await weiter(beamer, 'wortwolke');
    const woerterJe = [];
    await Promise.all(handys.map(async (h, i) => {
      await handyModus(h, 'wortwolke');
      const n = 1 + (i % 5);
      const liste = Array.from({ length: n }, (_, k) => WORTPOOL[(i * 3 + k * k + (k ? 0 : i % 3)) % WORTPOOL.length]);
      if (i === 3) liste.push('a');   // ungültig: zu kurz
      const felder = await h.page.$$('.begriff');
      for (let k = 0; k < Math.min(liste.length, 5); k++) await felder[k].fill(k === 1 ? liste[k].toLowerCase() + ' ' : liste[k]);
      const eindeutig = new Set(liste.slice(0, 5).filter(w => w.length >= 2).map(w => w.toLowerCase().trim()));
      woerterJe[i] = [...eindeutig];
      await h.page.click('#begriffe button[type=submit]');
    }));
    await warteBis(async () => (await zustand(beamer)).wolke.abgeschickt === TN, 'alle Begriffe angekommen');
    pruefe(true, 'Alle Begriffe sind angekommen');
    pruefe(/ERFOLGREICH ABGESCHICKT/.test(await handys[0].page.textContent('#app')), 'Handy bestätigt: Begriffe erfolgreich abgeschickt');
    const z2 = await zustand(beamer);
    const maxAnzahl = Math.max(...z2.wolke.begriffe.map(b => b.anzahl));
    await warte(1500);
    const mitte = await beamer.evaluate(() => {
      const feld = document.querySelector('.wolke-feld').getBoundingClientRect();
      const cx = (feld.left + feld.right) / 2, cy = (feld.top + feld.bottom) / 2;
      const w = [...document.querySelectorAll('.wolke-wort')].map(e => {
        const r = e.getBoundingClientRect();
        return { e, d: Math.hypot((r.left + r.right) / 2 - cx, (r.top + r.bottom) / 2 - cy) };
      }).sort((a, b) => a.d - b.d)[0].e;
      return { text: w.textContent, dreh: w.style.transform };
    });
    const mitteBegriff = z2.wolke.begriffe.find(b => b.text === mitte.text);
    pruefe(mitteBegriff && mitteBegriff.anzahl === maxAnzahl && /0deg/.test(mitte.dreh), `Häufigster Begriff „${mitte.text}“ (${maxAnzahl}×) steht waagerecht in der Mitte`);
    const senkrecht = await beamer.evaluate(() => [...document.querySelectorAll('.wolke-wort')].filter(w => /-90deg/.test(w.style.transform)).length);
    pruefe(senkrecht > 0, `Gemischte Wortwolke: ${senkrecht} Wörter senkrecht`);
    const ueberlappt = await beamer.evaluate(() => {
      const r = [...document.querySelectorAll('.wolke-wort')].map(w => w.getBoundingClientRect());
      let n = 0;
      for (let i = 0; i < r.length; i++) for (let j = i + 1; j < r.length; j++) {
        const a = r[i], b = r[j];
        if (a.left < b.right - 2 && a.right > b.left + 2 && a.top < b.bottom - 2 && a.bottom > b.top + 2) n++;
      }
      return n;
    });
    pruefe(ueberlappt === 0, 'Keine Wörter überlappen sich');
    await foto(beamer, 'b-05-demo2-wortwolke');
    // Begriff ausblenden
    const weg = z2.wolke.begriffe.find(b => b.anzahl === 1) || z2.wolke.begriffe[0];
    await beamer.click(`.wolke-wort >> text="${weg.text}"`);
    await beamer.click('.dialog button.warn');
    await warteBis(async () => (await zustand(beamer)).wolke.begriffe.find(b => b.schluessel === weg.schluessel).versteckt, 'Begriff ausgeblendet');
    pruefe(await beamer.$(`.wolke-wort >> text="${weg.text}"`) === null, `Begriff „${weg.text}“ per Klick ausgeblendet`);
    woerterJe.forEach((l, i) => { woerterJe[i] = l.filter(w => w !== weg.schluessel); });

    /* ---------- Demo 3: Punktestand ---------- */
    console.log('\nDemo 3: Punktestand');
    await weiter(beamer, 'folie');
    await weiter(beamer, 'punkte');
    const z3 = await zustand(beamer);
    const falschePunkte = z3.tn.filter(t => {
      const i = handys.findIndex(h => h.name === t.name);
      return t.punkte.gesamt !== stimmenJe[i] + 10 * woerterJe[i].length;
    });
    pruefe(!falschePunkte.length, 'Punkte = 1 je Stimme + 10 je Begriff (ausgeblendeter Begriff abgezogen)' + (falschePunkte.length ? ' – falsch bei ' + falschePunkte.map(t => t.name).join(', ') : ''));
    await handyModus(handys[0], 'punkte');
    pruefe(await handys[0].page.isVisible('#ich-punkte'), 'Handy zeigt jetzt die eigenen Punkte');
    await handys[5].page.click('.melde-knopf.antwort');
    await handys[6].page.click('.melde-knopf.antwort');
    await handys[7].page.click('.melde-knopf.frage');
    await handys[8].page.click('.melde-knopf.frage');
    await handys[8].page.click('.melde-knopf.frage');   // zurücknehmen
    await warteBis(async () => (await zustand(beamer)).tn.filter(t => t.meldung).length === 3, '3 Meldungen');
    pruefe(await beamer.$$eval('.tn-karte.antwort', e => e.length) === 2 && await beamer.$$eval('.tn-karte.frage', e => e.length) === 1, 'Am Beamer: 2 Namen grün (Antwort), 1 rot (Frage), Zurücknehmen klappt');
    await foto(beamer, 'b-06-punktestand-meldungen');
    await foto(handys[5].page, 'h-04-melden');
    await beamer.click('[data-zufall="meldung"]');
    const dran = await warteBis(async () => { const z = await zustand(beamer); return z.aufgerufen && z.tn.find(t => t.id === z.aufgerufen); }, 'Zufallsauswahl', 8000);
    pruefe(dran.meldung === 'antwort', `„Zufällig aufrufen: NUR MIT MELDUNG“ wählt ${dran.name} (hat sich mit Antwort gemeldet)`);
    const dranHandy = handys.find(h => h.name === dran.name);
    await warteBis(async () => /Du bist dran/.test(await dranHandy.page.textContent('#app')), 'Handy: Du bist dran');
    pruefe(true, 'Aufgerufenes Handy zeigt „Du bist dran!“');
    await foto(beamer, 'b-07-punktestand-aufgerufen');
    await foto(dranHandy.page, 'h-05-du-bist-dran');
    const vorPunkte = dran.punkte.gesamt;
    await beamer.click('.vergabe .pk[data-p="50"]');
    await warteBis(async () => (await zustand(beamer)).tn.find(t => t.id === dran.id).punkte.gesamt === vorPunkte + 50, '+50');
    const nach = (await zustand(beamer)).tn.find(t => t.id === dran.id);
    pruefe(nach.meldung === null, '50 Punkte vergeben und addiert, Meldung danach gelöscht');
    await warteBis(async () => /\+50/.test(await dranHandy.page.textContent('#toast')), 'Toast +50');
    pruefe(true, 'Handy zeigt „+50 Punkte!“');
    await foto(dranHandy.page, 'h-06-plus-punkte');
    // Frage: Name anklicken → nur „Frage beantwortet“, keine Punkte
    const fragend = (await zustand(beamer)).tn.find(t => t.meldung === 'frage');
    const fragendHandy = handys.find(h => h.name === fragend.name);
    await beamer.click(`.tn-karte >> text="${fragend.name}"`);
    await beamer.waitForSelector('.vergabe.frage [data-beantwortet]');
    pruefe(/hat eine Frage/.test(await beamer.textContent('.vergabe')) && !(await beamer.$('.vergabe .pk[data-p]')), `Klick auf ${fragend.name} (rot): „hat eine Frage“ mit „Frage beantwortet“, keine Punkt-Knöpfe`);
    await foto(beamer, 'b-07b-frage');
    await beamer.click('.vergabe [data-beantwortet]');
    await warteBis(async () => { const z = await zustand(beamer); const t = z.tn.find(x => x.id === fragend.id); return t.meldung === null && !z.aufgerufen; }, 'Frage beantwortet');
    pruefe((await zustand(beamer)).tn.find(x => x.id === fragend.id).punkte.gesamt === fragend.punkte.gesamt, '„Frage beantwortet“ beendet den roten Status ohne Punkte');
    await warteBis(async () => /Frage wurde beantwortet/.test(await fragendHandy.page.textContent('#toast')), 'Toast Frage beantwortet');
    pruefe(true, 'Handy zeigt „Deine Frage wurde beantwortet“');
    // Klick auf einen Namen + eigene Punktzahl, dann Rückgängig
    const ziel = (await zustand(beamer)).tn[10];
    await beamer.click(`.tn-karte >> text="${ziel.name}"`);
    await beamer.waitForSelector('.vergabe input');
    await beamer.fill('.vergabe input', '37');
    await beamer.press('.vergabe input', 'Enter');
    await warteBis(async () => (await zustand(beamer)).tn.find(t => t.id === ziel.id).punkte.muendlich === 37, '+37');
    pruefe(true, 'Name anklicken und eigene Punktzahl (37) vergeben');
    await beamer.click('[data-rueckgaengig]');
    await warteBis(async () => (await zustand(beamer)).tn.find(t => t.id === ziel.id).punkte.muendlich === 0, 'Rückgängig');
    pruefe(true, '„Rückgängig“ nimmt die letzte Vergabe zurück');
    await beamer.click('[data-zufall="alle"]');
    const dran2 = await warteBis(async () => (await zustand(beamer)).aufgerufen, 'Zufall alle', 8000);
    pruefe(!!dran2, '„Zufällig aufrufen: ALLE“ wählt jemanden aus');
    await beamer.click('.vergabe [data-abbrechen]');
    await warteBis(async () => !(await zustand(beamer)).aufgerufen, 'Abbrechen');

    // Wiedereinstieg: Browser geschlossen und wieder geöffnet → automatisch dabei
    const wieder = handys[3];
    await wieder.page.close();
    await warteBis(async () => !(await zustand(beamer)).tn.find(t => t.name === wieder.name).online, 'offline erkannt');
    pruefe(true, 'Geschlossenes Handy erscheint am Beamer als offline');
    wieder.page = await wieder.ctx.newPage();
    beobachten(wieder.page, wieder.name);
    await wieder.page.goto(B + '/');
    await handyModus(wieder, 'punkte');
    pruefe(!(await wieder.page.$('#vorname')), 'Wieder geöffnet: ohne erneute Eingabe direkt im aktuellen Modus');
    // Ganz neues Gerät: Name + Passwort
    const neu = handys[4];
    await neu.ctx.close();
    neu.ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
    neu.page = await neu.ctx.newPage();
    beobachten(neu.page, neu.name);
    await neu.page.goto(B + '/');
    await anmelden(neu.page, neu.vorname, neu.initiale, neu.passwort);
    await handyModus(neu, 'punkte');
    const punkteNeu = await neu.page.evaluate(() => window.__handy.a.punkte);
    pruefe(punkteNeu === stimmenJe[4] + 10 * woerterJe[4].length, 'Neues Gerät mit Name + Passwort: gleicher Punktestand, gleicher Modus');
    await foto(neu.page, 'h-07-wiedereinstieg');

    /* ---------- Demo 4: Lernkarten ---------- */
    console.log('\nDemo 4: Lernkarten');
    await weiter(beamer, 'folie');
    await weiter(beamer, 'lernkarten');
    await handyModus(handys[0], 'lernkarten');
    await handys[0].page.click('.lernkarte');
    await warte(700);
    await foto(handys[0].page, 'h-08-lernkarte-rueckseite');
    await handys[0].page.click('.bewerten .ja');
    pruefe(/Karte 2 von 15/.test(await handys[0].page.textContent('.lern-kopf')), 'Lernkarte umdrehen und bewerten, weiter zu Karte 2');
    await warte(1500);
    pruefe(/^1:5\d$/.test(await beamer.textContent('.uhr .zeit')), 'Countdown am Beamer läuft: ' + await beamer.textContent('.uhr .zeit'));
    await foto(beamer, 'b-08-demo4-lernkarten');
    await weiter(beamer, 'punkte');
    pruefe(await handys[0].page.isVisible('.melde-knopf'), 'Nach „ABFRAGEN!“: Handys zeigen wieder die Melde-Knöpfe');

    /* ---------- Demo 5: KI-Song + Sortieraufgabe ---------- */
    console.log('\nDemo 5: KI-Song und Sortieraufgabe');
    await weiter(beamer, 'folie');
    await warte(4500);
    await foto(beamer, 'b-09-demo5-folie');
    await weiter(beamer, 'video');
    await warte(1500);
    const vorgeladen = await beamer.evaluate(() => ({ status: window.__workshop.video.status, src: (document.querySelector('.video-feld video') || {}).src || '' }));
    pruefe(vorgeladen.status === 'bereit' && vorgeladen.src.startsWith('blob:'), 'Video wurde beim Start vorgeladen und läuft aus dem Speicher des Laptops');
    const kopf = await beamer.evaluate(() => { const h = document.querySelector('.video-seite h1'); return { text: h.textContent, zeilen: Math.round(h.getBoundingClientRect().height / parseFloat(getComputedStyle(h).lineHeight)) }; });
    pruefe(kopf.text === 'Die 6 Schritte im Pflegeprozess' && kopf.zeilen === 1, 'Überschrift über dem Video einzeilig: ' + kopf.text);
    await foto(beamer, 'b-10-demo5-video');
    await weiter(beamer, 'sortieren');
    const erwartetSort = [];
    await Promise.all(handys.map(async (h, i) => {
      await handyModus(h, 'sortieren');
      const fehlerZiel = i % 4;               // 0–3 Fehler
      const unfertig = i % 9 === 8;            // diese hören nach 3 richtigen Schritten auf
      const karten = await h.page.$$('.schritt-karte');
      let fehlerGemacht = 0, richtig = 0;
      for (const karte of karten) {
        const k = +(await karte.getAttribute('data-i'));
        if (fehlerGemacht < fehlerZiel) {
          // falsche Zahl wählen, die noch nicht vergeben ist
          for (let p = 1; p <= PFLEGEPROZESS_LAENGE; p++) {
            const b = await karte.$(`button[data-p="${p}"]`);
            if (p !== k + 1 && await b.isEnabled()) { await b.click(); fehlerGemacht++; break; }
          }
        }
        if (unfertig && richtig >= 3) break;
        await (await karte.$(`button[data-p="${k + 1}"]`)).click();
        richtig++;
      }
      erwartetSort[i] = Math.max(0, richtig * 10 - fehlerGemacht * 10);
    }));
    await warte(1500);
    const z5 = await zustand(beamer);
    const sortFalsch = z5.tn.filter(t => t.punkte.sortieren !== erwartetSort[handys.findIndex(h => h.name === t.name)]);
    pruefe(!sortFalsch.length, 'Sortierpunkte: 10 je richtigem Schritt − 10 je Fehler, nie unter 0, Unfertige nur anteilig' + (sortFalsch.length ? ' – falsch bei ' + sortFalsch.map(t => t.name).join(', ') : ''));
    const fertigeErwartet = handys.filter((_, i) => i % 9 !== 8).length;
    pruefe(z5.sortieren.fertig.length === fertigeErwartet, `Beamer: ${z5.sortieren.fertig.length} von ${TN} fertig`);
    await foto(beamer, 'b-11-sortieraufgabe');
    await foto(handys[1].page, 'h-09-sortieraufgabe');
    await weiter(beamer, 'punkte');
    await foto(beamer, 'b-12-punktestand-nach-sortieren');

    /* ---------- Demo 6: KAROLINE-RUN! ---------- */
    console.log('\nDemo 6: KAROLINE-RUN!');
    await weiter(beamer, 'folie');
    await warte(3000);
    await foto(beamer, 'b-13-demo6-folie');
    await weiter(beamer, 'spiel');
    const spieler = handys.slice(0, Math.min(TN, 12));
    await Promise.all(spieler.map(async h => {
      await handyModus(h, 'spiel');
      const f = h.page.frameLocator('#spiel-rahmen');
      await f.locator('#knopf-los').click();
    }));
    // ohne Eingabe läuft die Figur ins erste Hindernis → Game over → Punkte an den Beamer
    await warteBis(async () => (await zustand(beamer)).spiel.length >= spieler.length - 1, 'Highscores angekommen', 60000);
    pruefe(true, `Highscores von ${(await zustand(beamer)).spiel.length} Spielenden am Beamer`);
    await foto(spieler[0].page, 'h-10-spiel-ende');
    // Eine Person startet einen neuen Lauf; die Lehrkraft beendet das Spiel mittendrin
    const laeufer = spieler[0];
    const f0 = laeufer.page.frameLocator('#spiel-rahmen');
    await f0.locator('#knopf-nochmal').click();
    await warte(2500);
    await foto(beamer, 'b-14-demo6-highscore');
    await weiter(beamer, 'siegerehrung');
    pruefe(/SIEGEREHRUNG/.test(await laeufer.page.textContent('#app')), 'Handys zeigen „SIEGEREHRUNG“, Spiel ist beendet');
    pruefe(!(await laeufer.page.$('#spiel-rahmen')), 'Spiel auf dem Handy geschlossen');
    await warte(3500);
    await foto(beamer, 'b-15-siegerehrung');
    const z6 = await zustand(beamer);
    const podest = await beamer.$$eval('.stufe .wer b', e => e.map(x => x.textContent));
    pruefe(podest[1] === z6.spiel[0].name, `Platz 1 auf dem Treppchen: ${z6.spiel[0].name} (${z6.spiel[0].punkte} Punkte)`);

    /* ---------- Abschluss: Fragerunde, Export ---------- */
    console.log('\nAbschluss: Fragerunde, Export und Zurücksetzen');
    await weiter(beamer, 'punkte');
    pruefe(!(await beamer.$('[data-export]')), 'Punktestand nach der Siegerehrung (Export erst nach der Fragerunde)');
    await foto(beamer, 'b-16-punktestand-nach-siegerehrung');
    await weiter(beamer, 'folie');
    await foto(beamer, 'b-17-und-der-prompt');
    await weiter(beamer, 'folie');
    await warte(1200);
    pruefe(/FRAGERUNDE/.test(await beamer.textContent('.inhalt')) && /PUNKTESTAND-MODUS/.test(await beamer.textContent('[data-weiter]')), 'Folie Fragerunde mit Knopf PUNKTESTAND-MODUS');
    await foto(beamer, 'b-18-fragerunde');
    await weiter(beamer, 'punkte');
    pruefe(/Fragerunde/.test(await beamer.textContent('.punkte-kopf')), 'Punktestand der Fragerunde');
    const [download] = await Promise.all([beamer.waitForEvent('download'), beamer.click('[data-export]')]);
    const datei = path.join(ERGEBNISSE, 'export.xlsx');
    await download.saveAs(datei);
    pruefe(/^Punktestand_Durchgang-1_\d{4}-\d\d-\d\d_\d\d-\d\d\.xlsx$/.test(download.suggestedFilename()), 'Dateiname: ' + download.suggestedFilename());
    const blatt = execFileSync('python3', ['-I', '-c', 'import sys,zipfile;z=zipfile.ZipFile(sys.argv[1]);assert z.testzip() is None;print(z.read("xl/worksheets/sheet1.xml").decode())', datei]).toString();
    const zEnde = await zustand(beamer);
    const alleDrin = zEnde.tn.every(t => blatt.includes(`<t xml:space="preserve">${t.name}</t>`) && blatt.includes(`<v>${t.punkte.gesamt}</v>`));
    pruefe(alleDrin && (blatt.match(/<row /g) || []).length === TN + 1, `Excel-Datei gültig: ${TN} Namen mit Endpunktestand`);
    await foto(beamer, 'b-19-punktestand-final');
    await weiter(beamer, 'folie');
    await warte(800);
    await foto(beamer, 'b-20-jetzt-seid-ihr-dran');

    // Zurücksetzen
    await beamer.click('[data-zuruecksetzen]');
    await beamer.click('.dialog button.warn');
    await warteBis(async () => { const z = await zustand(beamer); return z.durchgang === 2 && z.schritt === 0 && z.tn.length === 0; }, 'zurückgesetzt');
    pruefe(true, 'Zurückgesetzt: Durchgang 2, Anmeldung, keine Namen');
    await warteBis(async () => !!(await handys[0].page.$('#vorname')), 'Handy abgemeldet');
    pruefe(true, 'Handys wurden abgemeldet und zeigen wieder die Anmeldung');
    await handys[5].page.reload();
    await handys[5].page.waitForSelector('#vorname');
    pruefe(true, 'Alte Anmeldung gilt nach dem Zurücksetzen nicht mehr');
    await anmelden(handys[5].page, handys[5].vorname, handys[5].initiale, 'neu123');
    await warteBis(async () => (await zustand(beamer)).tn.length === 1, 'Neuanmeldung');
    pruefe((await zustand(beamer)).tn[0].punkte.gesamt === 0, 'Neuanmeldung im neuen Durchgang startet bei 0 Punkten');
    await foto(beamer, 'b-21-nach-zuruecksetzen');
  } catch (e) {
    fehler++;
    console.log('  ✗ Abbruch: ' + e.message);
  } finally {
    pruefe(!seitenFehler.length, 'Keine JavaScript-Fehler auf den Seiten' + (seitenFehler.length ? ':\n    ' + [...new Set(seitenFehler)].slice(0, 10).join('\n    ') : ''));
    await browser.close();
    server.p.kill();
    fs.rmSync(server.speicher, { recursive: true, force: true });
    console.log(fehler ? `\n${fehler} Prüfung(en) fehlgeschlagen.` : '\nAlle Prüfungen bestanden.');
    process.exit(fehler ? 1 : 0);
  }
})();
