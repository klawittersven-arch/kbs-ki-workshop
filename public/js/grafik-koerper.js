/*
 * Grafiken für Demo 7 – Schemazeichnungen („Lernen mit … Grafiken“): Oberkörper mit Organen und Skelett.
 * Vereinfacht, nicht anatomisch exakt. Jedes antippbare Teil trägt data-teil="…".
 * Ansicht von vorn: Die rechte Körperseite der Person ist links im Bild.
 */

// Unsichtbarer, breiterer Rand, damit schmale Teile auf dem Handy leichter zu treffen sind
const greif = (d, breite = 14) => `<path d="${d}" fill="none" stroke="transparent" stroke-width="${breite}" pointer-events="stroke"/>`;
const spiegel = d => d.replace(/(-?\d+(?:\.\d+)?) (-?\d+(?:\.\d+)?)/g, (_, x, y) => `${+(240 - x).toFixed(1)} ${y}`);

/* ---------- Oberkörper mit Organen ---------- */
const ARM = 'M 64 92 Q 44 96 38 128 L 30 222 Q 30 236 42 234 L 50 230 L 56 142 Q 60 120 70 112 Z';
const RUMPF = 'M 70 84 Q 120 72 170 84 L 182 98 Q 188 150 176 202 Q 170 244 178 292 Q 150 320 120 320 Q 90 320 62 292 Q 70 244 64 202 Q 52 150 58 98 Z';
const NIERE = 'M 79 228 Q 69 242 77 256 Q 85 266 93 258 Q 89 249 93 240 Q 91 224 79 228 Z';
const DICKDARM = 'M 92 300 L 88 254 Q 90 240 104 238 L 136 238 Q 150 240 152 254 L 148 300';

const koerperSvg = `
  <g class="haut">
    <path d="${ARM}" fill="#F1D6C4" stroke="#C9A48E" stroke-width="2"/>
    <path d="${spiegel(ARM)}" fill="#F1D6C4" stroke="#C9A48E" stroke-width="2"/>
    <rect x="107" y="58" width="26" height="24" rx="6" fill="#F1D6C4" stroke="#C9A48E" stroke-width="2"/>
    <path d="${RUMPF}" fill="#F6E1D3" stroke="#C9A48E" stroke-width="2"/>
    <circle cx="120" cy="38" r="28" fill="#F6E1D3" stroke="#C9A48E" stroke-width="2"/>
  </g>
  <g data-teil="gehirn"><ellipse cx="120" cy="33" rx="21" ry="16" fill="#EBB2BC" stroke="#B9707E" stroke-width="1.5"/>
    <path d="M 104 30 Q 110 24 116 31 Q 122 24 128 31 Q 134 24 138 32 M 106 40 Q 113 35 120 41 Q 127 35 134 40" fill="none" stroke="#B9707E" stroke-width="1.3"/></g>
  <g data-teil="darm">
    <path d="${DICKDARM}" fill="none" stroke="#D49A55" stroke-width="10" stroke-linecap="round" stroke-linejoin="round"/>
    <rect x="98" y="246" width="44" height="46" rx="14" fill="#EDC98A" stroke="#C99A55" stroke-width="1.5"/>
    <path d="M 104 256 Q 112 250 120 256 Q 128 262 136 256 M 104 268 Q 112 262 120 268 Q 128 274 136 268 M 104 280 Q 112 274 120 280 Q 128 286 136 280" fill="none" stroke="#C99A55" stroke-width="2"/>
  </g>
  <g data-teil="harnblase"><ellipse cx="120" cy="304" rx="15" ry="10" fill="#F2D86E" stroke="#C7A93A" stroke-width="1.5"/></g>
  <g data-teil="niere"><path d="${NIERE}" fill="#B9614A" stroke="#7E3A28" stroke-width="1.5"/>${greif(NIERE, 8)}</g>
  <g data-teil="niere"><path d="${spiegel(NIERE)}" fill="#B9614A" stroke="#7E3A28" stroke-width="1.5"/>${greif(spiegel(NIERE), 8)}</g>
  <g data-teil="lunge">
    <path d="M 113 100 Q 92 95 82 112 Q 70 142 75 182 Q 94 192 113 184 Z" fill="#F4AAA6" stroke="#C26C68" stroke-width="1.5"/>
    <path d="M 127 100 Q 148 95 158 112 Q 170 142 165 182 Q 152 188 140 184 Q 144 168 134 156 Z" fill="#F4AAA6" stroke="#C26C68" stroke-width="1.5"/>
  </g>
  <g data-teil="herz"><path d="M 129 147 C 136 136 156 138 154 156 C 152 170 140 178 130 188 C 121 179 109 170 108 157 C 107 141 124 138 129 147 Z" fill="#C8313B" stroke="#8C1F27" stroke-width="1.5"/></g>
  <g data-teil="leber"><path d="M 70 192 Q 104 180 142 190 Q 136 212 112 222 Q 84 230 72 216 Z" fill="#8E3B2F" stroke="#5E231B" stroke-width="1.5"/></g>
  <g data-teil="magen"><path d="M 140 192 Q 164 184 172 200 Q 178 220 162 232 Q 146 240 132 230 Q 140 222 150 214 Q 148 206 140 200 Z" fill="#E9A36B" stroke="#B3713A" stroke-width="1.5"/></g>
`;

/* ---------- Skelett ---------- */
const KNOCHEN = '#F5F0E4', KONTUR = '#8E8A7E';
const linie = (d, breite) => `<path d="${d}" fill="none" stroke="${KONTUR}" stroke-width="${breite + 3}" stroke-linecap="round"/><path d="${d}" fill="none" stroke="${KNOCHEN}" stroke-width="${breite}" stroke-linecap="round"/>`;
const beidseitig = (teil, d, breite, greifBreite = 14) =>
  `<g data-teil="${teil}">${linie(d, breite)}${greif(d, greifBreite)}${linie(spiegel(d), breite)}${greif(spiegel(d), greifBreite)}</g>`;

let wirbel = '';
for (let i = 0, y = 74; i < 17; i++, y += 10.5) wirbel += `<rect x="113" y="${y.toFixed(1)}" width="14" height="8.5" rx="3" fill="${KNOCHEN}" stroke="${KONTUR}" stroke-width="1.5"/>`;
let rippen = '';
for (let i = 0; i < 8; i++) {
  const y = 104 + i * 11;
  const d = `M 116 ${y} Q ${86 - i} ${y - 6} ${70 + i * 1.5} ${y + 12 + i}`;
  rippen += linie(d, 3.5) + greif(d, 8) + linie(spiegel(d), 3.5) + greif(spiegel(d), 8);
}

const skelettSvg = `
  <g data-teil="costa">${rippen}</g>
  <g data-teil="wirbelsaeule">${wirbel}<rect x="111" y="72" width="18" height="182" fill="transparent"/></g>
  <g data-teil="brustbein"><rect x="114" y="96" width="12" height="58" rx="5" fill="${KNOCHEN}" stroke="${KONTUR}" stroke-width="1.5"/></g>
  ${beidseitig('clavicula', 'M 115 92 Q 96 84 70 90', 5.5, 16)}
  ${beidseitig('oberarmknochen', 'M 66 98 L 52 180', 9)}
  <g data-teil="unterarm">${linie('M 50 186 L 38 262', 5)}${linie('M 56 188 L 50 262', 4.5)}${greif('M 53 187 L 44 262', 18)}
    ${linie(spiegel('M 50 186 L 38 262'), 5)}${linie(spiegel('M 56 188 L 50 262'), 4.5)}${greif(spiegel('M 53 187 L 44 262'), 18)}</g>
  <g data-teil="becken"><path d="M 84 254 Q 120 240 156 254 Q 170 278 150 294 Q 136 288 120 302 Q 104 288 90 294 Q 70 278 84 254 Z" fill="${KNOCHEN}" stroke="${KONTUR}" stroke-width="2"/>
    <ellipse cx="102" cy="280" rx="7" ry="5" fill="#E8EEF0" stroke="${KONTUR}" stroke-width="1.2"/><ellipse cx="138" cy="280" rx="7" ry="5" fill="#E8EEF0" stroke="${KONTUR}" stroke-width="1.2"/></g>
  ${beidseitig('femur', 'M 98 298 L 90 384', 11)}
  <g data-teil="patella"><circle cx="90" cy="394" r="6.5" fill="${KNOCHEN}" stroke="${KONTUR}" stroke-width="1.5"/><circle cx="150" cy="394" r="6.5" fill="${KNOCHEN}" stroke="${KONTUR}" stroke-width="1.5"/></g>
  <g data-teil="unterschenkel">${linie('M 88 404 L 87 430', 8)}${linie(spiegel('M 88 404 L 87 430'), 8)}</g>
  <g data-teil="schaedel"><path d="M 120 8 C 147 8 153 30 151 45 C 149 57 141 62 137 70 L 103 70 C 99 62 91 57 89 45 C 87 30 93 8 120 8 Z" fill="${KNOCHEN}" stroke="${KONTUR}" stroke-width="2"/>
    <ellipse cx="109" cy="40" rx="7" ry="6" fill="#5B5A55"/><ellipse cx="131" cy="40" rx="7" ry="6" fill="#5B5A55"/>
    <path d="M 120 46 L 116 55 L 124 55 Z" fill="#5B5A55"/><path d="M 108 63 L 132 63" stroke="#8E8A7E" stroke-width="2"/></g>
`;

export const KOERPER = { viewBox: '0 0 240 326', svg: koerperSvg };
export const SKELETT = { viewBox: '0 0 240 426', svg: skelettSvg };

// Namen aller antippbaren Teile (für „Daneben – das ist …“)
export const TEILE = {
  gehirn: 'das Gehirn', lunge: 'die Lunge', herz: 'das Herz', leber: 'die Leber', magen: 'der Magen',
  niere: 'eine Niere', darm: 'der Darm', harnblase: 'die Harnblase',
  schaedel: 'der Schädel', wirbelsaeule: 'die Wirbelsäule', costa: 'eine Rippe (Costa)', brustbein: 'das Brustbein',
  clavicula: 'das Schlüsselbein (Clavicula)', oberarmknochen: 'der Oberarmknochen', unterarm: 'Elle und Speiche (Unterarm)',
  becken: 'das Becken', femur: 'der Oberschenkelknochen (Femur)', patella: 'die Kniescheibe (Patella)', unterschenkel: 'der Unterschenkel',
};

// Europakarte (Daten aus grafik-europa.js) als SVG-Inhalt; jedes Land ist antippbar
export function europaSvg(E) {
  return '<rect class="meer" width="1000" height="900"/>' + E.laender.map(l => `<path class="land" data-teil="${l.id}" d="${l.d}"/>`).join('');
}
