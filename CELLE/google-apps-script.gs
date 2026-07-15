/**
 * GOOGLE APPS SCRIPT - Gestione Pedane Grattugiato
 * 
 * ISTRUZIONI:
 * 1. Apri il tuo progetto Google Apps Script collegato al foglio Google Sheets
 * 2. Sostituisci o aggiorna il codice con questo file
 * 3. Crea i fogli: Prodotti, Giacenze, Lock, Dispositivi, Log (se non esistono)
 * 4. Rideploya la Web App (Deploy > New deployment > Web app)
 * 
 * Struttura fogli:
 * - Prodotti: id | nome
 * - Giacenze: idProdotto | prodottoNome | lotto | scadenza | quantita
 * - Lock: user | timestamp
 * - Dispositivi: deviceId | ultimoAccesso
 * - Log: id | timestamp | deviceId | azione | dettaglio
 */

const SPREADSHEET_ID = SpreadsheetApp.getActiveSpreadsheet().getId();
const PASSWORD_LOG = "030184";

function getSheet(name) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    if (name === "Prodotti") sheet.appendRow(["id", "nome"]);
    if (name === "Giacenze") sheet.appendRow(["idProdotto", "prodottoNome", "lotto", "scadenza", "quantita"]);
    if (name === "Lock") sheet.appendRow(["user", "timestamp"]);
    if (name === "Dispositivi") sheet.appendRow(["deviceId", "ultimoAccesso"]);
    if (name === "Log") sheet.appendRow(["id", "timestamp", "deviceId", "azione", "dettaglio"]);
  }
  return sheet;
}

function doGet(e) {
  if (e && e.parameter && e.parameter.page === "log") {
    return getLogData();
  }
  return getDatiCompleti();
}

function doPost(e) {
  const body = JSON.parse(e.postData.contents);

  if (body.action === "lock") return jsonResponse(handleLock(body.user));
  if (body.action === "unlock") return jsonResponse(handleUnlock(body.user));
  if (body.action === "syncProdotti") return jsonResponse(handleSyncProdotti(body.lista));
  if (body.action === "logEvent") return jsonResponse(handleLogEvent(body.event));
  if (body.action === "registerDevice") return jsonResponse(handleRegisterDevice(body.deviceId));
  if (body.action === "updateLog") return jsonResponse(handleUpdateLog(body));

  return jsonResponse(handleSyncGiacenze(body));
}

function jsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function getDatiCompleti() {
  const prodottiSheet = getSheet("Prodotti");
  const giacenzeSheet = getSheet("Giacenze");

  const prodottiData = prodottiSheet.getDataRange().getValues();
  const giacenzeData = giacenzeSheet.getDataRange().getValues();

  const prodotti = prodottiData.slice(1).map(r => ({ id: r[0], nome: r[1] }));
  const giacenze = giacenzeData.slice(1).map(r => ({
    idProdotto: r[0],
    prodottoNome: r[1],
    lotto: r[2],
    scadenza: r[3] instanceof Date ? formatDate(r[3]) : r[3],
    quantita: r[4]
  }));

  return jsonResponse({ prodotti: prodotti, giacenze: giacenze });
}

function getLogData() {
  const dispSheet = getSheet("Dispositivi");
  const logSheet = getSheet("Log");

  const dispositivi = dispSheet.getDataRange().getValues();
  const log = logSheet.getDataRange().getValues();

  return jsonResponse({ dispositivi: dispositivi, log: log });
}

function handleSyncGiacenze(dati) {
  const sheet = getSheet("Giacenze");
  sheet.clearContents();
  sheet.appendRow(["idProdotto", "prodottoNome", "lotto", "scadenza", "quantita"]);

  if (Array.isArray(dati)) {
    dati.forEach(item => {
      sheet.appendRow([
        item.idProdotto,
        item.prodottoNome,
        item.lotto,
        item.scadenza,
        item.quantita
      ]);
    });
  }
  return { success: true };
}

function handleSyncProdotti(lista) {
  const sheet = getSheet("Prodotti");
  sheet.clearContents();
  sheet.appendRow(["id", "nome"]);
  if (Array.isArray(lista)) {
    lista.forEach(p => sheet.appendRow([p.id, p.nome]));
  }
  return { success: true };
}

function handleLock(user) {
  const sheet = getSheet("Lock");
  const data = sheet.getDataRange().getValues();

  if (data.length > 1) {
    const lockedBy = data[1][0];
    const timestamp = data[1][1];
    const lockAge = new Date() - new Date(timestamp);
    if (lockedBy && lockedBy !== user && lockAge < 30 * 60 * 1000) {
      return { success: false, lockedBy: lockedBy };
    }
  }

  sheet.clearContents();
  sheet.appendRow(["user", "timestamp"]);
  sheet.appendRow([user, new Date().toISOString()]);
  return { success: true };
}

function handleUnlock(user) {
  const sheet = getSheet("Lock");
  const data = sheet.getDataRange().getValues();
  if (data.length > 1 && data[1][0] === user) {
    sheet.clearContents();
    sheet.appendRow(["user", "timestamp"]);
  }
  return { success: true };
}

function handleRegisterDevice(deviceId) {
  const sheet = getSheet("Dispositivi");
  const data = sheet.getDataRange().getValues();
  const now = new Date().toISOString();

  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === deviceId) {
      sheet.getRange(i + 1, 2).setValue(now);
      return { success: true };
    }
  }
  sheet.appendRow([deviceId, now]);
  return { success: true };
}

function handleLogEvent(event) {
  const sheet = getSheet("Log");
  const data = sheet.getDataRange().getValues();
  let nextId = 1;
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] >= nextId) nextId = data[i][0] + 1;
  }

  sheet.appendRow([
    nextId,
    event.timestamp || new Date().toISOString(),
    event.deviceId,
    event.azione,
    event.dettaglio || ""
  ]);
  return { success: true, id: nextId };
}

function handleUpdateLog(body) {
  if (body.password !== PASSWORD_LOG) {
    return { success: false, message: "Password non valida." };
  }

  const sheet = getSheet("Log");
  const data = sheet.getDataRange().getValues();
  const targetId = parseInt(body.id);

  for (let i = 1; i < data.length; i++) {
    if (parseInt(data[i][0]) === targetId) {
      sheet.getRange(i + 1, 4).setValue(body.azione);
      sheet.getRange(i + 1, 5).setValue(body.dettaglio || "");
      return { success: true };
    }
  }
  return { success: false, message: "Evento non trovato." };
}

function formatDate(d) {
  const anno = d.getFullYear();
  const mese = String(d.getMonth() + 1).padStart(2, '0');
  const giorno = String(d.getDate()).padStart(2, '0');
  return anno + "-" + mese + "-" + giorno;
}
