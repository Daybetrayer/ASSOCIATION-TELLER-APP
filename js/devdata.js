// Jeu de données de test pour vérifier les statistiques (mode développeur de la Configuration)
// Test dataset to check statistics (developer mode in Settings)
// Les journées et ventes créées portent isTestData: true, on peut donc les retirer sans toucher aux vraies données.
// Created days and sales carry isTestData: true, so they can be removed without touching real data.

import * as storage from './storage.js';
import { newId, toLocalDateString } from './utils.js';

// [décalage en jours, type d'événement, affluence] / [days ago, event type, busyness]
const TEST_DAYS = [
  [7, 'Tournoi', 60],
  [14, 'Fête', 80],
  [21, 'Vente de gâteaux', 25],
  [28, 'Tournoi', 40],
  [35, 'Fête', 95],
  [42, 'Tournoi', 50],
];

// Générateur pseudo-aléatoire fixe : les résultats sont identiques à chaque chargement
// Fixed pseudo-random generator: results are identical on every load
function makeRandom(seed) {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
}

export async function loadTestData() {
  const articles = (await storage.getAll('articles')).filter((article) => article.active);
  if (articles.length === 0) throw new Error('Aucun article actif pour générer des ventes / No active item to generate sales');
  const random = makeRandom(42);
  const pick = (list) => list[Math.floor(random() * list.length)];
  const days = [];
  const sales = [];

  for (const [daysAgo, eventType, busyness] of TEST_DAYS) {
    const date = new Date();
    date.setDate(date.getDate() - daysAgo);
    const day = { id: newId(), date: toLocalDateString(date), eventType, note: 'Données de test', isTestData: true };
    days.push(day);
    for (let index = 0; index < busyness; index++) {
      // Heures entre 9 h et 17 h, plus de monde vers 12 h et 15 h / Hours 9–17, busier around 12 and 15
      const hour = random() < 0.5 ? 11 + Math.floor(random() * 3) : 9 + Math.floor(random() * 9);
      const saleTime = new Date(date.getFullYear(), date.getMonth(), date.getDate(), hour, Math.floor(random() * 60), Math.floor(random() * 60));
      const lines = [];
      for (let lineIndex = 0, lineCount = 1 + Math.floor(random() * 3); lineIndex < lineCount; lineIndex++) {
        const article = pick(articles);
        const existing = lines.find((line) => line.articleId === article.id);
        if (existing) { existing.qty += 1; continue; }
        lines.push({ articleId: article.id, name: article.name, priceCents: article.priceCents, category: article.category, qty: 1 + Math.floor(random() * 2) });
      }
      sales.push({
        id: newId(),
        timestamp: saleTime.getTime(),
        lines,
        totalCents: lines.reduce((sum, line) => sum + line.priceCents * line.qty, 0),
        registerName: 'Caisse 1',
        paymentMethod: random() < 0.4 ? 'card' : 'cash', // environ 40 % par carte / about 40% by card
        dayId: day.id,
        cancelled: random() < 0.03,
        isTestData: true,
      });
    }
  }
  await storage.putMany('days', days);
  await storage.putMany('sales', sales);
  return { days: days.length, sales: sales.length };
}

export async function removeTestData() {
  const days = (await storage.getAll('days')).filter((day) => day.isTestData);
  const sales = (await storage.getAll('sales')).filter((sale) => sale.isTestData);
  await storage.deleteMany('sales', sales.map((sale) => sale.id));
  await storage.deleteMany('days', days.map((day) => day.id));
  return { days: days.length, sales: sales.length };
}
