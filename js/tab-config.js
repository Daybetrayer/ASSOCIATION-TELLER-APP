// Onglet Configuration : sauvegarde/restauration, réglages, stockage, effacement
// Settings tab: backup/restore, settings, storage, erase

import * as storage from './storage.js';
import * as devdata from './devdata.js';
import { el, makeButton, showError, showToast, confirmDialog, formDialog, downloadFile, toLocalDateString } from './utils.js';

const AUTO_BACKUP_FILE_NAME = 'buvette-sauvegarde-auto.json';
const AUTO_BACKUP_DELAY_MS = 3000;

let root;
let app;
let autoBackupTimer = null;
let folderPermissionLost = false; // affiché dans la page / shown in the page

export function init(rootElement, sharedApp) {
  root = rootElement;
  app = sharedApp;
}

export async function render() {
  try {
    const reminder = await backupReminder(app.settings);
    const dirRow = await storage.getOne('settings', 'backupDirHandle');
    const estimate = navigator.storage && navigator.storage.estimate ? await navigator.storage.estimate() : null;
    const persisted = navigator.storage && navigator.storage.persisted ? await navigator.storage.persisted() : null;
    draw({ reminder, folderHandle: dirRow ? dirRow.value : null, estimate, persisted });
    app.refreshBadge();
  } catch (error) {
    showError('Impossible d\'afficher la configuration / Cannot show settings', error);
  }
}

// ---------- Rappel de sauvegarde / Backup reminder ----------
// Renvoie un message, ou null si tout va bien / Returns a message, or null if all is fine
export async function backupReminder(settings) {
  const sales = await storage.getAll('sales');
  if (sales.length === 0) return null;
  const lastBackup = settings.lastBackupAt;
  if (!lastBackup) return 'Aucune sauvegarde n\'a encore été faite. Pensez à sauvegarder !';
  const ageDays = (Date.now() - lastBackup) / 86400000;
  if (ageDays > settings.backupReminderDays) return `Dernière sauvegarde il y a plus de ${settings.backupReminderDays} jours.`;
  const latestSale = Math.max(...sales.map((sale) => sale.timestamp));
  if (latestSale > lastBackup) return 'Des ventes ont été faites depuis la dernière sauvegarde.';
  return null;
}

// ---------- Sauvegarde dans un dossier (ordinateur) / Folder backup (desktop) ----------
// Appelée après chaque vente ; écrit après un court délai / Called after each sale; writes after a short delay
export function scheduleAutoBackup() {
  clearTimeout(autoBackupTimer);
  autoBackupTimer = setTimeout(runAutoBackup, AUTO_BACKUP_DELAY_MS);
}

async function runAutoBackup() {
  try {
    const row = await storage.getOne('settings', 'backupDirHandle');
    if (!row) return; // option non activée / option not enabled
    if ((await row.value.queryPermission({ mode: 'readwrite' })) !== 'granted') {
      folderPermissionLost = true; // à renouveler dans la Configuration / renew in Settings
      return;
    }
    folderPermissionLost = false;
    const fileHandle = await row.value.getFileHandle(AUTO_BACKUP_FILE_NAME, { create: true });
    const writable = await fileHandle.createWritable();
    await writable.write(JSON.stringify(await storage.exportAll(), null, 2));
    await writable.close();
    await markBackupDone();
  } catch (error) {
    showError('Sauvegarde automatique impossible / Auto-backup failed', error);
  }
}

async function markBackupDone() {
  app.settings.lastBackupAt = Date.now();
  await storage.saveSetting('lastBackupAt', app.settings.lastBackupAt);
  app.refreshBadge();
}

// ---------- Affichage / Drawing ----------
function section(title) {
  const box = el('div', 'config-section');
  box.append(el('h3', '', title));
  return box;
}

function labelled(text, field) {
  const label = el('label', '', text);
  label.append(field);
  return label;
}

// Mode développeur caché : 7 appuis rapides sur le titre / Hidden developer mode: 7 quick taps on the title
const DEV_TAPS_NEEDED = 7;
let devModeVisible = false;
let devTapCount = 0;
let devTapTimer = null;

function drawDevMode() {
  const box = section('Mode développeur');
  box.append(el('p', 'muted', 'Génère 6 journées de ventes fictives (Tournoi, Fête, Vente de gâteaux) pour tester les statistiques. Elles sont repérées et peuvent être supprimées sans toucher aux vraies données.'));
  const row = el('div', 'export-row');
  const load = makeButton('Charger les données de test', 'btn');
  const remove = makeButton('Supprimer les données de test', 'btn btn-danger');
  const run = (action, doneMessage) => async () => {
    try {
      const result = await action();
      showToast(`${doneMessage} (${result.days} journées, ${result.sales} ventes)`);
      render();
    } catch (error) { showError('Mode développeur : échec / failed', error); }
  };
  load.onclick = run(devdata.loadTestData, 'Données de test ajoutées');
  remove.onclick = run(devdata.removeTestData, 'Données de test supprimées');
  row.append(load, remove);
  box.append(row);
  return box;
}

function draw({ reminder, folderHandle, estimate, persisted }) {
  root.innerHTML = '';
  const title = el('h2', '', 'Configuration');
  title.onclick = () => {
    devTapCount += 1;
    clearTimeout(devTapTimer);
    devTapTimer = setTimeout(() => { devTapCount = 0; }, 2000);
    if (devTapCount >= DEV_TAPS_NEEDED) { devModeVisible = true; devTapCount = 0; render(); }
  };
  root.append(title);
  if (reminder) root.append(el('div', 'reminder-banner', `⚠️ ${reminder}`));
  root.append(drawWhereIsData(), drawBackup(folderHandle), drawSettings(), drawStorageState(estimate, persisted), drawErase());
  if (devModeVisible) root.append(drawDevMode());
}

function drawWhereIsData() {
  const box = section('Où sont mes données ?');
  box.append(
    el('p', '', 'Vos articles et vos ventes sont enregistrés dans le navigateur de cet appareil (stockage interne IndexedDB). Rien n\'est envoyé sur internet.'),
    el('p', '', 'Si vous désinstallez l\'application, videz les données du navigateur ou changez d\'appareil, ces données peuvent être perdues. Faites donc des sauvegardes régulières : le fichier de sauvegarde se trouve dans le dossier Téléchargements de la tablette, ou chez le destinataire si vous le partagez (Drive, e-mail…).'),
  );
  return box;
}

function drawBackup(folderHandle) {
  const box = section('Sauvegarde et restauration');
  const last = app.settings.lastBackupAt;
  box.append(el('p', '', last ? `Dernière sauvegarde : ${new Date(last).toLocaleString('fr-FR')}` : 'Dernière sauvegarde : jamais'));

  const row = el('div', 'export-row');
  const saveButton = makeButton('Sauvegarder maintenant', 'btn btn-primary');
  saveButton.onclick = saveBackupFile;
  row.append(saveButton);

  // Partage : seulement si le navigateur sait partager des fichiers / Share: only if files can be shared
  const probeFile = new File(['{}'], 'test.json', { type: 'application/json' });
  if (navigator.canShare && navigator.canShare({ files: [probeFile] })) {
    const shareButton = makeButton('Partager la sauvegarde', 'btn');
    shareButton.onclick = shareBackup;
    row.append(shareButton);
  }

  const fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.accept = 'application/json,.json';
  fileInput.hidden = true;
  fileInput.onchange = () => { if (fileInput.files[0]) restoreFromFile(fileInput.files[0]); fileInput.value = ''; };
  const restoreButton = makeButton('Restaurer une sauvegarde', 'btn');
  restoreButton.onclick = () => fileInput.click();
  row.append(restoreButton, fileInput);
  box.append(row);

  box.append(drawFolderOption(folderHandle));
  return box;
}

// Option « dossier automatique » : n'existe que si le navigateur propose le sélecteur de dossier
// "Automatic folder" option: only exists if the browser offers the folder picker
function drawFolderOption(folderHandle) {
  const wrap = el('div', '');
  wrap.append(el('h3', '', 'Dossier de sauvegarde automatique'));
  if (!('showDirectoryPicker' in window)) {
    wrap.append(el('p', 'muted', 'Cette option n\'est pas disponible sur cet appareil (Chrome pour Android ne permet pas de choisir un dossier). À la place, la sauvegarde se fait par téléchargement dans le dossier Téléchargements, et par partage si votre appareil le permet.'));
    return wrap;
  }
  if (folderHandle) {
    wrap.append(el('p', '', `Dossier choisi : ${folderHandle.name}. Une copie « ${AUTO_BACKUP_FILE_NAME} » y est écrite après chaque vente.`));
    if (folderPermissionLost) wrap.append(el('p', 'form-error', 'L\'autorisation d\'écrire dans ce dossier est à renouveler.'));
    const renew = makeButton('Autoriser / tester maintenant', 'btn');
    renew.onclick = async () => {
      try {
        if ((await folderHandle.requestPermission({ mode: 'readwrite' })) === 'granted') { folderPermissionLost = false; await runAutoBackup(); render(); }
      } catch (error) { showError('Autorisation impossible / Permission failed', error); }
    };
    const stop = makeButton('Désactiver', 'btn btn-danger');
    stop.onclick = async () => {
      try { await storage.deleteOne('settings', 'backupDirHandle'); render(); } catch (error) { showError('Désactivation impossible / Failed', error); }
    };
    const row = el('div', 'export-row');
    row.append(renew, stop);
    wrap.append(row);
  } else {
    wrap.append(el('p', 'muted', 'Sur ordinateur, vous pouvez choisir un dossier : la sauvegarde y sera écrite automatiquement.'));
    const choose = makeButton('Choisir un dossier', 'btn');
    choose.onclick = async () => {
      try {
        const handle = await window.showDirectoryPicker({ mode: 'readwrite' });
        await storage.putOne('settings', { key: 'backupDirHandle', value: handle });
        await runAutoBackup();
        render();
      } catch (error) {
        if (error.name !== 'AbortError') showError('Choix du dossier impossible / Folder choice failed', error);
      }
    };
    wrap.append(choose);
  }
  return wrap;
}

// ---------- Actions de sauvegarde / Backup actions ----------
function backupFileName() { return `buvette-sauvegarde-${toLocalDateString()}.json`; }

async function saveBackupFile() {
  try {
    const data = await storage.exportAll();
    downloadFile(backupFileName(), JSON.stringify(data, null, 2), 'application/json');
    await markBackupDone();
    showToast('Sauvegarde téléchargée');
    render();
  } catch (error) {
    showError('Sauvegarde impossible / Backup failed', error);
  }
}

async function shareBackup() {
  try {
    const data = await storage.exportAll();
    const file = new File([JSON.stringify(data, null, 2)], backupFileName(), { type: 'application/json' });
    await navigator.share({ files: [file], title: 'Sauvegarde buvette' });
    await markBackupDone();
    render();
  } catch (error) {
    if (error.name !== 'AbortError') showError('Partage impossible / Share failed', error); // AbortError = l'utilisateur a annulé
  }
}

async function restoreFromFile(file) {
  try {
    const data = JSON.parse(await file.text());
    storage.validateBackup(data);
    // Choix remplacer / fusionner / Choose replace / merge
    let mode = 'merge';
    const modeSelect = document.createElement('select');
    modeSelect.append(new Option('Fusionner (ajouter aux données actuelles)', 'merge'), new Option('Remplacer (efface les données actuelles)', 'replace'));
    const confirmed = await formDialog('Restaurer une sauvegarde', (body) => {
      body.append(
        el('p', '', `Fichier : ${file.name} (${data.sales.length} ventes, ${data.articles.length} articles).`),
        labelled('Mode', modeSelect),
        el('p', 'muted', 'Conseil : sauvegardez d\'abord les données actuelles.'),
      );
    }, () => '', 'Restaurer');
    if (!confirmed) return;
    mode = modeSelect.value;
    if (mode === 'replace' && !(await confirmDialog('Remplacer TOUTES les données actuelles par celles du fichier ?', { confirmLabel: 'Remplacer', danger: true }))) return;
    await storage.importAll(data, mode);
    app.settings = await storage.loadSettings();
    app.applySettings();
    showToast('Sauvegarde restaurée');
    render();
  } catch (error) {
    showError('Restauration impossible, rien n\'a été modifié / Restore failed, nothing changed', error);
  }
}

// ---------- Réglages / Settings ----------
function drawSettings() {
  const box = section('Réglages');
  const addTextSetting = (label, key, extra) => {
    const input = document.createElement('input');
    input.value = app.settings[key] ?? '';
    if (extra) Object.assign(input, extra);
    input.onchange = () => saveSetting(key, extra && extra.type === 'number' ? Number(input.value) || 1 : input.value.trim());
    box.append(labelled(label, input));
  };
  const addChoiceSetting = (label, key, options) => {
    const select = document.createElement('select');
    options.forEach(([value, text]) => select.append(new Option(text, value)));
    select.value = app.settings[key];
    select.onchange = () => saveSetting(key, select.value);
    box.append(labelled(label, select));
  };
  addTextSetting('Nom de la caisse (pour distinguer plusieurs tablettes)', 'registerName');
  addTextSetting('Nom de l\'association', 'associationName');
  addTextSetting('Devise', 'currency');
  addChoiceSetting('Taille des boutons', 'buttonSize', [['small', 'Petits'], ['normal', 'Normaux'], ['large', 'Grands']]);
  addChoiceSetting('Thème', 'theme', [['light', 'Clair'], ['dark', 'Sombre']]);
  addTextSetting('Rappel de sauvegarde après (jours)', 'backupReminderDays', { type: 'number', min: 1 });
  return box;
}

async function saveSetting(key, value) {
  try {
    if (key === 'registerName' && !value) value = storage.DEFAULT_SETTINGS.registerName;
    if (key === 'currency' && !value) value = storage.DEFAULT_SETTINGS.currency;
    app.settings[key] = value;
    await storage.saveSetting(key, value);
    app.applySettings();
    showToast('Réglage enregistré');
  } catch (error) {
    showError('Réglage non enregistré / Setting not saved', error);
  }
}

// ---------- État du stockage / Storage state ----------
function drawStorageState(estimate, persisted) {
  const box = section('État du stockage');
  const persistedText = persisted === null ? 'inconnu' : persisted ? 'oui' : 'non (le navigateur pourrait effacer les données s\'il manque de place)';
  box.append(el('p', '', `Stockage protégé contre l'effacement : ${persistedText}`));
  if (estimate) {
    box.append(el('p', '', `Espace utilisé : ${(estimate.usage / 1024).toFixed(0)} Ko sur ${(estimate.quota / 1048576).toFixed(0)} Mo disponibles`));
  }
  if (persisted === false && navigator.storage.persist) {
    const ask = makeButton('Demander la protection', 'btn');
    ask.onclick = async () => {
      try {
        const granted = await navigator.storage.persist();
        showToast(granted ? 'Protection accordée' : 'Protection refusée par le navigateur');
        render();
      } catch (error) { showError('Demande impossible / Request failed', error); }
    };
    box.append(ask);
  }
  return box;
}

// ---------- Effacer tout / Erase everything ----------
function drawErase() {
  const box = section('Zone dangereuse');
  const button = makeButton('Effacer toutes les données', 'btn btn-danger');
  button.onclick = eraseEverything;
  box.append(el('p', '', 'Supprime tous les articles, ventes et journées de cet appareil. Les articles d\'exemple seront recréés.'), button);
  return box;
}

async function eraseEverything() {
  if (!(await confirmDialog('Avez-vous fait une sauvegarde récente ? Toutes les données de cet appareil vont être effacées.', { confirmLabel: 'Continuer', danger: true }))) return;
  if (!(await confirmDialog('DERNIÈRE CONFIRMATION : effacer définitivement toutes les données ?', { confirmLabel: 'Tout effacer', danger: true }))) return;
  try {
    await storage.clearAllData();
    location.reload();
  } catch (error) {
    showError('Effacement impossible / Erase failed', error);
  }
}
