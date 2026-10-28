/*
 * Erzeugt die Europakarte für Demo 7 („Lernen mit … Grafiken“) als SVG-Pfade.
 * Quelle: Natural Earth (gemeinfrei), aufbereitet im npm-Paket „world-atlas“ (ISC-Lizenz).
 * Aufruf: cd werkzeuge && npm install && node europakarte.mjs
 * Ergebnis: public/js/grafik-europa.js (wird von Beamer und Handy geladen)
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { geoConicConformal, geoPath } from 'd3-geo';
import { feature } from 'topojson-client';

const B = 1000, H = 900;   // Größe der Karte (viewBox)
const welt = JSON.parse(readFileSync(new URL('./node_modules/world-atlas/countries-50m.json', import.meta.url)));
const laender = feature(welt, welt.objects.countries).features;

// Die Krim gehört völkerrechtlich zur Ukraine – in den Daten hängt sie an Russland
function alsMulti(g) { return g.type === 'Polygon' ? [g.coordinates] : g.coordinates; }
const russland = laender.find(f => f.id === '643');
const ukraine = laender.find(f => f.id === '804');
const istKrim = poly => {
  const ring = poly[0];
  const lon = ring.reduce((s, p) => s + p[0], 0) / ring.length;
  const lat = ring.reduce((s, p) => s + p[1], 0) / ring.length;
  return lon > 32 && lon < 37 && lat > 44 && lat < 46.3;
};
const ruPolys = alsMulti(russland.geometry);
const krim = ruPolys.filter(istKrim);
russland.geometry = { type: 'MultiPolygon', coordinates: ruPolys.filter(p => !istKrim(p)) };
ukraine.geometry = { type: 'MultiPolygon', coordinates: alsMulti(ukraine.geometry).concat(krim) };
console.log('Krim-Flächen zur Ukraine verschoben:', krim.length);

// ISO-Nummer → [Kürzel, deutscher Name]
const NAMEN = {
  '008': ['AL', 'Albanien'], '020': ['AD', 'Andorra'], '040': ['AT', 'Österreich'], '056': ['BE', 'Belgien'],
  '070': ['BA', 'Bosnien und Herzegowina'], '100': ['BG', 'Bulgarien'], '112': ['BY', 'Belarus'], '191': ['HR', 'Kroatien'],
  '196': ['CY', 'Zypern'], '203': ['CZ', 'Tschechien'], '208': ['DK', 'Dänemark'], '233': ['EE', 'Estland'],
  '246': ['FI', 'Finnland'], '250': ['FR', 'Frankreich'], '276': ['DE', 'Deutschland'], '300': ['GR', 'Griechenland'],
  '348': ['HU', 'Ungarn'], '352': ['IS', 'Island'], '372': ['IE', 'Irland'], '380': ['IT', 'Italien'],
  '428': ['LV', 'Lettland'], '438': ['LI', 'Liechtenstein'], '440': ['LT', 'Litauen'], '442': ['LU', 'Luxemburg'],
  '470': ['MT', 'Malta'], '498': ['MD', 'Moldau'], '492': ['MC', 'Monaco'], '499': ['ME', 'Montenegro'],
  '528': ['NL', 'Niederlande'], '807': ['MK', 'Nordmazedonien'], '578': ['NO', 'Norwegen'], '616': ['PL', 'Polen'],
  '620': ['PT', 'Portugal'], '642': ['RO', 'Rumänien'], '643': ['RU', 'Russland'], '674': ['SM', 'San Marino'],
  '688': ['RS', 'Serbien'], '703': ['SK', 'Slowakei'], '705': ['SI', 'Slowenien'], '724': ['ES', 'Spanien'],
  '752': ['SE', 'Schweden'], '756': ['CH', 'Schweiz'], '792': ['TR', 'Türkei'], '804': ['UA', 'Ukraine'],
  '826': ['GB', 'Vereinigtes Königreich'], '336': ['VA', 'Vatikanstadt'], '234': ['FO', 'Färöer'], '248': ['AX', 'Åland'],
  '833': ['IM', 'Isle of Man'], '832': ['JE', 'Jersey'], '831': ['GG', 'Guernsey'],
  '012': ['DZ', 'Algerien'], '504': ['MA', 'Marokko'], '788': ['TN', 'Tunesien'], '434': ['LY', 'Libyen'], '818': ['EG', 'Ägypten'],
  '760': ['SY', 'Syrien'], '368': ['IQ', 'Irak'], '364': ['IR', 'Iran'], '422': ['LB', 'Libanon'], '376': ['IL', 'Israel'],
  '400': ['JO', 'Jordanien'], '268': ['GE', 'Georgien'], '051': ['AM', 'Armenien'], '031': ['AZ', 'Aserbaidschan'],
  '398': ['KZ', 'Kasachstan'], '682': ['SA', 'Saudi-Arabien'], '275': ['PS', 'Palästinensische Gebiete'], '795': ['TM', 'Turkmenistan'],
  '304': ['GL', 'Grönland'], '732': ['EH', 'Westsahara'], '478': ['MR', 'Mauretanien'], '466': ['ML', 'Mali'], '562': ['NE', 'Niger'],
  '148': ['TD', 'Tschad'], '729': ['SD', 'Sudan'], '860': ['UZ', 'Usbekistan'],
};
const NACH_NAME = { Kosovo: ['XK', 'Kosovo'], 'N. Cyprus': ['CY-N', 'Nordzypern'], 'Cyprus U.N. Buffer Zone': null, Gibraltar: null };

// Ausschnitt: Portugal bis Türkei, Mittelmeer bis Nordkap
const projektion = geoConicConformal().rotate([-15, 0]).parallels([38, 64]);
const rahmen = {
  type: 'MultiPoint',
  coordinates: [[-10, 36], [-9, 43], [-10, 52], [44.8, 37], [44.8, 42], [42, 41], [15, 71], [28, 70.5], [-7, 58], [33, 35]],
};
projektion.fitExtent([[12, 12], [B - 12, H - 12]], rahmen);
projektion.clipExtent([[0, 0], [B, H]]);
const pfad = geoPath(projektion).digits(1);

const ergebnis = [];
const unbekannt = [];
for (const f of laender) {
  const d = pfad(f);
  if (!d) continue;
  const [[x0, y0], [x1, y1]] = pfad.bounds(f);
  if (x1 < 0 || y1 < 0 || x0 > B || y0 > H || (x1 - x0) * (y1 - y0) < 2) continue;
  const name = (f.properties && f.properties.name) || '';
  let eintrag = NAMEN[f.id] || (name in NACH_NAME ? NACH_NAME[name] : undefined);
  if (eintrag === null) continue;
  if (!eintrag) { unbekannt.push(f.id + ' ' + name); eintrag = [name, name]; }
  ergebnis.push({ id: eintrag[0], name: eintrag[1], d });
}
ergebnis.sort((a, b) => a.name.localeCompare(b.name, 'de'));

const ausgabe = `/* Europakarte für Demo 7 – automatisch erzeugt von werkzeuge/europakarte.mjs, nicht von Hand ändern.
 * Kartendaten: Natural Earth (gemeinfrei) über das npm-Paket „world-atlas“. */
export const EUROPA = {
  viewBox: '0 0 ${B} ${H}',
  laender: ${JSON.stringify(ergebnis, null, 0).replace(/\},\{/g, '},\n    {')},
};
`;
const ziel = fileURLToPath(new URL('../public/js/grafik-europa.js', import.meta.url));
writeFileSync(ziel, ausgabe);
console.log(`${ergebnis.length} Länder, ${(ausgabe.length / 1024).toFixed(0)} KB → ${ziel}`);
if (unbekannt.length) console.log('Ohne deutschen Namen:', unbekannt.join(', '));
