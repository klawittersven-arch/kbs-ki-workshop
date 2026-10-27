/*
 * Dynamische Wortwolke im Stil von Mentimeter.
 * Häufig genannte Begriffe werden größer und rücken in die Mitte; der häufigste steht
 * waagerecht im Zentrum. Etwa die Hälfte der übrigen Wörter ist um 90° gegen den
 * Uhrzeigersinn gedreht. Bei neuen Begriffen gleiten die vorhandenen an ihren neuen Platz.
 */

const FARBEN = ['#25434B', '#3F6C72', '#E8833A', '#C2416B', '#7B5EA7', '#2E9E5B', '#2B7BB9', '#B5523B'];
const SCHRIFT = '800 100px system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';

function streuwert(text) {
  let h = 2166136261;
  for (const c of text) { h ^= c.codePointAt(0); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

export class Wortwolke {
  constructor(feld, beiKlick) {
    this.feld = feld;
    this.beiKlick = beiKlick;
    this.woerter = new Map();   // schluessel → Element
    this.masse = new Map();     // schluessel|text → { b, h } bei 100 px Schriftgröße
    this.leinwand = document.createElement('canvas').getContext('2d');
    this.leer = document.createElement('div');
    this.leer.className = 'wolke-leer';
    this.leer.textContent = 'Die ersten Begriffe erscheinen hier …';
    feld.appendChild(this.leer);
  }

  messen(text) {
    let m = this.masse.get(text);
    if (!m) {
      this.leinwand.font = SCHRIFT;
      m = { b: this.leinwand.measureText(text).width, h: 100 };
      this.masse.set(text, m);
    }
    return m;
  }

  zeichnen(begriffe) {
    const liste = begriffe.slice().sort((a, b) => b.anzahl - a.anzahl);   // stabil: bei Gleichstand zuerst Genanntes zuerst
    this.leer.style.display = liste.length ? 'none' : '';
    const B = this.feld.clientWidth;
    const H = this.feld.clientHeight;
    const maxAnzahl = liste.length ? liste[0].anzahl : 1;

    // Grundgrößen: einmal Genanntes klein, das Häufigste groß
    const grund = liste.map((w, i) => {
      if (maxAnzahl === 1) return i === 0 ? 62 : 46;
      return 38 + (150 - 38) * Math.pow((w.anzahl - 1) / (maxAnzahl - 1), 0.75);
    });
    const senkrecht = liste.map((w, i) => i > 0 && streuwert(w.schluessel) % 2 === 1);

    let plaetze = null;
    for (let faktor = 1, versuch = 0; versuch < 14 && !plaetze; versuch++, faktor *= 0.88) {
      plaetze = this.anordnen(liste, grund.map(g => g * faktor), senkrecht, B, H);
    }
    if (!plaetze) plaetze = this.anordnen(liste, grund.map(g => g * 0.15), senkrecht, B, H, true);

    const sichtbar = new Set();
    liste.forEach((w, i) => {
      const p = plaetze[i];
      if (!p) return;
      sichtbar.add(w.schluessel);
      let el = this.woerter.get(w.schluessel);
      const neu = !el;
      if (neu) {
        el = document.createElement('div');
        el.className = 'wolke-wort neu';
        el.title = 'Klicken = Begriff ausblenden';
        el.addEventListener('click', () => this.beiKlick && this.beiKlick(w.schluessel));
        el.addEventListener('animationend', () => el.classList.remove('neu'));
        this.feld.appendChild(el);
        this.woerter.set(w.schluessel, el);
      }
      el.textContent = w.text;
      el.style.color = FARBEN[streuwert(w.schluessel) % FARBEN.length];
      el.style.fontSize = p.groesse.toFixed(1) + 'px';
      el.style.left = (p.x - p.b / 2).toFixed(1) + 'px';
      el.style.top = (p.y - p.h / 2).toFixed(1) + 'px';
      const dreh = p.senkrecht ? 'rotate(-90deg)' : 'rotate(0deg)';
      el.style.transform = dreh;
      el.style.setProperty('--dreh', dreh);
      if (neu) {
        // ohne Übergang an den ersten Platz setzen
        el.style.transition = 'none';
        void el.offsetWidth;
        el.style.transition = '';
      }
    });
    for (const [k, el] of this.woerter) {
      if (!sichtbar.has(k)) { el.remove(); this.woerter.delete(k); }
    }
  }

  // Spirale von der Mitte nach außen; liefert null, wenn nicht alles passt
  anordnen(liste, groessen, senkrecht, B, H, erzwingen = false) {
    const belegt = [];
    const ergebnis = [];
    const cx = B / 2, cy = H / 2;
    const seiten = B / H;
    for (let i = 0; i < liste.length; i++) {
      const m = this.messen(liste[i].text);
      const g = groessen[i];
      const b = m.b * g / 100;
      const h = g * 1.08;
      const s = senkrecht[i] && h < B && b < H * 0.95;
      const rb = s ? h : b;          // Platzbedarf nach dem Drehen
      const rh = s ? b : h;
      const luft = Math.max(4, g * 0.1);
      let gefunden = null;
      for (let t = 0; t < 600; t += 0.35) {
        const r = 2.2 * t;
        const x = cx + r * Math.cos(t) * seiten * 0.75;
        const y = cy + r * Math.sin(t);
        const k = { l: x - rb / 2 - luft, r: x + rb / 2 + luft, o: y - rh / 2 - luft, u: y + rh / 2 + luft };
        if (k.l < 0 || k.o < 0 || k.r > B || k.u > H) {
          if (r > Math.max(B, H)) break;
          continue;
        }
        if (belegt.some(a => k.l < a.r && k.r > a.l && k.o < a.u && k.u > a.o)) continue;
        gefunden = { x, y, b, h, groesse: g, senkrecht: s };
        belegt.push(k);
        break;
      }
      if (!gefunden && !erzwingen) return null;
      ergebnis.push(gefunden);
    }
    return ergebnis;
  }
}
