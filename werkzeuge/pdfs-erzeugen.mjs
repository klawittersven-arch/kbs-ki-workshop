/*
 * Erzeugt die PDFs zum Workshop aus den HTML-Quellen in werkzeuge/:
 *   handout.html          → public/material/Handout-KI-Workshop.pdf      (zum Austeilen zu Beginn)
 *   beispiel-prompt.html  → public/prompt/Beispiel-Prompt-KI-Workshop.pdf (Download auf der Folie „Und der Prompt …?“)
 * Aufruf (nutzt den Browser der Tests): cd tests && npm install && node ../werkzeuge/pdfs-erzeugen.mjs
 */
import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(new URL('../tests/package.json', import.meta.url));
const { chromium } = require('playwright');

const PDFS = [
  { quelle: 'handout.html', ziel: '../public/material/Handout-KI-Workshop.pdf', rand: '15mm', fuss: 'Handout · Workshop „Digitale Tools &amp; KI“ · Karoline-Breitinger-Schule' },
  { quelle: 'beispiel-prompt.html', ziel: '../public/prompt/Beispiel-Prompt-KI-Workshop.pdf', rand: '17mm', fuss: 'Der Prompt zur Stunde · Karoline-Breitinger-Schule · Workshop „Digitale Tools &amp; KI“' },
];

const browser = await chromium.launch();
for (const pdf of PDFS) {
  const ziel = fileURLToPath(new URL(pdf.ziel, import.meta.url));
  mkdirSync(dirname(ziel), { recursive: true });
  const seite = await browser.newPage();
  await seite.goto(new URL(pdf.quelle, import.meta.url).href, { waitUntil: 'networkidle' });
  await seite.pdf({
    path: ziel,
    format: 'A4',
    printBackground: true,
    preferCSSPageSize: true,
    displayHeaderFooter: true,
    headerTemplate: '<span></span>',
    footerTemplate: `<div style="width:100%; font-family: Inter, Arial, sans-serif; font-size:7.5pt; color:#5B6F74; padding:0 ${pdf.rand}; display:flex; justify-content:space-between;">
      <span>${pdf.fuss}</span><span>Seite <span class="pageNumber"></span> von <span class="totalPages"></span></span></div>`,
  });
  await seite.close();
  console.log('PDF erzeugt: ' + ziel);
}
await browser.close();
