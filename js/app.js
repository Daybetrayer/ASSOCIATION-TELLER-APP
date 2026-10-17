// Point d'entrée : démarrage, navigation, options globales
// Entry point: startup, navigation, global options

import * as storage from './storage.js';
import { showError } from './utils.js';
import * as caisse from './tab-caisse.js';
import * as articles from './tab-articles.js';
import * as stats from './tab-stats.js';
import * as config from './tab-config.js';

// Chaque onglet expose init(root, app) et render() / Each tab exposes init(root, app) and render()
const tabs = { caisse, articles, stats, config };

// Objet partagé donné aux onglets / Shared object handed to tabs
export const app = {
  settings: { ...storage.DEFAULT_SETTINGS },
  applySettings,
  refreshBadge, // met à jour le point d'alerte de sauvegarde / updates the backup alert dot
};

// Point rouge sur l'onglet Configuration si une sauvegarde est conseillée
// Red dot on the Settings tab when a backup is advisable
async function refreshBadge() {
  try {
    const reminder = await config.backupReminder(app.settings);
    document.querySelector('.tab-btn[data-tab="config"]').classList.toggle('needs-attention', Boolean(reminder));
  } catch (error) {
    console.warn('Badge de sauvegarde indisponible / unavailable', error); // non critique / not critical
  }
}

let currentTab = null;

// ---------- Réglages visuels / Visual settings ----------
function applySettings() {
  document.documentElement.dataset.theme = app.settings.theme;
  document.documentElement.dataset.size = app.settings.buttonSize;
}

// ---------- Navigation ----------
function showTab(name) {
  currentTab = name;
  document.querySelectorAll('.view').forEach((view) => { view.hidden = view.dataset.tab !== name; });
  document.querySelectorAll('.tab-btn').forEach((button) => button.classList.toggle('active', button.dataset.tab === name));
  updateWakeLock();
  refreshBadge();
  Promise.resolve(tabs[name].render()).catch((error) => showError('Erreur d\'affichage / Display error', error));
}

// ---------- Écran allumé sur la Caisse / Keep screen on in Caisse ----------
let wakeLock = null;
async function updateWakeLock() {
  try {
    if (!('wakeLock' in navigator)) return; // non supporté : on ignore / unsupported: ignore
    if (currentTab === 'caisse' && document.visibilityState === 'visible') {
      if (!wakeLock) {
        wakeLock = await navigator.wakeLock.request('screen');
        wakeLock.addEventListener('release', () => { wakeLock = null; });
      }
    } else if (wakeLock) {
      await wakeLock.release();
      wakeLock = null;
    }
  } catch (error) {
    console.warn('Wake Lock indisponible / unavailable', error); // non critique / not critical
  }
}
document.addEventListener('visibilitychange', updateWakeLock);

// ---------- Démarrage / Startup ----------
async function start() {
  try {
    await storage.openDatabase();
    // Demande de stockage persistant pour limiter l'effacement par le navigateur
    // Ask for persistent storage to limit browser eviction
    if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});
    await storage.seedIfFirstLaunch();
    app.settings = await storage.loadSettings();
    applySettings();
    for (const [name, tab] of Object.entries(tabs)) tab.init(document.getElementById(`view-${name}`), app);
    document.querySelectorAll('.tab-btn').forEach((button) => {
      button.addEventListener('click', () => showTab(button.dataset.tab));
    });
    showTab('caisse');
  } catch (error) {
    showError('Impossible d\'ouvrir le stockage local / Cannot open local storage', error);
  }
}

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('service-worker.js').catch((error) => showError('Mode hors ligne indisponible / Offline mode unavailable', error));
}

start();
