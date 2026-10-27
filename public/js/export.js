/*
 * Erzeugt eine echte Excel-Datei (.xlsx) ohne fremde Bibliothek:
 * ein ZIP-Archiv (unkomprimiert) mit den nötigen XML-Dateien.
 */

const CRC_TABELLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(bytes) {
  let c = 0xFFFFFFFF;
  for (let i = 0; i < bytes.length; i++) c = CRC_TABELLE[(c ^ bytes[i]) & 0xFF] ^ (c >>> 8);
  return (c ^ 0xFFFFFFFF) >>> 0;
}

function zip(dateien) {
  const enc = new TextEncoder();
  const teile = [];
  const verzeichnis = [];
  let versatz = 0;
  const jetzt = new Date();
  const zeit = (jetzt.getHours() << 11) | (jetzt.getMinutes() << 5) | (jetzt.getSeconds() >> 1);
  const datum = ((jetzt.getFullYear() - 1980) << 9) | ((jetzt.getMonth() + 1) << 5) | jetzt.getDate();
  for (const [name, inhalt] of dateien) {
    const n = enc.encode(name);
    const d = enc.encode(inhalt);
    const crc = crc32(d);
    const kopf = new DataView(new ArrayBuffer(30));
    kopf.setUint32(0, 0x04034b50, true);
    kopf.setUint16(4, 20, true);
    kopf.setUint16(6, 0x0800, true);
    kopf.setUint16(8, 0, true);
    kopf.setUint16(10, zeit, true);
    kopf.setUint16(12, datum, true);
    kopf.setUint32(14, crc, true);
    kopf.setUint32(18, d.length, true);
    kopf.setUint32(22, d.length, true);
    kopf.setUint16(26, n.length, true);
    kopf.setUint16(28, 0, true);
    teile.push(new Uint8Array(kopf.buffer), n, d);
    const zentral = new DataView(new ArrayBuffer(46));
    zentral.setUint32(0, 0x02014b50, true);
    zentral.setUint16(4, 20, true);
    zentral.setUint16(6, 20, true);
    zentral.setUint16(8, 0x0800, true);
    zentral.setUint16(10, 0, true);
    zentral.setUint16(12, zeit, true);
    zentral.setUint16(14, datum, true);
    zentral.setUint32(16, crc, true);
    zentral.setUint32(20, d.length, true);
    zentral.setUint32(24, d.length, true);
    zentral.setUint16(28, n.length, true);
    zentral.setUint32(42, versatz, true);
    verzeichnis.push(new Uint8Array(zentral.buffer), n);
    versatz += 30 + n.length + d.length;
  }
  const groesse = verzeichnis.reduce((s, x) => s + x.length, 0);
  const ende = new DataView(new ArrayBuffer(22));
  ende.setUint32(0, 0x06054b50, true);
  ende.setUint16(8, dateien.length, true);
  ende.setUint16(10, dateien.length, true);
  ende.setUint32(12, groesse, true);
  ende.setUint32(16, versatz, true);
  return new Blob([...teile, ...verzeichnis, new Uint8Array(ende.buffer)], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
}

function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function spalte(i) {
  let s = '';
  for (i++; i > 0; i = Math.floor((i - 1) / 26)) s = String.fromCharCode(65 + ((i - 1) % 26)) + s;
  return s;
}

// zeilen: Array von Arrays (erste Zeile = Überschriften, fett); breiten: Spaltenbreiten
export function xlsxErstellen(zeilen, blattName = 'Punktestand', breiten = []) {
  const xmlKopf = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n';
  const NS = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main';
  const daten = zeilen.map((zeile, r) => {
    const zellen = zeile.map((wert, c) => {
      const ref = spalte(c) + (r + 1);
      const stil = r === 0 ? ' s="1"' : '';
      if (typeof wert === 'number' && isFinite(wert)) return `<c r="${ref}"${stil}><v>${wert}</v></c>`;
      if (wert === null || wert === undefined || wert === '') return '';
      return `<c r="${ref}" t="inlineStr"${stil}><is><t xml:space="preserve">${esc(wert)}</t></is></c>`;
    }).join('');
    return `<row r="${r + 1}">${zellen}</row>`;
  }).join('');
  const cols = breiten.length
    ? '<cols>' + breiten.map((b, i) => `<col min="${i + 1}" max="${i + 1}" width="${b}" customWidth="1"/>`).join('') + '</cols>'
    : '';
  const blatt = `${xmlKopf}<worksheet xmlns="${NS}"><sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>${cols}<sheetData>${daten}</sheetData></worksheet>`;
  const stile = `${xmlKopf}<styleSheet xmlns="${NS}"><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts><fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/></cellXfs></styleSheet>`;
  const mappe = `${xmlKopf}<workbook xmlns="${NS}" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="${esc(blattName.slice(0, 31))}" sheetId="1" r:id="rId1"/></sheets></workbook>`;
  const mappeRels = `${xmlKopf}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`;
  const rels = `${xmlKopf}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`;
  const typen = `${xmlKopf}<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>`;
  return zip([
    ['[Content_Types].xml', typen],
    ['_rels/.rels', rels],
    ['xl/workbook.xml', mappe],
    ['xl/_rels/workbook.xml.rels', mappeRels],
    ['xl/styles.xml', stile],
    ['xl/worksheets/sheet1.xml', blatt],
  ]);
}
