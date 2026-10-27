/* „KAROLINE-RUN!“ – Minispiel im KI-Workshop (übernommen aus „Diabetes Run!“ der Lernkarten).
 * Läuft in einem Rahmen (iframe) auf der Handy-Seite. Während eines Laufs meldet das Spiel
 * etwa jede Sekunde seinen Punktestand an die Handy-Seite, nach dem Ende das Ergebnis –
 * die Handy-Seite schickt es an den Beamer (Highscore). Beliebig viele Runden.
 * Das Spiel selbst läuft vollständig auf dem Gerät. */
(function () {
  'use strict';

  var TEST = window.__SPIEL_TEST || {};

  var T = {
    titel: 'KAROLINE-RUN!',
    logoAlt: 'Logo der Schule',
    spielidee: 'Karoline ist als Pflegekraft auf Tour durchs schöne Hohenlohe – der Zeitplan ist eng, und überall lauern Gefahren! Kuchen, Weinkisten, Rollatoren, Pflegewagen und Schlaglöcher überspringen, unter Wespenschwärmen durchducken, und für den Lkw braucht es einen Doppelsprung.',
    los: 'Los geht’s!',
    losHinweis: 'Jeder Lauf zählt für die Highscore am Beamer – du kannst so oft spielen, wie du willst.',
    steuerungHandy: 'Tippe unten auf „⬆ Springen“ oder „⬇ Ducken“. In der Luft noch einmal springen = Doppelsprung.',
    steuerungTastatur: 'Tastatur: Leertaste oder Pfeil hoch = springen, Pfeil runter = ducken.',
    gameOver: 'Game over',
    punkte: 'Punkte: {x}',
    bestleistung: 'Deine Bestleistung: {x}',
    neueBestleistung: 'Neue Bestleistung!',
    gesendet: 'Deine Punktzahl wurde an den Beamer geschickt.',
    nochmal: 'Nochmal!',
    pausiert: 'Pause – tippe hier, um weiterzuspielen.',
    knopfDucken: '⬇ Ducken',
    knopfSpringen: '⬆ Springen'
  };

  function ersetzen(text, werte) {
    return String(text).replace(/\{(\w+)\}/g, function (_, k) { return werte[k] !== undefined ? werte[k] : ''; });
  }

  function el(tag, klasse, text) {
    var e = document.createElement(tag);
    if (klasse) e.className = klasse;
    if (text !== undefined && text !== null) e.textContent = text;
    return e;
  }

  // Meldung an die Handy-Seite (falls das Spiel in ihrem Rahmen läuft)
  function melden(art, punkteWert) {
    try {
      if (window.parent && window.parent !== window) {
        window.parent.postMessage({ quelle: 'karoline-run', art: art, punkte: punkteWert }, location.origin);
      }
    } catch (e) { /* egal */ }
  }

  function sitzungLesen(k) { try { return sessionStorage.getItem(k); } catch (e) { return null; } }
  function sitzungSchreiben(k, w) { try { sessionStorage.setItem(k, w); } catch (e) { /* egal */ } }

  var BEST = 'kbs-ki-workshop:karoline-run-best';
  function persoenlicheBest() {
    try { var n = JSON.parse(localStorage.getItem(BEST)); return typeof n === 'number' ? n : 0; } catch (e) { return 0; }
  }
  function bestSetzen(p) { try { localStorage.setItem(BEST, JSON.stringify(p)); } catch (e) { /* egal */ } }

  /* =====================================================================
     Bildschirme (außerhalb des Laufs)
     ===================================================================== */
  var body = document.body;
  var panel = document.getElementById('panel');
  var steuerung = document.getElementById('steuerung');
  var pauseHinweis = document.getElementById('pause-hinweis');
  var knopfDucken = document.getElementById('knopf-ducken');
  var knopfSpringen = document.getElementById('knopf-springen');
  knopfDucken.textContent = T.knopfDucken;
  knopfSpringen.textContent = T.knopfSpringen;
  pauseHinweis.textContent = T.pausiert;
  document.title = T.titel;

  var bildschirm = '';

  function panelLeeren() {
    panel.textContent = '';
    var innen = el('div', 'panel-innen');
    panel.appendChild(innen);
    panel.scrollTop = 0;
    return innen;
  }

  function knopf(text, klasse, fn) {
    var b = el('button', 'knopf' + (klasse ? ' ' + klasse : ''), text);
    b.type = 'button';
    b.addEventListener('click', fn);
    return b;
  }

  function menueModus(name) {
    bildschirm = name;
    body.classList.remove('lauf');
    body.classList.add('menue');
    steuerung.hidden = true;
    pauseHinweis.hidden = true;
    groesseAnpassen();
  }

  // Es gibt nur eine Spielfigur: die Pflegekraft Karoline
  var FIGUR = 'schwester';

  function kopfZeile(p) {
    var kopf = el('div', 'start-kopf');
    var logo = el('img', 'schullogo');
    logo.src = 'logo-kbs.png';
    logo.alt = T.logoAlt;
    kopf.appendChild(logo);
    kopf.appendChild(el('h1', null, T.titel));
    p.appendChild(kopf);
  }

  function zeigeStart() {
    menueModus('start');
    var p = panelLeeren();
    kopfZeile(p);
    p.appendChild(el('p', null, T.spielidee));
    if (persoenlicheBest() > 0) p.appendChild(el('p', null, ersetzen(T.bestleistung, { x: persoenlicheBest() })));
    var los = knopf(T.los, '', laufStarten);
    los.id = 'knopf-los';
    p.appendChild(los);
    p.appendChild(el('p', 'steuer-info', T.losHinweis + ' ' + T.steuerungHandy + ' ' + T.steuerungTastatur));
    figurenBauen();
    szeneZeichnen();
  }

  var endeZeit = 0;
  function zeigeEnde(punkteWert, neu) {
    menueModus('ende');
    endeZeit = performance.now();
    var p = panelLeeren();
    p.appendChild(el('h2', null, T.gameOver));
    var g = el('p', 'gross', ersetzen(T.punkte, { x: punkteWert }));
    g.id = 'ergebnis-punkte';
    p.appendChild(g);
    if (neu) p.appendChild(el('p', 'neu-best', T.neueBestleistung));
    p.appendChild(el('p', null, ersetzen(T.bestleistung, { x: persoenlicheBest() })));
    p.appendChild(el('p', 'klein', T.gesendet));
    var nochmal = knopf(T.nochmal, '', laufStarten);
    nochmal.id = 'knopf-nochmal';
    p.appendChild(nochmal);
  }

  /* =====================================================================
     Spiel: Konstanten, Grafiken, Objekte
     ===================================================================== */
  var B = 320, H = 180;          // interne Auflösung
  var BODEN = 160;               // Fußlinie
  var SPIELER_X = 36;
  var DT = 1 / 120;              // feste Zeitschrittweite der Physik
  var SCHWERKRAFT = 1500;
  var SPRUNG_V = 430;
  var DOPPELSPRUNG_V = 380;
  var V_START = 150;

  /* Schwierigkeit (für das Lernen zu Hause, kein Zeitlimit):
     - 0–30 s: gemütlich – nur einzelne Hindernisse mit viel Abstand, hier kommen alle mit.
     - 30 s bis 4 min: Tempo, Dichte und schwierige Abfolgen (Lkw, Schlaglöcher,
       Hindernis + Wespenschwarm) steigen gleichmäßig an.
     - danach steigt das Tempo weiter: Die Hindernisse tauchen so spät auf, dass kaum
       noch jemand rechtzeitig reagieren kann. Es gibt kein künstliches Ende – jedes
       Muster bleibt mit der richtigen Eingabe machbar (geprüft in tests/schwierigkeit.test.js). */
  var LEICHT_BIS = 30;           // Sekunden
  var VOLL_AB = 240;             // ab hier volle Dichte und Gemeinheit (4 Minuten)
  var V_LEICHT = V_START + 2 * LEICHT_BIS;  // 210 px/s nach 30 s
  var V_VOLL = 700;              // Tempo nach 4 Minuten
  var V_GRENZE = 1400;           // höchstes Tempo
  var STEIGUNG = (V_VOLL - V_LEICHT) / (VOLL_AB - LEICHT_BIS);  // ≈ 3 px/s je Sekunde

  function tempoBei(t) {
    if (t < LEICHT_BIS) return V_START + 2 * t;                    // 150 → 210 px/s
    return Math.min(V_GRENZE, V_LEICHT + STEIGUNG * (t - LEICHT_BIS));
  }

  // 0 = leicht (bis 30 s), 1 = volle Härte (nach 4 Minuten), dazwischen gleichmäßig
  function haerteBei(t) {
    return t < LEICHT_BIS ? 0 : Math.min(1, (t - LEICHT_BIS) / (VOLL_AB - LEICHT_BIS));
  }

  // Alle Stellschrauben der Hindernis-Abfolge. Abstände in Sekunden Fahrzeit,
  // damit sie bei jedem Tempo gleich viel Zeit zum Reagieren lassen.
  function muster(t) {
    var h = haerteBei(t);
    var ab30 = t >= LEICHT_BIS;
    return {
      h: h,
      lkw: ab30 ? 0.04 + 0.12 * h : 0,        // Anteil KBS-Lkw (Doppelsprung)
      loch: ab30 ? 0.06 + 0.30 * h : 0,       // Anteil Schlaglöcher
      lochMax: 40 + 46 * h,                   // breitestes Schlagloch in px
      kombi: ab30 ? 0.06 + 0.40 * h : 0,      // Bodenhindernis mit Wespen oder Loch direkt dahinter
      kombiWespe: 0.70 - 0.15 * h,            // s vom Hindernis-Ende bis zum Wespenschwarm
      kombiLoch: 0.42 - 0.12 * h,             // s vom Hindernis-Ende bis zum Loch
      abstandMin: 0.85 - 0.30 * h,            // kleinster Abstand zum nächsten Hindernis (s)
      abstandZufall: 0.90 - 0.60 * h          // zufällig dazu: 0 bis so viele Sekunden
    };
  }

  var leinwand = document.getElementById('leinwand');
  var rahmen = document.getElementById('rahmen');
  var ctx = leinwand.getContext('2d', { alpha: false });
  ctx.imageSmoothingEnabled = false;

  var bilder = {};
  var figurBilder = { lauf1: null, lauf2: null, lauf3: null, lauf4: null, sprung: null, ducken: null };
  var LAUF_FOLGE = ['lauf1', 'lauf2', 'lauf3', 'lauf4'];
  var laufBilder = [null, null, null, null];

  function figurenBauen() {
    if (figurBilder.lauf1) return;
    Object.keys(figurBilder).forEach(function (pose) { figurBilder[pose] = PIXEL.figur(FIGUR, pose, 1); });
    for (var i = 0; i < 4; i++) laufBilder[i] = figurBilder[LAUF_FOLGE[i]];
  }

  function grafikenBauen() {
    Object.keys(PIXEL.GRAFIK).forEach(function (n) { bilder[n] = PIXEL.rasterZeichnen(PIXEL.GRAFIK[n], 1); });
    bilder.ziffern = PIXEL.ziffernblatt('#16262A');
    bilder.schwarm1 = schwarmBauen(bilder.wespe1, bilder.wespe2);
    bilder.schwarm2 = schwarmBauen(bilder.wespe2, bilder.wespe1);
    bilder.schwarm = bilder.schwarm1;
    bilder.hintergrund = hintergrundBauen();
    bilder.strasse = strasseBauen();
  }

  // Wespenschwarm: senkrechte Säule von Kopfhöhe bis über die höchste Sprunghöhe
  // (auch mit Doppelsprung) – man kann nicht darüberspringen, nur darunter ducken.
  function schwarmBauen(a, b) {
    var hoehe = BODEN - 19 - 8;          // von 8 px unter dem oberen Rand bis Kopfhöhe
    var c = PIXEL.leinwand(16, hoehe);
    var g = c.getContext('2d');
    for (var y = hoehe - 7, i = 0; y >= 0; y -= 11, i++) {
      g.drawImage(i % 2 ? b : a, i % 2 ? 4 : 0, y);
    }
    return c;
  }

  // Hintergrund (Himmel, Hügel mit Weinbergen, Dörfer) einmal vorzeichnen.
  // 640 px breit und nach 320 px wiederholend, damit er nur verschoben wird.
  function hintergrundBauen() {
    var bb = 640, hh = 150;
    var c = PIXEL.leinwand(bb, hh);
    var g = c.getContext('2d');
    var bild = g.createImageData(bb, hh);
    var d = bild.data;
    function rgb(hex) { return [parseInt(hex.substr(1, 2), 16), parseInt(hex.substr(3, 2), 16), parseInt(hex.substr(5, 2), 16)]; }
    var HIMMEL = rgb('#CFE5EC'), FERN = rgb('#A5C59A'), NAH = rgb('#7FA86A'), REIHE = rgb('#5F8A4E'),
      WIESE = rgb('#8DBA62'), WAND = rgb('#F2EEE6'), DACH = rgb('#B5523B');
    function setzen(x, y, f) {
      var i = (y * bb + x) * 4;
      d[i] = f[0]; d[i + 1] = f[1]; d[i + 2] = f[2]; d[i + 3] = 255;
    }
    var P = 2 * Math.PI / 320;
    for (var x = 0; x < bb; x++) {
      var fern = Math.round(78 + 10 * Math.sin(x * P) + 6 * Math.sin(x * P * 3 + 1));
      var nah = Math.round(104 + 12 * Math.sin(x * P * 2 + 2) + 5 * Math.sin(x * P * 5));
      for (var y = 0; y < hh; y++) {
        var f = HIMMEL;
        if (y >= 138) f = WIESE;
        else if (y >= nah) f = ((y - nah + Math.floor((x % 320) / 3)) % 5 === 0 && y > nah + 1) ? REIHE : NAH;
        else if (y >= fern) f = FERN;
        setzen(x, y, f);
      }
    }
    // kleine Dörfer an den Hängen (wiederholen sich alle 320 px)
    var haeuser = [[40, 0], [52, 1], [61, 0], [150, 1], [258, 0], [268, 1]];
    for (var k = 0; k < 2; k++) {
      haeuser.forEach(function (hs) {
        var hx = hs[0] + k * 320;
        var basis = Math.round(78 + 10 * Math.sin(hx * P) + 6 * Math.sin(hx * P * 3 + 1)) + 3;
        for (var yy = 0; yy < 5; yy++) for (var xx = 0; xx < 7; xx++) setzen(hx + xx, basis - yy, WAND);
        for (var yr = 0; yr < 3; yr++) for (var xr = yr; xr < 7 - yr; xr++) setzen(hx + xr, basis - 5 - yr, DACH);
        if (hs[1]) for (var yt = 0; yt < 6; yt++) { setzen(hx + 3, basis - 8 - yt, WAND); }
      });
    }
    g.putImageData(bild, 0, 0);
    return c;
  }

  // Straße mit Mittelstreifen (40 px Muster), 360 px breit zum Verschieben
  function strasseBauen() {
    var c = PIXEL.leinwand(360, 30);
    var g = c.getContext('2d');
    g.fillStyle = '#6E7377'; g.fillRect(0, 0, 360, 30);
    g.fillStyle = '#A8ADB0'; g.fillRect(0, 0, 360, 2);
    g.fillStyle = '#5C6064'; g.fillRect(0, 28, 360, 2);
    g.fillStyle = '#F4F4F4';
    for (var x = 0; x < 360; x += 40) g.fillRect(x, 16, 18, 2);
    return c;
  }

  // Objekt-Vorrat: höchstens 6 Objekte, werden wiederverwendet
  var MAX_OBJEKTE = 8;
  var objekte = [];
  for (var oi = 0; oi < MAX_OBJEKTE; oi++) {
    objekte.push({ aktiv: false, art: '', x: 0, y: 0, b: 0, h: 0, rand: 0 });
  }

  var ARTEN = [
    // name, Wahrscheinlichkeit, in der Luft?
    { name: 'kuchen', anteil: 0.24, luft: false, rand: 1 },
    { name: 'weinkiste', anteil: 0.2, luft: false, rand: 1 },
    { name: 'rollator', anteil: 0.18, luft: false, rand: 2 },
    { name: 'pflegewagen', anteil: 0.14, luft: false, rand: 1 },
    { name: 'schwarm', anteil: 0.24, luft: true, rand: 1 }
  ];

  /* ---------- Spielzustand (keine neuen Objekte während des Laufs) ---------- */
  var sp = {
    y: 0, vy: 0, amBoden: true, duckt: false,
    sprungGedrueckt: false, sprungPuffer: 0, spruenge: 0,
    v: V_START, zeit: 0, strecke: 0, naechstes: 0, anzahl: 0, aus: false
  };
  var eingabe = { springen: false, ducken: false, springenNeu: false };

  function laufZuruecksetzen() {
    sp.y = BODEN; sp.vy = 0; sp.amBoden = true; sp.duckt = false;
    sp.sprungPuffer = 0; sp.spruenge = 0; sp.v = V_START; sp.zeit = 0; sp.strecke = 0;
    sp.naechstes = 260; sp.anzahl = 0; sp.aus = false;
    eingabe.springen = false; eingabe.ducken = false; eingabe.springenNeu = false;
    for (var i = 0; i < MAX_OBJEKTE; i++) objekte[i].aktiv = false;
  }

  function freiesObjekt() {
    for (var i = 0; i < MAX_OBJEKTE; i++) if (!objekte[i].aktiv) return objekte[i];
    return null;
  }

  function objektSetzen(o, artName, x, luft, randPx) {
    var bild = bilder[artName];
    o.aktiv = true;
    o.art = artName;
    o.b = bild.width;
    o.h = bild.height;
    o.rand = randPx;
    o.x = x;
    // Flugobjekte enden unten 19 px über dem Boden: im Stehen getroffen, geduckt frei
    o.y = luft ? BODEN - 19 - o.h : BODEN - o.h;
  }

  // Schlagloch in der Straße: nur mit einem Sprung zu überwinden
  function lochSetzen(o, x, breite) {
    o.aktiv = true;
    o.art = 'loch';
    o.b = breite;
    o.h = 24;
    o.rand = 0;
    o.x = x;
    o.y = BODEN - 4;
  }

  // KBS-Lkw: lang und hoch. Ein einfacher Sprung reicht bei keinem Tempo,
  // ein Doppelsprung am höchsten Punkt schon (Länge wächst mit dem Tempo).
  function lkwSetzen(o, x) {
    o.aktiv = true;
    o.art = 'lkw';
    o.b = Math.max(72, Math.round(sp.v * 0.5));
    o.h = 42;
    o.rand = 2;
    o.x = x;
    o.y = BODEN - 42;
  }

  var statistik = { hindernisse: 0, lkw: 0, loch: 0, kombi: 0 };

  function hindernisErzeugen() {
    var o = freiesObjekt();
    if (!o) return;
    var m = muster(sp.zeit);
    var x = B + 4;
    sp.anzahl++;
    statistik.hindernisse++;

    if (Math.random() < m.lkw) {
      lkwSetzen(o, x);
      statistik.lkw++;
    } else if (Math.random() < m.loch) {
      lochSetzen(o, x, Math.round(26 + Math.random() * (m.lochMax - 26)));
      statistik.loch++;
    } else {
      var r = Math.random();
      var art = ARTEN[0];
      var summe = 0;
      // Die ersten drei Hindernisse sind immer am Boden (zum Eingewöhnen)
      r *= sp.anzahl <= 3 ? 0.76 : 1;
      for (var i = 0; i < ARTEN.length; i++) {
        summe += ARTEN[i].anteil;
        if (r < summe) { art = ARTEN[i]; break; }
      }
      objektSetzen(o, art.name, x, art.luft, art.rand);

      // Gemeine Kombinationen: Bodenhindernis mit Wespenschwarm oder Loch direkt dahinter
      if (!art.luft && Math.random() < m.kombi) {
        var k = freiesObjekt();
        if (k) {
          statistik.kombi++;
          var ende = o.x + o.b;
          if (Math.random() < 0.5) objektSetzen(k, 'schwarm', ende + sp.v * m.kombiWespe, true, 1);
          else lochSetzen(k, ende + sp.v * m.kombiLoch, Math.round(24 + Math.random() * 20));
          o = k;
        }
      }
    }

    // Abstand zum nächsten Hindernis: wird bis 4 Minuten gleichmäßig knapper
    var abstand = Math.max(110, sp.v * m.abstandMin) + Math.random() * sp.v * m.abstandZufall;
    sp.naechstes = (o.x - B - 4) + abstand + o.b;
  }

  function trifft(o) {
    var x1, x2, y1, y2;
    if (sp.duckt && sp.amBoden) {
      x1 = SPIELER_X + 2; x2 = SPIELER_X + 14; y1 = sp.y - 13; y2 = sp.y - 1;
    } else {
      x1 = SPIELER_X + 4; x2 = SPIELER_X + 12; y1 = sp.y - 22; y2 = sp.y - 1;
    }
    return x1 < o.x + o.b - o.rand && x2 > o.x + o.rand && y1 < o.y + o.h - o.rand && y2 > o.y + o.rand;
  }

  // Ein Physik-Schritt mit fester Länge DT
  function schritt() {
    sp.zeit += DT;
    sp.v = tempoBei(sp.zeit);
    var weg = sp.v * DT;
    sp.strecke += weg;

    // Springen: am Boden normal, in der Luft einmal Doppelsprung.
    // Kurz vor der Landung gedrückt → Sprung direkt nach der Landung.
    if (eingabe.springenNeu) {
      eingabe.springenNeu = false;
      if (!sp.amBoden && sp.spruenge < 2 && !(sp.vy > 0 && sp.y > BODEN - 8)) {
        sp.vy = -DOPPELSPRUNG_V; sp.spruenge = 2;
      } else {
        sp.sprungPuffer = 0.12;
      }
    }
    if (sp.sprungPuffer > 0) {
      if (sp.amBoden) {
        sp.vy = -SPRUNG_V; sp.amBoden = false; sp.sprungPuffer = 0; sp.spruenge = 1;
      } else {
        sp.sprungPuffer -= DT;
      }
    }
    if (!sp.amBoden) {
      sp.vy += SCHWERKRAFT * (eingabe.ducken ? 2.5 : 1) * DT;
      sp.y += sp.vy * DT;
      if (sp.y >= BODEN) { sp.y = BODEN; sp.vy = 0; sp.amBoden = true; sp.spruenge = 0; }
    }
    sp.duckt = eingabe.ducken;

    // Objekte bewegen
    for (var i = 0; i < MAX_OBJEKTE; i++) {
      var o = objekte[i];
      if (!o.aktiv) continue;
      o.x -= weg;
      if (o.x + o.b < -2) { o.aktiv = false; continue; }
      if (o.art === 'loch') {
        // Füße vollständig über dem Loch und am Boden → hineingefallen
        if (sp.amBoden && SPIELER_X + 5 > o.x + 1 && SPIELER_X + 11 < o.x + o.b - 1 && !TEST.unverwundbar) {
          sp.aus = true;
          sp.y = BODEN + 8;
        }
      } else if (trifft(o)) {
        if (!TEST.unverwundbar) sp.aus = true;
      }
    }

    sp.naechstes -= weg;
    if (sp.naechstes <= 0) hindernisErzeugen();
  }

  // Punkte = zurückgelegte Strecke (1 Punkt je 16 Bildpunkte)
  var PUNKTE_TEILER = 16;
  function punkte() { return Math.floor(sp.strecke / PUNKTE_TEILER); }

  /* ---------- Zeichnen (nur Kopieren vorgezeichneter Bilder) ---------- */
  var sparmodus = false;

  function zahlZeichnen(zahl, rechts, y) {
    var x = rechts;
    do {
      var z = zahl % 10;
      x -= 8;
      ctx.drawImage(bilder.ziffern, z * 4, 0, 3, 5, x, y, 6, 10);
      zahl = Math.floor(zahl / 10);
    } while (zahl > 0);
  }

  function lkwZeichnen(o) {
    var lx = Math.round(o.x), oben = BODEN - 42, kasten = o.b - 20;
    ctx.drawImage(bilder.lkwKabine, lx, oben);
    ctx.fillStyle = '#2B2B2B';
    ctx.fillRect(lx + 20, oben, kasten, 36);
    ctx.fillStyle = '#F4F6F7';
    ctx.fillRect(lx + 20, oben + 1, kasten - 1, 34);
    ctx.fillStyle = '#3F6C72';
    ctx.fillRect(lx + 20, oben + 28, kasten - 1, 4);
    if (kasten >= 40) {
      ctx.drawImage(bilder.lkwSchrift, 0, 0, 17, 7, lx + 20 + ((kasten - 34) >> 1), oben + 8, 34, 14);
    }
    ctx.drawImage(bilder.lkwRad, lx + 4, BODEN - 10);
    ctx.drawImage(bilder.lkwRad, lx + o.b - 14, BODEN - 10);
    if (o.b > 120) ctx.drawImage(bilder.lkwRad, lx + o.b - 26, BODEN - 10);
  }

  function zeichnen() {
    var hgX = sparmodus ? 0 : Math.floor(sp.strecke * 0.25) % 320;
    ctx.drawImage(bilder.hintergrund, hgX, 0, B, 150, 0, 0, B, 150);
    ctx.drawImage(bilder.strasse, Math.floor(sp.strecke) % 40, 0, B, 30, 0, 150, B, 30);

    var fluegel = !sparmodus && (Math.floor(sp.zeit * 12) & 1) === 1;
    for (var i = 0; i < MAX_OBJEKTE; i++) {
      var o = objekte[i];
      if (!o.aktiv) continue;
      if (o.art === 'loch') {
        var lx = Math.round(o.x);
        ctx.fillStyle = '#3A3F43';
        ctx.fillRect(lx - 1, 155, o.b + 2, 1);
        ctx.fillStyle = '#1C1F22';
        ctx.fillRect(lx, 156, o.b, 24);
        ctx.fillStyle = '#F2A30F';
        ctx.fillRect(lx - 3, 150, 2, 6);
        ctx.fillRect(lx + o.b + 1, 150, 2, 6);
        continue;
      }
      if (o.art === 'lkw') { lkwZeichnen(o); continue; }
      var bild = o.art === 'schwarm' ? (fluegel ? bilder.schwarm2 : bilder.schwarm1) : bilder[o.art];
      ctx.drawImage(bild, Math.round(o.x), Math.round(o.y));
    }

    var fb;
    if (!sp.amBoden) fb = figurBilder.sprung;
    else if (sp.duckt) fb = figurBilder.ducken;
    else fb = sparmodus ? figurBilder.lauf1 : laufBilder[Math.floor(sp.strecke / 12) & 3];
    // die Posen sind unterschiedlich hoch: unterste Zeile auf sp.y (die Trefferfläche hängt nicht davon ab)
    ctx.drawImage(fb, SPIELER_X, Math.round(sp.y) - fb.height);

    // Punkte oben rechts
    ctx.fillStyle = '#EAF2F4';
    ctx.fillRect(B - 64, 4, 60, 14);
    zahlZeichnen(punkte(), B - 6, 6);
  }

  // Ruhiges Standbild für die Menüs
  function szeneZeichnen() {
    if (!bilder.hintergrund) return;
    figurenBauen();
    var war = sp.aus;
    if (bildschirm !== 'ende') {
      laufZuruecksetzen();
      sp.aus = war;
    }
    ctx.drawImage(bilder.hintergrund, 0, 0, B, 150, 0, 0, B, 150);
    ctx.drawImage(bilder.strasse, 0, 0, B, 30, 0, 150, B, 30);
    if (bildschirm === 'ende') { zeichnen(); return; }
    ctx.drawImage(figurBilder.lauf2, SPIELER_X, BODEN - figurBilder.lauf2.height);
    ctx.drawImage(bilder.kuchen, 150, BODEN - bilder.kuchen.height);
    ctx.drawImage(bilder.schwarm1, 262, BODEN - 19 - bilder.schwarm1.height);
  }

  /* =====================================================================
     Hauptschleife: feste Physik, höchstens 60 (Sparmodus 30) Bilder/s
     ===================================================================== */
  var laeuft = false;
  var pausiert = false;
  var letzteZeit = 0, akku = 0, naechstesBild = 0, intervall = 1000 / 60;
  var messStart = 0, messBilder = 0, schlechteFenster = 0, messFenster = 0;
  var diag = { fps: 0, bilder: 0, sparmodus: false, fpsVerlauf: [], schritte: 0,
    abstaende: new Float32Array(1024), abstandNr: 0, letztesBild: 0 };

  function schleife(jetzt) {
    if (!laeuft) return;
    requestAnimationFrame(schleife);
    if (pausiert) return;
    if (jetzt < naechstesBild - 2) return;
    naechstesBild += intervall;
    if (jetzt - naechstesBild > intervall) naechstesBild = jetzt + intervall;

    var dt = (jetzt - letzteZeit) / 1000;
    letzteZeit = jetzt;
    if (dt > 0.25) dt = 0.25;
    if (dt < 0) dt = 0;
    akku += dt;
    while (akku >= DT) {
      schritt();
      diag.schritte++;
      akku -= DT;
      if (sp.aus) break;
    }
    zeichnen();
    diag.bilder++;
    if (diag.letztesBild) diag.abstaende[diag.abstandNr++ & 1023] = jetzt - diag.letztesBild;
    diag.letztesBild = jetzt;
    messen(jetzt);
    if (sp.aus) laufEnde();
    else if (jetzt - letzteMeldung > 1000) { letzteMeldung = jetzt; melden('stand', punkte()); }
  }

  // Bildrate messen; dauerhaft unter 40 Bildern/s → Sparmodus
  function messen(jetzt) {
    messBilder++;
    var dauer = jetzt - messStart;
    if (dauer < 2000) return;
    var fps = messBilder * 1000 / dauer;
    diag.fps = Math.round(fps * 10) / 10;
    if (diag.fpsVerlauf.length < 600) diag.fpsVerlauf.push(diag.fps);
    messFenster++;
    if (!sparmodus && messFenster > 1) {
      if (fps < 40) schlechteFenster++;
      else schlechteFenster = 0;
      if (schlechteFenster >= 3) sparmodusAn();
    }
    messStart = jetzt;
    messBilder = 0;
  }

  function sparmodusAn() {
    sparmodus = true;
    diag.sparmodus = true;
    intervall = 1000 / 30;
    sitzungSchreiben('kbs-ki-workshop:sparmodus', '1');
  }
  if (sitzungLesen('kbs-ki-workshop:sparmodus') === '1' || TEST.sparmodus) sparmodusAn();

  function laufStarten() {
    if (bildschirm === 'lauf') return;
    if (bildschirm === 'ende' && performance.now() - endeZeit < 600) return;
    figurenBauen();
    laufZuruecksetzen();
    bildschirm = 'lauf';
    body.classList.add('lauf');
    body.classList.remove('menue');
    steuerung.hidden = false;
    pauseHinweis.hidden = true;
    pausiert = false;
    groesseAnpassen();
    try { if (document.activeElement && document.activeElement.blur) document.activeElement.blur(); } catch (e) { /* egal */ }
    // eine vorher (z. B. im Menü) entstandene Textauswahl samt „Kopieren“-Menü nicht ins Spiel mitnehmen
    try { var auswahl = window.getSelection(); if (auswahl && auswahl.rangeCount) auswahl.removeAllRanges(); } catch (e) { /* egal */ }
    var jetzt = performance.now();
    letzteZeit = jetzt; naechstesBild = jetzt; akku = 0;
    messStart = jetzt; messBilder = 0; messFenster = 0; schlechteFenster = 0;
    diag.letztesBild = 0;
    diag.laufStart = Date.now();
    letzteMeldung = jetzt;
    melden('start', 0);
    zeichnen();
    if (!laeuft) { laeuft = true; requestAnimationFrame(schleife); }
  }

  var letzteMeldung = 0;

  function laufEnde() {
    laeuft = false;
    diag.laufEnde = Date.now();
    var p = punkte();
    melden('ende', p);
    var neu = p > persoenlicheBest();
    if (neu) bestSetzen(p);
    diag.letztePunkte = p;
    eingabe.ducken = false;
    eingabe.springen = false;
    knopfDucken.classList.remove('aktiv');
    knopfSpringen.classList.remove('aktiv');
    zeigeEnde(p, neu);
    zeichnen();
  }

  function pausieren() {
    if (bildschirm !== 'lauf' || pausiert) return;
    pausiert = true;
    eingabe.ducken = false;
    eingabe.springen = false;
    pauseHinweis.hidden = false;
  }

  function fortsetzen() {
    if (!pausiert) return;
    pausiert = false;
    pauseHinweis.hidden = true;
    var jetzt = performance.now();
    letzteZeit = jetzt; naechstesBild = jetzt; akku = 0; messStart = jetzt; messBilder = 0;
    diag.letztesBild = 0;
  }

  document.addEventListener('visibilitychange', function () {
    if (document.hidden) pausieren();
  });
  window.addEventListener('pagehide', pausieren);
  pauseHinweis.addEventListener('pointerdown', function (e) { e.preventDefault(); fortsetzen(); });
  pauseHinweis.addEventListener('click', fortsetzen);

  /* =====================================================================
     Steuerung: Tastatur und Touch
     ===================================================================== */
  function springenDruecken() {
    if (pausiert) { fortsetzen(); return; }
    if (!eingabe.springen) eingabe.springenNeu = true;
    eingabe.springen = true;
    knopfSpringen.classList.add('aktiv');
  }
  function springenLoslassen() {
    eingabe.springen = false;
    knopfSpringen.classList.remove('aktiv');
  }
  function duckenDruecken() {
    if (pausiert) { fortsetzen(); return; }
    eingabe.ducken = true;
    knopfDucken.classList.add('aktiv');
  }
  function duckenLoslassen() {
    eingabe.ducken = false;
    knopfDucken.classList.remove('aktiv');
  }

  function istEingabefeld(t) {
    return t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA');
  }

  document.addEventListener('keydown', function (e) {
    var k = e.key;
    var hoch = k === ' ' || k === 'Spacebar' || k === 'ArrowUp' || k === 'w' || k === 'W';
    var runter = k === 'ArrowDown' || k === 's' || k === 'S';
    if (bildschirm === 'lauf') {
      if (hoch) { e.preventDefault(); if (!e.repeat) springenDruecken(); }
      else if (runter) { e.preventDefault(); duckenDruecken(); }
      else if (pausiert && k === 'Enter') { e.preventDefault(); fortsetzen(); }
      return;
    }
    if (istEingabefeld(e.target)) return;
    if (bildschirm === 'start' && (k === ' ' || k === 'ArrowUp') && !e.repeat) {
      e.preventDefault();
      laufStarten();
    }
  });
  document.addEventListener('keyup', function (e) {
    var k = e.key;
    if (k === ' ' || k === 'Spacebar' || k === 'ArrowUp' || k === 'w' || k === 'W') springenLoslassen();
    else if (k === 'ArrowDown' || k === 's' || k === 'S') duckenLoslassen();
  });
  window.addEventListener('blur', function () { springenLoslassen(); duckenLoslassen(); });

  function touchKnopf(knopfEl, druecken, loslassen) {
    knopfEl.addEventListener('pointerdown', function (e) {
      e.preventDefault();
      try { knopfEl.setPointerCapture(e.pointerId); } catch (x) { /* egal */ }
      druecken();
    });
    ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(function (n) {
      knopfEl.addEventListener(n, function () { loslassen(); });
    });
    // Klick per Tastatur (Enter) auf dem Knopf
    knopfEl.addEventListener('click', function (e) { e.preventDefault(); });
    knopfEl.addEventListener('contextmenu', function (e) { e.preventDefault(); });
  }
  touchKnopf(knopfSpringen, springenDruecken, springenLoslassen);
  touchKnopf(knopfDucken, duckenDruecken, duckenLoslassen);

  // Tippen auf das Spielfeld = springen
  leinwand.addEventListener('pointerdown', function (e) {
    if (bildschirm !== 'lauf') return;
    e.preventDefault();
    springenDruecken();
  });
  leinwand.addEventListener('pointerup', function () { if (bildschirm === 'lauf') springenLoslassen(); });
  leinwand.addEventListener('pointercancel', springenLoslassen);

  // Kein Zoomen, Scrollen oder Markieren während des Spiels
  ['touchstart', 'touchmove'].forEach(function (n) {
    document.addEventListener(n, function (e) {
      if (bildschirm === 'lauf' && e.cancelable) e.preventDefault();
    }, { passive: false });
  });
  document.addEventListener('dblclick', function (e) { if (bildschirm === 'lauf') e.preventDefault(); });
  document.addEventListener('gesturestart', function (e) { e.preventDefault(); });
  // iPhone: zwei schnelle Berührungen nicht als Doppeltipp-Zoom werten, auch außerhalb des Laufs (etwa direkt nach
  // dem Ende, wenn man noch tippt). Das CSS (touch-action) verhindert das meist schon; Knöpfe, Links und Felder
  // sind ausgenommen, die sollen normal reagieren.
  var letzteBeruehrung = 0;
  document.addEventListener('touchend', function (e) {
    var schnell = e.timeStamp - letzteBeruehrung < 450;
    letzteBeruehrung = e.timeStamp;
    var ziel = e.target;
    if (schnell && e.cancelable && !(ziel && ziel.closest && ziel.closest('button, a, input, label, select, textarea'))) e.preventDefault();
  }, { passive: false });

  /* =====================================================================
     Größe: Spielfeld im Seitenverhältnis 16:9 einpassen (Hoch- und Querformat)
     ===================================================================== */
  function groesseAnpassen() {
    var bw = window.innerWidth, bh = window.innerHeight;
    var quer = bw > bh && bh < 600;
    body.classList.toggle('quer', quer);
    var w, h;
    if (quer && bildschirm !== 'lauf') {
      w = Math.min(bw * 0.5, (bh - 16) * 16 / 9);
    } else if (quer) {
      w = Math.min(bw, (bh - 84) * 16 / 9);
    } else {
      var maxH = bildschirm === 'lauf' ? bh - 140 : bh * 0.45;
      w = Math.min(bw, 960, maxH * 16 / 9);
    }
    w = Math.max(160, Math.floor(w));
    h = Math.floor(w * 9 / 16);
    rahmen.style.width = w + 'px';
    rahmen.style.height = h + 'px';
  }
  window.addEventListener('resize', groesseAnpassen);
  window.addEventListener('orientationchange', function () { setTimeout(groesseAnpassen, 200); });

  /* =====================================================================
     Start
     ===================================================================== */
  grafikenBauen();
  groesseAnpassen();
  zeigeStart();

  // Schnittstelle für automatische Tests (liest nur aus)
  window.PflegeSprint = {
    diag: diag,
    zustand: function () {
      return {
        bildschirm: bildschirm, naechstes: sp.naechstes, vy: sp.vy, anzahl: sp.anzahl, zeit: sp.zeit, strecke: sp.strecke, v: sp.v, punkte: punkte(),
        y: sp.y, amBoden: sp.amBoden, duckt: sp.duckt, sparmodus: sparmodus, pausiert: pausiert
      };
    },
    tempo: tempoBei,
    // Nur für Tests: Hindernisse vor die Figur stellen (abstand = px zwischen Figur und
    // Hindernis-Anfang) und eine feste Eingabefolge abspielen ({ t, springen } / { t, ducken }).
    // Ergebnis: true, wenn die Figur nach „dauer“ Sekunden noch läuft.
    probe: function (sekunde, hindernisse, eingaben, dauer) {
      laufZuruecksetzen();
      sp.zeit = sekunde;
      sp.v = tempoBei(sekunde);
      sp.naechstes = 1e9;
      hindernisse.forEach(function (h, i) {
        var o = objekte[i];
        var x = SPIELER_X + 12 + h.abstand;
        if (h.art === 'loch') lochSetzen(o, x, h.breite);
        else if (h.art === 'lkw') lkwSetzen(o, x);
        else objektSetzen(o, h.art, x, h.art === 'schwarm', h.art === 'rollator' ? 2 : 1);
      });
      var e = eingaben.slice().sort(function (a, b) { return a.t - b.t; });
      var k = 0, start = sp.zeit, ok = true;
      for (var i = 0, n = Math.round(dauer / DT); i < n; i++) {
        while (k < e.length && e[k].t <= sp.zeit - start + 1e-9) {
          if (e[k].springen) { eingabe.springenNeu = true; eingabe.springen = false; }
          if (e[k].ducken !== undefined) eingabe.ducken = e[k].ducken;
          k++;
        }
        schritt();
        if (sp.aus) { ok = false; break; }
      }
      laufZuruecksetzen();
      return ok;
    },
    breite: function (art) { return bilder[art] ? bilder[art].width : 0; },
    muster: muster,
    // Nur für Tests: unverwundbar bis „bis“ Sekunden laufen und je Abschnitt zählen,
    // wie viele Hindernisse (davon Lkw, Löcher, Kombinationen) erzeugt werden
    ablauf: function (bis, abschnitt) {
      var war = TEST.unverwundbar;
      TEST.unverwundbar = true;
      laufZuruecksetzen();
      var aus = [], grenze = abschnitt;
      statistik = { hindernisse: 0, lkw: 0, loch: 0, kombi: 0 };
      while (sp.zeit < bis) {
        schritt();
        sp.aus = false;
        if (sp.zeit >= grenze) {
          aus.push({ bis: grenze, hindernisse: statistik.hindernisse, lkw: statistik.lkw, loch: statistik.loch, kombi: statistik.kombi });
          statistik = { hindernisse: 0, lkw: 0, loch: 0, kombi: 0 };
          grenze += abschnitt;
        }
      }
      TEST.unverwundbar = war;
      laufZuruecksetzen();
      return aus;
    },
    // Punkte nach so vielen Sekunden ohne Fehler
    punkteNach: function (sekunden) {
      var strecke = 0;
      for (var t = 0; t < sekunden; t += DT) strecke += tempoBei(t + DT) * DT;
      return Math.floor(strecke / PUNKTE_TEILER);
    }
  };
})();
