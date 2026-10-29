/* Automatischer Gesamttest: spielt eine komplette Workshop-Stunde mit vielen simulierten Handys durch.
 * Startet den Workshop lokal (wrangler dev, frischer Speicher), dann Beamer + Handys in Chromium.
 * Aufruf: cd tests && npm install && node ablauf.test.js   (Anzahl Handys: TN=30, Standard 30)
 * Bildschirmfotos landen in tests/ergebnisse/. */
'use strict';

const { spawn, execFileSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { pathToFileURL } = require('url');
const { chromium } = require('playwright');

const WURZEL = path.resolve(__dirname, '..');
const ERGEBNISSE = path.join(__dirname, 'ergebnisse');
const PORT = 8790 + Math.floor(Math.random() * 100);
const B = `http://127.0.0.1:${PORT}`;
const TN = Math.max(12, Number(process.env.TN || 30));   // mindestens 12 (einzelne Prüfungen nutzen Handy 5–10)
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

async function foto(seite, name, ganzeSeite = false) {
  await seite.screenshot({ path: path.join(ERGEBNISSE, name + '.jpg'), type: 'jpeg', quality: 80, fullPage: ganzeSeite });
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

    // Zuschauer-Link: im Menü erstellen, in einem anderen Browser öffnen
    console.log('\nZuschauer-Link');
    await beamer.click('#menue-knopf');
    await beamer.click('#menue [data-a="zuschauer-erstellen"]');
    await beamer.waitForSelector('#menue .link-feld');
    const zuschauerLink = await beamer.inputValue('#menue .link-feld');
    pruefe(/\/beamer\?zuschauen=[a-z0-9]{16}$/.test(zuschauerLink), 'Zuschauer-Link erstellt: ' + zuschauerLink.replace(/zuschauen=.*/, 'zuschauen=…'));
    await beamer.keyboard.press('Escape');
    const zuschauerCtx = await browser.newContext({ viewport: { width: 1280, height: 720 } });
    const zuschauer = await zuschauerCtx.newPage();
    beobachten(zuschauer, 'Zuschauer');
    await zuschauer.goto(zuschauerLink);
    await zuschauer.waitForSelector('.login .qr-gross');
    pruefe(await zuschauer.isHidden('#pin-ebene') && !(await zuschauer.isVisible('[data-weiter]')) && await zuschauer.isHidden('#menue-knopf'),
      'Zuschauer sieht den Anmeldebildschirm ohne PIN, ohne Weiter-Knopf und ohne Menü');
    pruefe(await zuschauer.isVisible('.zuschauer-marke') && await zuschauer.isVisible('#vollbild-knopf'), 'Zuschauer-Ansicht ist gekennzeichnet und hat einen Vollbild-Knopf');
    await warteBis(async () => (await zustand(beamer)).zuschauer.verbunden === 1, 'Zuschauer gezählt');
    pruefe(true, 'Menü der Lehrkraft zählt 1 verbundenen Zuschauer');
    const falsch = await (await browser.newContext()).newPage();
    await falsch.goto(B + '/beamer?zuschauen=falsch123');
    await warteBis(async () => /nicht \(mehr\) gültig/.test(await falsch.textContent('#buehne')), 'ungültiger Link');
    pruefe(true, 'Falscher Zuschauer-Link zeigt „nicht (mehr) gültig“');
    await falsch.context().close();

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
    console.log('\nFolie „Wünsch dir was!“, Folien und Demo 1');
    await weiter(beamer, 'folie');
    await warte(1200);
    pruefe(/Wunsch frei/.test(await beamer.textContent('.folie-wunsch h1')) && (await beamer.$$('.wunsch-karte')).length === 11 && !(await beamer.$('.wunsch-karte.offen')),
      'Folie „Wünsch dir was!“: Impulsfrage, 11 Karten verdeckt');
    await foto(beamer, 'b-01a-wuensch-dir-was');
    await beamer.click('.wunsch-karte[data-karte="7"]');   // passt zu einer Antwort aus dem Kollegium
    await beamer.click('[data-weiter]');
    await beamer.keyboard.press('ArrowRight');
    await warteBis(async () => JSON.stringify((await zustand(beamer)).aufgedeckt) === '[7,0,1]', 'drei Karten aufgedeckt');
    pruefe((await zustand(beamer)).schritt === 1 && /AUFDECKEN \(3\/11\)/.test(await beamer.textContent('[data-weiter]')),
      'Klick auf eine Karte deckt genau diese auf; Weiter-Knopf und Pfeiltaste decken die nächste auf, ohne weiterzuschalten');
    for (let i = 0; i < 8; i++) await beamer.keyboard.press('ArrowRight');
    await warteBis(async () => (await zustand(beamer)).aufgedeckt.length === 11, 'alle Karten aufgedeckt');
    await warte(900);
    pruefe((await zustand(beamer)).schritt === 1 && await beamer.isVisible('.folie-wunsch .schluss') && (await beamer.textContent('[data-weiter]')).trim() === 'NÄCHSTE FOLIE',
      'Alle 11 Karten aufgedeckt, Schlusssatz sichtbar, Knopf wieder „NÄCHSTE FOLIE“');
    await warteBis(async () => (await zuschauer.$$('.wunsch-karte.offen')).length === 11, 'Zuschauer sieht die aufgedeckten Karten');
    pruefe(true, 'Zuschauer sieht die aufgedeckten Karten mit');
    await foto(beamer, 'b-01b-wuensch-dir-was-aufgedeckt');
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
    await warteBis(async () => (await zuschauer.$$('.wolke-wort')).length === (await beamer.$$('.wolke-wort')).length, 'Zuschauer-Wolke');
    pruefe(true, 'Zuschauer sieht dieselbe Wortwolke live mit');
    await foto(zuschauer, 'z-01-zuschauer-wortwolke');
    await zuschauer.click('.wolke-wort', { force: true });
    await warte(500);
    const zDialog = !!(await zuschauer.$('.ebene:not(#pin-ebene)'));
    const zVersteckt = (await zustand(beamer)).wolke.begriffe.filter(b => b.versteckt).map(b => b.text);
    pruefe(!zDialog && !zVersteckt.length, 'Zuschauer kann keine Begriffe ausblenden' + (zDialog || zVersteckt.length ? ' (Dialog: ' + zDialog + ', ausgeblendet: ' + zVersteckt.join(',') + ')' : ''));
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
    // Die Klicks der vier Handys kommen in beliebiger Reihenfolge an – auf genau den Endstand warten
    const meldungVon = (z, i) => (z.tn.find(t => t.name === handys[i].name) || {}).meldung;
    await warteBis(async () => {
      const z = await zustand(beamer);
      return meldungVon(z, 5) === 'antwort' && meldungVon(z, 6) === 'antwort' && meldungVon(z, 7) === 'frage' && !meldungVon(z, 8) && z.tn.filter(t => t.meldung).length === 3;
    }, '3 Meldungen');
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

    /* ---------- Demo 6: Sprachen ---------- */
    console.log('\nDemo 6: Sprachen');
    await weiter(beamer, 'folie');
    await warte(6500);
    await foto(beamer, 'b-13-demo6-folie');
    await weiter(beamer, 'sprachen');
    const SPRACH_CODES = ['de', 'tr', 'ru', 'uk', 'fr', 'es'];
    const SPRACH_LOESUNG = [1, 2, 0];
    const sprachErwartet = [];
    const jeSprache = Object.fromEntries(SPRACH_CODES.map(c => [c, 0]));
    const jeNiveau = [0, 0, 0];
    let sprachFertig = 0;
    await Promise.all(handys.map(async (h, i) => {
      await handyModus(h, 'sprachen');
      await h.page.waitForSelector('.sprach-frage');
      const code = SPRACH_CODES[i % 6], niveau = (i + Math.floor(i / 6)) % 3;
      if (code !== 'de') await h.page.click(`.sprach-wahl [data-sprache="${code}"]`);
      await h.page.click(`.niveau-wahl [data-niveau="${niveau}"]`);
      jeSprache[code]++;
      jeNiveau[niveau]++;
      const fragen = i % 10 === 9 ? 1 : 3;     // manche hören nach der ersten Frage auf
      let punkte = 0;
      for (let q = 0; q < fragen; q++) {
        const karte = h.page.locator('.sprach-frage').nth(q);
        if ((i + q) % 4 === 1) await karte.locator(`.wahl[data-o="${(SPRACH_LOESUNG[q] + 1) % 3}"]`).click();
        else punkte += 10;
        await karte.locator(`.wahl[data-o="${SPRACH_LOESUNG[q]}"]`).click();
      }
      if (fragen === 3) sprachFertig++;
      sprachErwartet[i] = punkte;
    }));
    await warteBis(async () => {
      const s = (await zustand(beamer)).sprachen;
      return JSON.stringify(s.je) === JSON.stringify(jeSprache) && JSON.stringify(s.niveaus) === JSON.stringify(jeNiveau) && s.fertig === sprachFertig;
    }, 'Sprachen am Beamer');
    pruefe(true, `Beamer zählt Sprachen (${SPRACH_CODES.map(c => c + ':' + jeSprache[c]).join(' ')}), Niveaus und ${sprachFertig} Fertige`);
    const z6s = await zustand(beamer);
    const sprachFalsch = z6s.tn.filter(t => t.punkte.sprachen !== sprachErwartet[handys.findIndex(h => h.name === t.name)]);
    pruefe(!sprachFalsch.length, '10 Punkte je Frage, die beim ersten Versuch stimmt' + (sprachFalsch.length ? ' – falsch bei ' + sprachFalsch.map(t => t.name).join(', ') : ''));
    const uk = handys[3];
    const ukText = await uk.page.textContent('.sprach-text');
    pruefe(/[іїєґ]/.test(ukText) && await uk.page.getAttribute('.sprach-text', 'lang') === 'uk', 'Ukrainische Fassung mit lang="uk"');
    await handys[0].page.click('[data-vorlesen]');
    await warte(300);
    pruefe(true, 'Vorlesen-Knopf lässt sich antippen');
    await warte(800);
    await foto(beamer, 'b-14-demo6-sprachen');
    await foto(uk.page, 'h-11-sprachen-ukrainisch', true);
    await foto(handys[1].page, 'h-12-sprachen-tuerkisch', true);

    /* ---------- Demo 7: Grafiken ---------- */
    console.log('\nDemo 7: Grafiken');
    await weiter(beamer, 'folie');
    await warte(6500);
    await foto(beamer, 'b-15-demo7-folie');
    await weiter(beamer, 'grafik');
    const ZIELE = ['UA', 'TR', 'ES', 'leber', 'magen', 'niere', 'femur', 'clavicula', 'wirbelsaeule'];
    const DANEBEN = ['DE', 'GR', 'FR', 'herz', 'lunge', 'darm', 'becken', 'costa', 'schaedel'];
    // Tippt auf einen Punkt, an dem das gewünschte Teil wirklich oben liegt
    async function antippen(page, teil) {
      await page.waitForSelector(`.grafik-bild [data-teil="${teil}"]`);
      await page.locator('.grafik-bild svg').scrollIntoViewIfNeeded();
      const p = await page.evaluate(t => {
        const ziele = [...document.querySelectorAll(`.grafik-bild [data-teil="${t}"]`)];
        for (const el of ziele) {
          const r = el.getBoundingClientRect();
          const cx = (r.left + r.right) / 2, cy = (r.top + r.bottom) / 2;
          for (let s = 0; s <= 1; s += 0.1) for (let w = 0; w < 6.3; w += 0.5) {
            const x = cx + Math.cos(w) * s * r.width / 2, y = cy + Math.sin(w) * s * r.height / 2;
            const e = document.elementFromPoint(x, y);
            if (e && e.closest('[data-teil]') && e.closest('[data-teil]').dataset.teil === t) return { x, y };
            if (s === 0) break;
          }
        }
        return null;
      }, teil);
      if (!p) throw new Error('Kein Tipp-Punkt für ' + teil);
      await page.touchscreen.tap(p.x, p.y);
    }
    const grafikErwartet = [];
    let grafikTipps = 0, grafikFertig = 0, grafikTexte = null;
    await Promise.all(handys.map(async (h, i) => {
      await handyModus(h, 'grafik');
      const bis = i % 8 === 7 ? 4 : 9;       // manche schaffen nur 4 Aufgaben
      let punkte = 0;
      for (let k = 0; k < bis; k++) {
        await warteBis(async () => (await h.page.textContent('.nr')) === `Aufgabe ${k + 1} von 9`, h.name + ' Aufgabe ' + (k + 1));
        const art = (i + k) % 5;            // 0, 1, 2: Treffer; 3: einmal daneben; 4: zweimal daneben
        if (art >= 3) { await antippen(h.page, DANEBEN[k]); grafikTipps++; }
        if (i === 0 && k === 3) grafikTexte = [await h.page.textContent('.grafik-aufgabe'), await h.page.textContent('.grafik-rueck')];
        if (art === 4) {
          await warte(200);
          await antippen(h.page, DANEBEN[k]);
          grafikTipps++;
          await h.page.waitForSelector('.grafik-rueck [data-weiter]');
          if (i === 4 && k === 0) await foto(h.page, 'h-13-grafik-daneben');
          await h.page.click('.grafik-rueck [data-weiter]');
          continue;
        }
        await warte(200);
        await antippen(h.page, ZIELE[k]);
        grafikTipps++;
        punkte += art === 3 ? 5 : 10;
        if (i === 0 && k === 7) { await warte(300); await foto(h.page, 'h-14-grafik-skelett'); }
      }
      if (bis === 9) { grafikFertig++; await h.page.waitForSelector('.grafik .warten'); }
      grafikErwartet[i] = punkte;
    }));
    await warteBis(async () => (await zustand(beamer)).grafik.fertig === grafikFertig, 'Grafik fertig');
    const z7 = await zustand(beamer);
    const tippsBeamer = Object.values(z7.grafik.punkte).reduce((s, l) => s + l.length, 0);
    pruefe(tippsBeamer === grafikTipps, `Beamer zeigt alle ${grafikTipps} Tipps (grün/rot)`);
    pruefe(grafikTexte && grafikTexte[0] === 'Tippe auf: Hepar' && /Daneben – das ist Cor\./.test(grafikTexte[1]) && !/Leber|Herz/.test(grafikTexte.join(' ')),
      'Organe und Knochen auf dem Handy nur lateinisch: ' + (grafikTexte ? grafikTexte.map(t => '„' + t.trim() + '“').join(', ') : '–'));
    const grafikFalsch = z7.tn.filter(t => t.punkte.grafik !== grafikErwartet[handys.findIndex(h => h.name === t.name)]);
    pruefe(!grafikFalsch.length, 'Grafik-Punkte: 10 beim ersten, 5 beim zweiten Versuch' + (grafikFalsch.length ? ' – falsch bei ' + grafikFalsch.map(t => t.name).join(', ') : ''));
    const europaPunkte = await beamer.$$eval('.grafik-karte[data-bild="europa"] .tipp', e => e.length);
    pruefe(europaPunkte === z7.grafik.punkte.europa.length && europaPunkte > 0, `Europakarte am Beamer mit ${europaPunkte} Punkten`);
    await foto(beamer, 'b-16-demo7-grafik');

    /* ---------- Demo 8: Gruppen und Gruppenpuzzle ---------- */
    console.log('\nDemo 8: Gruppen und Gruppenpuzzle');
    await weiter(beamer, 'folie');
    await warte(6500);
    await foto(beamer, 'b-17-demo8-folie');
    await weiter(beamer, 'gruppen');
    await handyModus(handys[0], 'gruppen');
    await beamer.click('[data-gruppen-wahl]');
    await warteBis(() => handys[0].page.$('.gruppen-wahl button'), 'Gruppenwahl auf dem Handy');
    for (const i of [0, 1, 2]) {
      await handys[i].page.click('.gruppen-wahl [data-g="0"]');
      await warteBis(() => handys[i].page.evaluate(() => window.__handy.a.gruppe.g === 0), handys[i].name + ' in Gruppe 0');
    }
    await warteBis(() => handys[3].page.evaluate(() => window.__handy.a.gruppe.belegung[0] === 3), 'Gruppe 0 voll');
    await warte(300);
    pruefe(await handys[3].page.isDisabled('.gruppen-wahl [data-g="0"]'), 'Selbst wählen: volle Gruppe (3) ist gesperrt');
    await foto(handys[3].page, 'h-15-gruppenwahl');
    await beamer.click('[data-gruppen-wahl]');
    await beamer.click('[data-gruppen-rest]');
    await warteBis(async () => (await zustand(beamer)).gruppen.ohne.length === 0, 'alle eingeteilt');
    let zg = await zustand(beamer);
    const groessen = zg.gruppen.liste.map(g => g.mitglieder.length);
    pruefe(zg.gruppen.liste[0].mitglieder.length === 3 && [0, 1, 2].every(i => zg.gruppen.liste[0].mitglieder.some(m => m.name === handys[i].name)),
      'Rest zufällig verteilt, die selbst gewählte Gruppe bleibt');
    pruefe(groessen.every(n => n >= 3 && n <= 4), `Gruppengrößen: ${groessen.join(', ')}`);
    // Lehrkraft verschiebt eine Person per Klick in die nächste Gruppe
    const verschoben = zg.gruppen.liste[1].mitglieder[0];
    await beamer.click(`.gk-name[data-id="${verschoben.id}"]`);
    await warteBis(async () => (await zustand(beamer)).gruppen.liste[2].mitglieder.some(m => m.id === verschoben.id), 'verschoben');
    pruefe(true, `${verschoben.name} per Klick von Gruppe 2 in Gruppe 3 verschoben`);
    zg = await zustand(beamer);
    const meinHandy = handys.find(h => h.name === zg.gruppen.liste[1].mitglieder[0].name);
    await warteBis(() => meinHandy.page.$('.gruppen-gross'), 'Gruppenbildschirm');
    await warte(500);
    await foto(meinHandy.page, 'h-16-gruppe');
    await foto(beamer, 'b-18-demo8-gruppen');

    await weiter(beamer, 'puzzle');
    zg = await zustand(beamer);
    const gruppeVon = name => zg.puzzle.gruppen.find(g => g.mitglieder.some(m => m.name === name));
    const expertenOk = zg.puzzle.gruppen.every(g => {
      const alle = g.mitglieder.flatMap(m => m.experten);
      return ['A', 'B', 'C'].every(x => alle.includes(x));
    });
    pruefe(expertenOk, 'Jede Gruppe hat die Texte A, B und C (' + zg.puzzle.gruppen.map(g => g.mitglieder.map(m => m.experten.join('')).join('/')).join(' · ') + ')');
    // Eine Person einer Dreiergruppe fällt aus – ihr Text wird nach 30 s für die Gruppe freigegeben
    const ausfallGruppe = zg.puzzle.gruppen.find(g => g.mitglieder.length === 3 && g.mitglieder.every(m => handys.findIndex(h => h.name === m.name) >= 3));
    const ausfall = handys.find(h => h !== handys[5] && ausfallGruppe.mitglieder.some(m => m.name === h.name));   // Handy 5 wird gleich fotografiert
    await ausfall.page.close();
    const RICHTIG = [[1, 2], [0, '40'], [2, 0]];
    const fotoGemacht = {};
    // falschImAbschnitt0: gibt in Abschnitt 1 so lange Falsches ab, bis die Lösung erscheint
    async function puzzleSpielen(h, falschImAbschnitt0) {
      const ende = Date.now() + 240000;
      while (Date.now() < ende) {
        const p = await h.page.evaluate(() => { const a = window.__handy.a; return a && a.puzzle ? a.puzzle : null; });
        if (!p) { await warte(300); continue; }
        if (p.phase === 'fertig') { await h.page.waitForSelector('.pz .warten'); return; }
        if (p.phase === 'lesen') {
          const knopf = await h.page.$('[data-gelesen]:not([disabled])');
          if (knopf) await knopf.click().catch(() => {});
          await warte(300);
          continue;
        }
        if (p.freigegeben.length && !fotoGemacht.frei) {
          fotoGemacht.frei = true;
          await h.page.click('.pz-tabs [data-tab="frei0"]');
          await warte(300);
          await foto(h.page, 'h-19-puzzle-freigegeben');
          await h.page.click('.pz-tabs [data-tab="aufgaben"]');
        }
        if (p.abgabe || !(await h.page.$('[data-abgeben]'))) { await warte(300); continue; }
        const loesung = p.hilfe && p.hilfe.stufe === 'loesung';
        const falsch = falschImAbschnitt0 && p.abschnitt === 0 && !loesung;
        const antworten = falsch ? [0, 2] : RICHTIG[p.abschnitt];
        if (loesung) await warte(2500);   // Lösung lesen
        // Wer falsch lag, gibt bei der Lösung ohne eigene Eingabe ab – die Lösung muss eingetragen sein
        if (!(loesung && falschImAbschnitt0)) {
          for (let k = 0; k < 2; k++) {
            const karte = h.page.locator('.pz-frage').nth(k);
            if (typeof antworten[k] === 'number') await karte.locator(`.wahl[data-o="${antworten[k]}"]`).click();
            else await karte.locator('input').fill(h === handys[2] ? '40 g' : antworten[k]);
          }
        }
        try {
          await h.page.waitForSelector('[data-abgeben]:not([disabled])', { timeout: 20000 });
          await h.page.click('[data-abgeben]');
        } catch (e) { continue; }
        await warte(400);
      }
      throw new Error('Gruppenpuzzle nicht fertig: ' + h.name);
    }
    await handyModus(handys[5], 'puzzle');
    await handys[5].page.waitForSelector('[data-gelesen]');
    await foto(handys[5].page, 'h-17-puzzle-lesen');
    const spielen = Promise.all(handys.filter(h => h !== ausfall).map(h => puzzleSpielen(h, h === handys[0])));
    spielen.catch(() => {});   // Fehler werden unten beim Warten gemeldet
    // Gruppe 1 (Anna, Jonas, Lea) gibt in Abschnitt 1 eine falsche Antwort ab → 15 s gesperrt
    await warteBis(async () => { const z = await zustand(beamer); return z.puzzle.gruppen[0].sperreBis > z.serverZeit; }, 'Sperre nach falscher Abgabe', 40000);
    pruefe(true, 'Falsche Antwort in der Gruppe → Gruppe 15 s gesperrt');
    for (const i of [0, 1, 2]) await warteBis(async () => /noch falsch/.test(await handys[i].page.textContent('.pz-meldung')), handys[i].name + ' sieht die Sperre', 8000);
    pruefe(true, 'Alle Handys der Gruppe sehen die Sperre, ohne dass verraten wird, wer falsch lag');
    await foto(handys[1].page, 'h-18-puzzle-gesperrt');
    await foto(beamer, 'b-19-demo8-puzzle');
    // Gruppe 1 liegt immer wieder falsch: nach dem 4. Fehlversuch Hinweis, nach dem 5. die Lösung
    const hilfeVon = async () => (await zustand(beamer)).puzzle.gruppen[0].hilfe;
    await warteBis(async () => { const h = await hilfeVon(); return h && h.stufe === 'hinweis'; }, 'Hinweis nach 4 Fehlversuchen', 120000);
    await warteBis(async () => /stimmt noch nicht bei allen/.test(await handys[1].page.textContent('.pz-koerper')), 'Hinweis am Handy', 8000);
    const hinweisText = await handys[1].page.textContent('.pz-koerper');
    pruefe(/✓ stimmt bei allen/.test(hinweisText) && /Vergleicht den gemessenen Wert/.test(hinweisText),
      'Nach 4 Fehlversuchen: Hinweis – Frage 1 ✗ mit Tipp, Frage 2 ✓ (ohne zu verraten, wer falsch lag)');
    await foto(handys[1].page, 'h-18b-puzzle-hinweis', true);
    await foto(beamer, 'b-19b-demo8-puzzle-hinweis');
    await warteBis(async () => /Lösung<\/b> nach 5 Versuchen/.test(await handys[1].page.innerHTML('.pz-koerper')), 'Lösung am Handy', 40000);
    pruefe(/55 mg\/dl liegt unter 70/.test(await handys[1].page.textContent('.pz-koerper')), 'Nach 5 Fehlversuchen: Lösung mit Erklärung');
    await foto(handys[1].page, 'h-18c-puzzle-loesung', true);
    await warteBis(async () => (await zustand(beamer)).puzzle.gruppen[0].abschnitt > 0, 'Gruppe 1 weiter', 20000);
    pruefe(true, 'Mit der eingetragenen Lösung kommt die Gruppe weiter');
    await spielen;
    zg = await zustand(beamer);
    const plaetze = zg.puzzle.gruppen.map(g => g.platz).sort((a, b) => a - b);
    pruefe(plaetze.every((p, k) => p === k + 1), `Alle ${plaetze.length} Gruppen fertig, Plätze 1–${plaetze.length}`);
    pruefe(fotoGemacht.frei, 'Text der ausgefallenen Person wurde für ihre Gruppe freigegeben');
    const PUZZLE_PUNKTE = [50, 40, 30];
    const puzzleFalsch = zg.tn.filter(t => {
      const g = gruppeVon(t.name);
      return t.punkte.puzzle !== (PUZZLE_PUNKTE[g.platz - 1] ?? 20);
    });
    pruefe(!puzzleFalsch.length, 'Puzzle-Punkte 50/40/30, alle anderen fertigen Gruppen 20' + (puzzleFalsch.length ? ' – falsch bei ' + puzzleFalsch.map(t => t.name).join(', ') : ''));
    await foto(handys[0].page, 'h-20-puzzle-fertig');
    await weiter(beamer, 'gruppensieg');
    await warte(3500);
    await foto(beamer, 'b-20-gruppensieg');
    const sieger = zg.puzzle.gruppen.find(g => g.platz === 1);
    pruefe((await beamer.textContent('.stufe.p1 .wer')).includes(sieger.mitglieder[0].name), 'Siegerehrung: Gewinnergruppe auf Platz 1');
    // Die ausgefallene Person kommt zurück
    ausfall.page = await ausfall.ctx.newPage();
    beobachten(ausfall.page, ausfall.name);
    await ausfall.page.goto(B + '/');
    await handyModus(ausfall, 'gruppensieg');
    await weiter(beamer, 'punkte');
    await foto(beamer, 'b-21-punktestand-nach-demo8');

    /* ---------- Demo 9: KAROLINE-RUN! ---------- */
    console.log('\nDemo 9: KAROLINE-RUN!');
    await weiter(beamer, 'folie');
    await warte(3000);
    await foto(beamer, 'b-22-demo9-folie');
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
    await foto(spieler[0].page, 'h-21-spiel-ende');
    // Eine Person startet einen neuen Lauf; die Lehrkraft beendet das Spiel mittendrin
    const laeufer = spieler[0];
    const f0 = laeufer.page.frameLocator('#spiel-rahmen');
    await f0.locator('#knopf-nochmal').click();
    await warte(2500);
    await foto(beamer, 'b-23-demo9-highscore');
    await weiter(beamer, 'siegerehrung');
    pruefe(/SIEGEREHRUNG/.test(await laeufer.page.textContent('#app')), 'Handys zeigen „SIEGEREHRUNG“, Spiel ist beendet');
    pruefe(!(await laeufer.page.$('#spiel-rahmen')), 'Spiel auf dem Handy geschlossen');
    await warte(3500);
    await foto(beamer, 'b-24-siegerehrung');
    const z6 = await zustand(beamer);
    const podest = await beamer.$$eval('.stufe .wer b', e => e.map(x => x.textContent));
    pruefe(podest[1] === z6.spiel[0].name, `Platz 1 auf dem Treppchen: ${z6.spiel[0].name} (${z6.spiel[0].punkte} Punkte)`);

    /* ---------- Abschluss: Fragerunde, Export ---------- */
    console.log('\nAbschluss: Fragerunde, Export und Zurücksetzen');
    await weiter(beamer, 'punkte');
    pruefe(!(await beamer.$('[data-export]')), 'Punktestand nach der Siegerehrung (Export erst nach der Fragerunde)');
    await foto(beamer, 'b-25-punktestand-nach-siegerehrung');

    /* ---------- Demo 10: Test mit Note ---------- */
    console.log('\nDemo 10: Test mit Note');
    await weiter(beamer, 'folie');
    await warte(6500);
    await foto(beamer, 'b-26-demo10-folie');
    await weiter(beamer, 'test');
    const { TEST_LOESUNG } = await import(pathToFileURL(path.join(WURZEL, 'worker', 'test-loesung.js')).href);
    const NOTE = p => [92, 81, 67, 50, 30].findIndex(g => p >= g) + 1 || 6;
    const testErwartet = [];
    const reihen = new Set();
    await Promise.all(handys.map(async (h, i) => {
      await handyModus(h, 'test');
      await h.page.waitForSelector('.test .wahl');
      const t = await h.page.evaluate(() => window.__handy.a.test);
      reihen.add(t.reihenfolge.join(',') + '|' + t.optionen.map(o => o.join('')).join(','));
      const fehler = i % 5;                 // 0–4 falsche Antworten
      const unfertig = i % 7 === 6;         // beantwortet nur 3 Fragen und gibt nicht selbst ab
      let richtig = 0;
      for (let p = 0; p < 8; p++) {
        if (unfertig && p >= 3) break;
        const q = t.reihenfolge[p];
        const o = p < fehler ? (TEST_LOESUNG[q] + 1) % 4 : TEST_LOESUNG[q];
        if (o === TEST_LOESUNG[q]) richtig++;
        await h.page.click(`.test .wahl[data-o="${o}"]`);
        if (p < 7) await h.page.click('.test [data-weiter]');
      }
      if (!unfertig) {
        await h.page.click('.test [data-fertig]');
        await h.page.click('.test [data-abgeben]');
      }
      testErwartet[i] = { richtig, note: NOTE(100 * richtig / 8), unfertig };
    }));
    const sollAbgegeben = testErwartet.filter(e => !e.unfertig).length;
    await warteBis(async () => (await zustand(beamer)).test.abgegeben === sollAbgegeben, 'Abgaben am Beamer');
    pruefe(true, `Beamer zählt ${sollAbgegeben} Abgaben – ohne Namen und ohne Noten`);
    pruefe(reihen.size === TN, `Fragen und Antworten auf jedem Handy anders gemischt (${reihen.size} verschiedene Reihenfolgen)`);
    await warteBis(async () => /Note 1/.test(await handys[0].page.textContent('.test')), 'Ergebnis am Handy');
    pruefe(true, 'Nach der Abgabe zeigt das Handy die eigene Note (8 von 8 → Note 1)');
    pruefe(!(await zuschauer.evaluate(() => JSON.stringify(window.__workshop.z.tn).includes('schriftlich'))), 'Zuschauer-Link bekommt keine Noten');
    await foto(handys[6].page, 'h-22-test-frage');
    await foto(handys[3].page, 'h-23-test-ergebnis', true);
    await foto(beamer, 'b-27-demo10-test');
    await weiter(beamer, 'notenspiegel');
    const zT = await zustand(beamer);
    const notenFalsch = zT.tn.filter(t => {
      const e = testErwartet[handys.findIndex(h => h.name === t.name)];
      return !t.noten.test || t.noten.schriftlich !== e.note || t.noten.test.richtig !== e.richtig;
    });
    pruefe(!notenFalsch.length, 'Schriftliche Noten nach IHK-Schlüssel richtig, auch bei automatisch abgegebenen Tests' + (notenFalsch.length ? ' – falsch bei ' + notenFalsch.map(t => t.name).join(', ') : ''));
    const spiegel = [0, 0, 0, 0, 0, 0];
    testErwartet.forEach(e => spiegel[e.note - 1]++);
    pruefe(JSON.stringify(zT.notenspiegel.noten) === JSON.stringify(spiegel), 'Anonymer Notenspiegel (Note 1–6): ' + spiegel.join(' / '));
    await warteBis(async () => /Note \d/.test(await handys[6].page.textContent('.test')), 'unfertiges Handy zeigt Ergebnis');
    pruefe(true, 'Nicht abgegebener Test wird beim Beenden automatisch abgegeben, das Handy zeigt die Note');
    await warte(1200);
    await foto(beamer, 'b-28-notenspiegel');

    await weiter(beamer, 'folie');
    await foto(beamer, 'b-29-und-der-prompt');
    await warteBis(() => handys[0].page.$('[data-prompt-pdf]'), 'PDF-Knopf am Handy');
    const pdfLink = await handys[0].page.$eval('[data-prompt-pdf]', a => a.href);
    const pdfAntwort = await handys[0].page.request.get(pdfLink);
    pruefe(pdfAntwort.ok() && /application\/pdf/.test(pdfAntwort.headers()['content-type'] || '') && (await pdfAntwort.body()).subarray(0, 5).toString() === '%PDF-',
      'Folie „Und der Prompt?“: Handy bietet den Beispiel-Prompt als PDF an, die Datei wird ausgeliefert');
    await foto(handys[0].page, 'h-25-prompt-pdf');
    await weiter(beamer, 'folie');
    await warte(1200);
    pruefe(/FRAGERUNDE/.test(await beamer.textContent('.inhalt')) && /PUNKTESTAND-MODUS/.test(await beamer.textContent('[data-weiter]')), 'Folie Fragerunde mit Knopf PUNKTESTAND-MODUS');
    await foto(beamer, 'b-30-fragerunde');
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
    pruefe(['angemeldet um', 'mündliche Note', 'Test: richtig (von 8)', 'schriftliche Note'].every(k => blatt.includes(`>${k}</t>`)),
      'Excel enthält Anmeldezeit, mündliche Note, Testergebnis und schriftliche Note');
    await warteBis(async () => /Deine Noten/.test(await handys[0].page.textContent('#app')), 'Noten am Handy');
    pruefe(true, 'Nach dem Export sieht jede*r die eigenen Noten auf dem Handy');
    await foto(handys[0].page, 'h-24-noten', true);
    await foto(beamer, 'b-31-punktestand-final');
    await weiter(beamer, 'folie');
    await warte(800);
    await foto(beamer, 'b-32-jetzt-seid-ihr-dran');
    await warteBis(() => handys[0].page.$('[data-claude]'), 'Claude-Knopf am Handy');
    pruefe(await handys[0].page.$eval('[data-claude]', a => a.href) === 'https://claude.ai/' && /Deine Noten/.test(await handys[0].page.textContent('#app')),
      'Folie „JETZT SEID IHR DRAN!“: Handy hat einen Knopf zu claude.ai (und zeigt weiter die eigenen Noten)');
    await foto(handys[0].page, 'h-26-jetzt-claude', true);

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
    await warteBis(async () => /nicht \(mehr\) gültig/.test(await zuschauer.textContent('#buehne')), 'Zuschauer-Link abgelaufen');
    pruefe(true, 'Nach dem Zurücksetzen ist der Zuschauer-Link ungültig');
    await foto(zuschauer, 'z-02-zuschauer-abgelaufen');
    await foto(beamer, 'b-33-nach-zuruecksetzen');
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
