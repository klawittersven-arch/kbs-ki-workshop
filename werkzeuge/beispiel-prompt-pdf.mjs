/*
 * Erzeugt das PDF „Beispiel-Prompt“ aus werkzeuge/beispiel-prompt.html.
 * Die Handys können es auf der Folie „Und der Prompt für diese ganze Stunde?“ herunterladen.
 * Aufruf (nutzt den Browser der Tests): cd tests && npm install && node ../werkzeuge/beispiel-prompt-pdf.mjs
 * Ergebnis: public/prompt/Beispiel-Prompt-KI-Workshop.pdf
 */
import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const require = createRequire(new URL('../tests/package.json', import.meta.url));
const { chromium } = require('playwright');

const quelle = new URL('./beispiel-prompt.html', import.meta.url).href;
const ziel = fileURLToPath(new URL('../public/prompt/Beispiel-Prompt-KI-Workshop.pdf', import.meta.url));
mkdirSync(fileURLToPath(new URL('../public/prompt/', import.meta.url)), { recursive: true });

const browser = await chromium.launch();
const seite = await browser.newPage();
await seite.goto(quelle, { waitUntil: 'networkidle' });
await seite.pdf({
  path: ziel,
  format: 'A4',
  printBackground: true,
  preferCSSPageSize: true,
  displayHeaderFooter: true,
  headerTemplate: '<span></span>',
  footerTemplate: `<div style="width:100%; font-family: Inter, Arial, sans-serif; font-size:7.5pt; color:#5B6F74; padding:0 17mm; display:flex; justify-content:space-between;">
    <span>Der Prompt zur Stunde · Karoline-Breitinger-Schule · Workshop „Digitale Tools &amp; KI“</span>
    <span>Seite <span class="pageNumber"></span> von <span class="totalPages"></span></span></div>`,
});
await browser.close();
console.log('PDF erzeugt: ' + ziel);
