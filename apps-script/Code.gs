/**
 * Dresy – příjem objednávek do Google tabulky.
 * Vložte do Google tabulky: Rozšíření → Apps Script, uložte a nasaďte jako webovou aplikaci
 * (Spustit jako: Já, Přístup: Kdokoli).
 */
const SPREADSHEET_ID = ''; // prázdné = tabulka, ke které je skript připojen; u samostatného skriptu vložte ID tabulky
const SHEET_NAME = 'Objednavky';
const HEADERS = ['Kód', 'Čas', 'Objednává', 'Kontakt', 'Číslo', 'Jméno', 'Typ', 'Velikost dresu', 'Velikost kraťasů', 'Cena (Kč)', 'Poznámka'];

function sheet_() {
  const ss = SPREADSHEET_ID ? SpreadsheetApp.openById(SPREADSHEET_ID) : SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(SHEET_NAME);
  if (!sh) {
    sh = ss.insertSheet(SHEET_NAME);
    sh.appendRow(HEADERS);
    sh.setFrozenRows(1);
  }
  return sh;
}

function readOrders_(excludeCode) {
  const values = sheet_().getDataRange().getValues();
  const out = [];
  for (let i = 1; i < values.length; i++) {
    const r = values[i];
    if (r[4] === '' || r[4] === null) continue;
    if (excludeCode && String(r[0]) === excludeCode) continue;
    out.push({ num: Number(r[4]), name: String(r[5] || ''), type: String(r[6] || ''), sj: String(r[7] || ''), ss: String(r[8] || '') });
  }
  return out; // kontakty a jména objednávajících se nikdy neposílají ven
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function doGet() {
  return json_({ ok: true, orders: readOrders_() });
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const d = JSON.parse(e.postData.contents);
    if (!d || !Array.isArray(d.items) || !d.items.length || d.items.length > 20) throw new Error('Neplatná objednávka');
    const code = String(d.code || '');
    const replace = !!d.replace && code !== '';
    const taken = new Set(readOrders_(replace ? code : '').map(function (o) { return o.num; }));
    const seen = {};
    const clash = [];
    d.items.forEach(function (it) {
      const n = Number(it.num);
      if (!Number.isInteger(n) || n < 0 || n > 99) throw new Error('Neplatné číslo');
      if (taken.has(n) || seen[n]) clash.push(n);
      seen[n] = true;
    });
    if (clash.length) return json_({ ok: false, taken: clash });

    const sh = sheet_();
    if (replace) {
      // úprava už uložené objednávky: smažeme staré řádky se stejným kódem a zapíšeme nové
      const vals = sh.getDataRange().getValues();
      const rows = [];
      for (let i = 1; i < vals.length; i++) if (String(vals[i][0]) === code) rows.push(i + 1);
      if (!rows.length) return json_({ ok: false, error: 'Objednávka s tímto kódem nebyla nalezena' });
      for (let k = rows.length - 1; k >= 0; k--) sh.deleteRow(rows[k]);
    }
    const now = new Date();
    d.items.forEach(function (it) {
      sh.appendRow([
        String(d.code || ''), now, String(d.who || '').slice(0, 80), String(d.contact || '').slice(0, 80),
        Number(it.num), String(it.name || '').toUpperCase().slice(0, 14), String(it.type || ''),
        String(it.sj || ''), String(it.ss || ''), Number(it.price) || '', replace ? 'upraveno' : ''
      ]);
    });
    return json_({ ok: true, code: d.code });
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  } finally {
    lock.releaseLock();
  }
}
