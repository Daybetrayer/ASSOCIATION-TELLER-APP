// Couche de stockage IndexedDB / IndexedDB storage layer
// Toutes les données vivent ici, sur l'appareil. / All data lives here, on the device.

import { newId, toLocalDateString } from './utils.js';

const DB_NAME = 'buvette';
const DB_VERSION = 1;
let database = null;

// Réglages par défaut / Default settings
export const DEFAULT_SETTINGS = {
  registerName: 'Caisse 1',
  associationName: '',
  currency: '€',
  buttonSize: 'normal', // small | normal | large
  theme: 'light',       // light | dark
  lastBackupAt: null,
  backupReminderDays: 7,
};

// ---------- Ouverture / Opening ----------
export function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      db.createObjectStore('articles', { keyPath: 'id' });
      db.createObjectStore('categories', { keyPath: 'id' });
      db.createObjectStore('days', { keyPath: 'id' });
      const sales = db.createObjectStore('sales', { keyPath: 'id' });
      sales.createIndex('dayId', 'dayId');
      sales.createIndex('timestamp', 'timestamp');
      db.createObjectStore('settings', { keyPath: 'key' });
    };
    request.onsuccess = () => { database = request.result; resolve(database); };
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error('Base de données bloquée / Database blocked'));
  });
}

// ---------- Opérations génériques / Generic operations ----------
function runRequest(storeName, mode, action) {
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(storeName, mode);
    const request = action(transaction.objectStore(storeName));
    // On attend la fin de la transaction = données réellement écrites
    // Wait for transaction complete = data really written
    transaction.oncomplete = () => resolve(request ? request.result : undefined);
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error || new Error('Transaction annulée / aborted'));
  });
}

export const getAll = (storeName) => runRequest(storeName, 'readonly', (store) => store.getAll());
export const getOne = (storeName, key) => runRequest(storeName, 'readonly', (store) => store.get(key));
export const putOne = (storeName, value) => runRequest(storeName, 'readwrite', (store) => store.put(value));
export const deleteOne = (storeName, key) => runRequest(storeName, 'readwrite', (store) => store.delete(key));
// Écrit / supprime plusieurs éléments dans UNE transaction (rapide, tout ou rien)
// Writes / deletes several entries in ONE transaction (fast, all or nothing)
export const putMany = (storeName, rows) => runRequest(storeName, 'readwrite', (store) => { rows.forEach((row) => store.put(row)); });
export const deleteMany = (storeName, keys) => runRequest(storeName, 'readwrite', (store) => { keys.forEach((key) => store.delete(key)); });
export const clearStore =(storeName) => runRequest(storeName, 'readwrite', (store) => store.clear());

// ---------- Réglages / Settings ----------
export async function loadSettings() {
  const rows = await getAll('settings');
  const settings = { ...DEFAULT_SETTINGS };
  for (const row of rows) settings[row.key] = row.value;
  return settings;
}
export const saveSetting = (key, value) => putOne('settings', { key, value });

// ---------- Données d'exemple au premier lancement / Sample data on first launch ----------
export async function seedIfFirstLaunch() {
  const alreadySeeded = await getOne('settings', 'seeded');
  if (alreadySeeded) return;
  const categories = ['Boissons', 'Nourriture'].map((name, index) => ({ id: newId(), name, order: index }));
  const [drinks, food] = categories.map((category) => category.name);
  // [nom, prix en centimes, catégorie, couleur] / [name, price in cents, category, color]
  const samples = [
    ['Eau', 100, drinks, '#2563eb'],
    ['Soda', 150, drinks, '#dc2626'],
    ['Café', 100, drinks, '#78350f'],
    ['Bière', 250, drinks, '#b45309'],
    ['Hot dog', 300, food, '#c2410c'],
    ['Cake salé', 200, food, '#4d7c0f'],
    ['Cookie', 100, food, '#7c3aed'],
  ];
  for (const category of categories) await putOne('categories', category);
  for (let index = 0; index < samples.length; index++) {
    const [name, priceCents, category, color] = samples[index];
    await putOne('articles', { id: newId(), name, priceCents, category, color, active: true, order: index });
  }
  await saveSetting('seeded', true);
}

// ---------- Export / import complets / Full export and import ----------
const ALL_STORES = ['articles', 'categories', 'days', 'sales', 'settings'];
// Réglages propres à cet appareil : jamais exportés ni écrasés par une restauration
// Device-specific settings: never exported nor overwritten by a restore
const DEVICE_SETTING_KEYS = ['backupDirHandle', 'lastBackupAt'];

// Le réglage « seeded » est inclus pour ne pas ré-injecter les exemples après restauration
// The "seeded" flag is included so samples are not re-added after a restore
export async function exportAll() {
  const settings = (await getAll('settings')).filter((row) => !DEVICE_SETTING_KEYS.includes(row.key));
  return {
    app: 'buvette',
    version: 1,
    exportedAt: new Date().toISOString(),
    articles: await getAll('articles'),
    categories: await getAll('categories'),
    days: await getAll('days'),
    sales: await getAll('sales'),
    settings,
  };
}

// Plusieurs écritures dans UNE transaction : tout ou rien / Several writes in ONE transaction: all or nothing
function writeInOneTransaction(storeNames, work) {
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(storeNames, 'readwrite');
    work(transaction);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error || new Error('Transaction annulée / aborted'));
  });
}

// Vérifie qu'un fichier ressemble bien à une sauvegarde / Checks a file looks like a backup
export function validateBackup(data) {
  const valid = data && data.app === 'buvette' && ['articles', 'categories', 'days', 'sales', 'settings'].every((key) => Array.isArray(data[key]));
  if (!valid) throw new Error('Ce fichier n\'est pas une sauvegarde de la buvette / Not a valid backup file');
}

// mode : 'replace' (remplace tout) ou 'merge' (ajoute à l'existant)
// mode: 'replace' (replace everything) or 'merge' (add to existing data)
export async function importAll(data, mode) {
  validateBackup(data);
  const keptDeviceSettings = (await getAll('settings')).filter((row) => DEVICE_SETTING_KEYS.includes(row.key));
  const incomingSettings = data.settings.filter((row) => !DEVICE_SETTING_KEYS.includes(row.key));

  if (mode === 'replace') {
    await writeInOneTransaction(ALL_STORES, (transaction) => {
      for (const name of ALL_STORES) transaction.objectStore(name).clear();
      for (const name of ['articles', 'categories', 'days', 'sales']) data[name].forEach((row) => transaction.objectStore(name).put(row));
      [...incomingSettings, ...keptDeviceSettings].forEach((row) => transaction.objectStore('settings').put(row));
    });
    return;
  }

  // Fusion : deux tablettes créent chacune leurs propres articles/catégories/journées d'exemple avec des
  // identifiants différents. On rapproche par nom / date pour éviter les doublons.
  // Merge: two tablets each create their own sample items/categories/days with different ids.
  // We match by name / date to avoid duplicates.
  const local = {
    articles: await getAll('articles'), categories: await getAll('categories'),
    days: await getAll('days'), settings: await getAll('settings'),
  };
  const sameText = (a, b) => String(a).trim().toLowerCase() === String(b).trim().toLowerCase();

  const newCategories = data.categories.filter((category) => !local.categories.some((other) => sameText(other.name, category.name)));
  const articleIdMap = new Map(); // id du fichier -> id local / file id -> local id
  const newArticles = [];
  for (const article of data.articles) {
    const match = local.articles.find((other) => sameText(other.name, article.name) && sameText(other.category, article.category));
    if (match) articleIdMap.set(article.id, match.id); else newArticles.push(article);
  }
  const dayIdMap = new Map();
  const updatedDays = []; // journées locales complétées / local days filled in
  const newDays = [];
  for (const day of data.days) {
    const match = local.days.find((other) => other.date === day.date);
    if (match) {
      dayIdMap.set(day.id, match.id);
      const filled = { ...match };
      for (const field of ['eventType', 'weather', 'note']) if (!filled[field] && day[field]) filled[field] = day[field];
      updatedDays.push(filled);
    } else newDays.push(day);
  }
  const remapId = (id) => articleIdMap.get(id) || id;
  // Les menus nouveaux pointent vers des articles : on remappe aussi leurs composants
  // New menus point to items: remap their components too
  newArticles.forEach((article) => {
    if (article.isMenu) article.components = article.components.map((component) => ({ ...component, articleId: remapId(component.articleId) }));
  });
  const incomingSales = data.sales.map((sale) => ({
    ...sale,
    dayId: dayIdMap.get(sale.dayId) || sale.dayId,
    lines: sale.lines.map((line) => ({
      ...line,
      articleId: remapId(line.articleId),
      ...(line.isMenu ? { components: line.components.map((component) => ({ ...component, articleId: remapId(component.articleId) })) } : {}),
    })),
  }));
  const newSettings = incomingSettings.filter((row) => !local.settings.some((other) => other.key === row.key));

  await writeInOneTransaction(ALL_STORES, (transaction) => {
    newCategories.forEach((row) => transaction.objectStore('categories').put(row));
    newArticles.forEach((row) => transaction.objectStore('articles').put(row));
    [...updatedDays, ...newDays].forEach((row) => transaction.objectStore('days').put(row));
    incomingSales.forEach((row) => transaction.objectStore('sales').put(row));
    newSettings.forEach((row) => transaction.objectStore('settings').put(row));
  });
}

// Efface tout (les articles d'exemple reviendront au prochain démarrage)
// Erases everything (sample items come back at next startup)
export function clearAllData() {
  return writeInOneTransaction(ALL_STORES, (transaction) => {
    for (const name of ALL_STORES) transaction.objectStore(name).clear();
  });
}

// ---------- Journées / Days ----------
// Renvoie la journée d'aujourd'hui, la crée si besoin / Returns today's day, creates it if needed
export async function getOrCreateToday() {
  const today = toLocalDateString();
  const days = await getAll('days');
  const existing = days.find((day) => day.date === today);
  if (existing) return existing;
  const day = { id: newId(), date: today, eventType: '', weather: '', note: '' };
  await putOne('days', day);
  return day;
}

// ---------- Ventes / Sales ----------
export function getSalesOfDay(dayId) {
  return new Promise((resolve, reject) => {
    const transaction = database.transaction('sales', 'readonly');
    const request = transaction.objectStore('sales').index('dayId').getAll(dayId);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
