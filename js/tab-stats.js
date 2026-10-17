// Onglet Statistiques : indicateurs, graphique horaire, comparaison, ventes, exports
// Statistics tab: indicators, hourly chart, comparison, sales list, exports

import * as storage from './storage.js';
import {
  formatMoney, formatDecimal, formatTime, toCsv, downloadFile, toLocalDateString,
  el, makeButton, showError, showToast,
} from './utils.js';

const EVENT_TYPE_SUGGESTIONS = ['Tournoi', 'Fête', 'Vente de gâteaux', 'Assemblée', 'Repas', 'Spectacle'];
const WEATHER_OPTIONS = ['Soleil', 'Nuageux', 'Pluie', 'Orage', 'Vent', 'Neige'];
const MAX_LISTED_SALES = 200; // limite d'affichage de la liste / display limit for the list

let root;
let app;

// Sélection : une journée, toutes, ou une période / Selection: one day, all, or a period
let selection = { mode: 'day', dayId: null, from: '', to: '' };

// Données chargées / Loaded data
let days = [];
let sales = [];
let articleCategories = new Map(); // articleId -> catégorie (pour d'anciennes ventes) / for older sales

export function init(rootElement, sharedApp) {
  root = rootElement;
  app = sharedApp;
}

export async function render() {
  try {
    const today = await storage.getOrCreateToday();
    if (!selection.dayId) selection.dayId = today.id;
    days = (await storage.getAll('days')).sort((a, b) => b.date.localeCompare(a.date));
    sales = await storage.getAll('sales');
    articleCategories = new Map((await storage.getAll('articles')).map((article) => [article.id, article.category]));
    if (selection.mode === 'day' && !days.some((day) => day.id === selection.dayId)) selection.dayId = today.id;
    draw();
  } catch (error) {
    showError('Impossible de calculer les statistiques / Cannot compute statistics', error);
  }
}

// ---------- Sélection et calculs / Selection and computations ----------
const dayById = (dayId) => days.find((day) => day.id === dayId);
const money = (cents) => formatMoney(cents, app.settings.currency);
// Catégorie ACTUELLE de l'article (suit les réorganisations), sinon la copie gardée dans la vente (article supprimé)
// CURRENT category of the item (follows reorganisations), otherwise the copy kept in the sale (deleted item)
const categoryOf = (line) => articleCategories.get(line.articleId) || line.category || 'Inconnue';

function selectedDays() {
  if (selection.mode === 'day') return days.filter((day) => day.id === selection.dayId);
  if (selection.mode === 'range') {
    return days.filter((day) => (!selection.from || day.date >= selection.from) && (!selection.to || day.date <= selection.to));
  }
  return days;
}

function selectedSales() {
  const ids = new Set(selectedDays().map((day) => day.id));
  return sales.filter((sale) => ids.has(sale.dayId)).sort((a, b) => b.timestamp - a.timestamp);
}

const validSales = (list) => list.filter((sale) => !sale.cancelled);
const revenueOf = (list) => list.reduce((sum, sale) => sum + sale.totalCents, 0);

// Quantités et CA par article (ventes valides seulement) / Quantities and revenue per item (valid sales only)
function totalsByArticle(list) {
  const totals = new Map();
  for (const sale of validSales(list)) {
    for (const line of sale.lines) {
      const key = line.articleId || line.name;
      const entry = totals.get(key) || { name: line.name, category: categoryOf(line), qty: 0, qtyInMenus: 0, revenueCents: 0, isMenu: Boolean(line.isMenu) };
      entry.qty += line.qty;
      entry.revenueCents += line.qty * line.priceCents;
      totals.set(key, entry);
      // Un menu décompte aussi ses composants (quantités seulement : le CA reste sur le menu)
      // A menu also counts its components (quantities only: revenue stays on the menu)
      for (const component of line.isMenu ? line.components : []) {
        const componentKey = component.articleId || component.name;
        const componentEntry = totals.get(componentKey) || {
          name: component.name, category: categoryOf(component),
          qty: 0, qtyInMenus: 0, revenueCents: 0, isMenu: false,
        };
        componentEntry.qty += line.qty * component.qty;
        componentEntry.qtyInMenus += line.qty * component.qty;
        totals.set(componentKey, componentEntry);
      }
    }
  }
  return [...totals.values()].sort((a, b) => b.qty - a.qty);
}

function dayLabel(day) {
  const date = new Date(`${day.date}T12:00:00`).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' });
  return day.eventType ? `${date} – ${day.eventType}` : date;
}

// ---------- Affichage / Drawing ----------
function draw() {
  root.innerHTML = '';
  root.append(el('h2', '', 'Statistiques'));
  root.append(drawSelector());
  if (selection.mode === 'day' && dayById(selection.dayId)) root.append(drawDayForm(dayById(selection.dayId)));

  const list = selectedSales();
  root.append(drawKpis(list), drawPayments(list));
  const totals = totalsByArticle(list);
  root.append(drawArticleTable(totals), drawCategoryTable(totals), drawHourChart(list), drawComparison(), drawSalesList(list), drawExports(list, totals));
}

function section(title) {
  const box = el('div', 'stats-section');
  if (title) box.append(el('h3', '', title));
  return box;
}

function drawSelector() {
  const box = section('');
  const row = el('div', 'stats-row');

  const select = document.createElement('select');
  select.setAttribute('aria-label', 'Journée');
  days.forEach((day) => select.append(new Option(dayLabel(day), `day:${day.id}`)));
  select.append(new Option('Toutes les journées', 'all'), new Option('Période…', 'range'));
  select.value = selection.mode === 'day' ? `day:${selection.dayId}` : selection.mode;
  select.onchange = () => {
    if (select.value.startsWith('day:')) { selection.mode = 'day'; selection.dayId = select.value.slice(4); }
    else selection.mode = select.value;
    draw();
  };
  const label = el('label', '', 'Journée');
  label.append(select);
  row.append(label);

  if (selection.mode === 'range') {
    for (const [field, text] of [['from', 'Du'], ['to', 'Au']]) {
      const input = document.createElement('input');
      input.type = 'date';
      input.value = selection[field];
      input.onchange = () => { selection[field] = input.value; draw(); };
      const fieldLabel = el('label', '', text);
      fieldLabel.append(input);
      row.append(fieldLabel);
    }
  }
  box.append(row);
  return box;
}

// Type d'événement, météo, note de la journée / Event type, weather, note of the day
function drawDayForm(day) {
  const box = section('Cette journée');
  const row = el('div', 'stats-row');

  const typeInput = document.createElement('input');
  typeInput.setAttribute('list', 'event-type-list');
  typeInput.placeholder = 'ex. Tournoi';
  typeInput.value = day.eventType;
  const datalist = document.createElement('datalist');
  datalist.id = 'event-type-list';
  const knownTypes = new Set([...EVENT_TYPE_SUGGESTIONS, ...days.map((other) => other.eventType).filter(Boolean)]);
  knownTypes.forEach((type) => datalist.append(new Option(type)));

  const weatherSelect = document.createElement('select');
  weatherSelect.append(new Option('—', ''));
  WEATHER_OPTIONS.forEach((weather) => weatherSelect.append(new Option(weather, weather)));
  weatherSelect.value = day.weather;

  const noteInput = document.createElement('textarea');
  noteInput.rows = 2;
  noteInput.placeholder = 'Note libre';
  noteInput.value = day.note;

  // Enregistre à chaque modification terminée / Saves whenever an edit is finished
  const save = async () => {
    try {
      Object.assign(day, { eventType: typeInput.value.trim(), weather: weatherSelect.value, note: noteInput.value });
      await storage.putOne('days', day);
      showToast('Journée enregistrée');
    } catch (error) {
      showError('Journée non enregistrée / Day not saved', error);
    }
  };
  typeInput.onchange = async () => { await save(); draw(); };
  weatherSelect.onchange = save;
  noteInput.onchange = save;

  const labelled = (text, field) => { const label = el('label', '', text); label.append(field); return label; };
  row.append(labelled('Type d\'événement', typeInput), labelled('Météo', weatherSelect));
  const noteRow = el('div', 'stats-row');
  noteRow.append(labelled('Note', noteInput));
  box.append(row, datalist, noteRow);
  return box;
}

function drawKpis(list) {
  const valid = validSales(list);
  const revenue = revenueOf(valid);
  const average = valid.length ? Math.round(revenue / valid.length) : 0;
  const box = section('Indicateurs');
  const grid = el('div', 'kpis');
  for (const [label, value] of [['Chiffre d\'affaires', money(revenue)], ['Nombre de ventes', String(valid.length)], ['Panier moyen', money(average)]]) {
    const kpi = el('div', 'kpi');
    kpi.append(el('div', 'kpi-value', value), el('div', 'muted', label));
    grid.append(kpi);
  }
  box.append(grid);
  return box;
}

// Anciennes ventes sans champ paymentMethod = espèces / Older sales without paymentMethod = cash
const paymentOf = (sale) => sale.paymentMethod || 'cash';
const PAYMENT_LABELS = { cash: 'Espèces', card: '💳 Carte' };

function drawPayments(list) {
  const box = section('Paiements');
  const valid = validSales(list);
  if (!valid.length) { box.append(emptyMessage()); return box; }
  const rows = ['cash', 'card'].map((method) => {
    const ofMethod = valid.filter((sale) => paymentOf(sale) === method);
    return { label: PAYMENT_LABELS[method], count: ofMethod.length, revenue: revenueOf(ofMethod) };
  });
  box.append(buildTable([
    { label: 'Moyen de paiement', value: (row) => row.label },
    { label: 'Ventes', num: true, value: (row) => String(row.count) },
    { label: 'CA', num: true, value: (row) => money(row.revenue) },
  ], rows));
  return box;
}

// Tableau générique : columns = [{ label, num?, value(row) }] / Generic table
function buildTable(columns, rows, rowClass) {
  const wrap = el('div', 'table-wrap');
  const table = el('table', 'data-table');
  const headRow = document.createElement('tr');
  columns.forEach((column) => headRow.append(el('th', column.num ? 'num' : '', column.label)));
  const head = document.createElement('thead');
  head.append(headRow);
  const body = document.createElement('tbody');
  for (const row of rows) {
    const tr = document.createElement('tr');
    if (rowClass && rowClass(row)) tr.className = rowClass(row);
    columns.forEach((column) => {
      const cell = el('td', column.num ? 'num' : '');
      const value = column.value(row);
      if (value instanceof Node) cell.append(value); else cell.textContent = value;
      tr.append(cell);
    });
    body.append(tr);
  }
  table.append(head, body);
  wrap.append(table);
  return wrap;
}

function emptyMessage() { return el('p', 'muted', 'Aucune donnée pour cette sélection.'); }

function drawArticleTable(totals) {
  const box = section('Quantités vendues par article');
  if (!totals.length) { box.append(emptyMessage()); return box; }
  box.append(buildTable([
    { label: 'Article', value: (row) => (row.isMenu ? `${row.name} (menu)` : row.name) },
    { label: 'Quantité', num: true, value: (row) => String(row.qty) },
    { label: 'Dont en menu', num: true, value: (row) => (row.qtyInMenus ? String(row.qtyInMenus) : '') },
    { label: 'CA', num: true, value: (row) => money(row.revenueCents) },
  ], totals));
  box.append(el('p', 'muted', 'Les articles vendus en menu sont comptés dans leur quantité ; le chiffre d\'affaires est attribué au menu.'));
  return box;
}

function drawCategoryTable(totals) {
  const box = section('Répartition par catégorie');
  if (!totals.length) { box.append(emptyMessage()); return box; }
  const byCategory = new Map();
  for (const item of totals) {
    const entry = byCategory.get(item.category) || { category: item.category, qty: 0, revenueCents: 0 };
    entry.qty += item.qty;
    entry.revenueCents += item.revenueCents;
    byCategory.set(item.category, entry);
  }
  const rows = [...byCategory.values()].sort((a, b) => b.revenueCents - a.revenueCents);
  const totalRevenue = rows.reduce((sum, row) => sum + row.revenueCents, 0) || 1;
  box.append(buildTable([
    {
      label: 'Catégorie',
      value: (row) => {
        const cell = el('div', '', row.category);
        const bar = el('span', 'share-bar');
        bar.style.width = `${Math.round((row.revenueCents / totalRevenue) * 100)}%`;
        cell.append(bar);
        return cell;
      },
    },
    { label: 'Quantité', num: true, value: (row) => String(row.qty) },
    { label: 'CA', num: true, value: (row) => `${money(row.revenueCents)} (${Math.round((row.revenueCents / totalRevenue) * 100)} %)` },
  ], rows));
  return box;
}

// Graphique en barres SVG : nombre de ventes par heure / SVG bar chart: sales count per hour
function drawHourChart(list) {
  const box = section('Ventes par tranche horaire');
  const valid = validSales(list);
  if (!valid.length) { box.append(emptyMessage()); return box; }

  const countByHour = new Array(24).fill(0);
  const revenueByHour = new Array(24).fill(0);
  for (const sale of valid) {
    const hour = new Date(sale.timestamp).getHours();
    countByHour[hour] += 1;
    revenueByHour[hour] += sale.totalCents;
  }
  const hours = countByHour.map((count, hour) => (count ? hour : null)).filter((hour) => hour !== null);
  const firstHour = hours[0];
  const lastHour = hours[hours.length - 1];
  const maxCount = Math.max(...countByHour);

  const svgNamespace = 'http://www.w3.org/2000/svg';
  const barWidth = 40;
  const gap = 10;
  const chartHeight = 180;
  const slots = lastHour - firstHour + 1;
  const svg = document.createElementNS(svgNamespace, 'svg');
  svg.setAttribute('class', 'hour-chart');
  svg.setAttribute('viewBox', `0 0 ${slots * (barWidth + gap) + gap} ${chartHeight + 50}`);
  svg.setAttribute('role', 'img');
  svg.setAttribute('aria-label', 'Nombre de ventes par heure');

  const addText = (content, x, y) => {
    const text = document.createElementNS(svgNamespace, 'text');
    text.setAttribute('x', x);
    text.setAttribute('y', y);
    text.setAttribute('text-anchor', 'middle');
    text.textContent = content;
    svg.append(text);
  };
  for (let hour = firstHour; hour <= lastHour; hour++) {
    const slot = hour - firstHour;
    const x = gap + slot * (barWidth + gap);
    const height = Math.round((countByHour[hour] / maxCount) * chartHeight);
    const rect = document.createElementNS(svgNamespace, 'rect');
    rect.setAttribute('x', x);
    rect.setAttribute('y', 20 + chartHeight - height);
    rect.setAttribute('width', barWidth);
    rect.setAttribute('height', height);
    rect.setAttribute('rx', 4);
    const title = document.createElementNS(svgNamespace, 'title');
    title.textContent = `${hour} h : ${countByHour[hour]} vente(s), ${money(revenueByHour[hour])}`;
    rect.append(title);
    svg.append(rect);
    if (countByHour[hour]) addText(String(countByHour[hour]), x + barWidth / 2, 16 + chartHeight - height);
    addText(`${hour} h`, x + barWidth / 2, chartHeight + 40);
  }
  box.append(svg, el('p', 'muted', 'Nombre de ventes par heure.'));
  return box;
}

// Comparaison des journées de même type d'événement / Comparison of days with the same event type
function drawComparison() {
  const chosen = selection.mode === 'day' ? dayById(selection.dayId) : null;
  const box = section(chosen && chosen.eventType ? `Comparaison : ${chosen.eventType}` : 'Comparaison des journées');
  let rows = selectedDays();
  if (chosen && chosen.eventType) rows = days.filter((day) => day.eventType.toLowerCase() === chosen.eventType.toLowerCase());
  else if (chosen) box.append(el('p', 'muted', 'Renseignez un type d\'événement pour comparer avec les journées du même type.'));
  rows = rows.map((day) => {
    const valid = validSales(sales.filter((sale) => sale.dayId === day.id));
    const revenue = revenueOf(valid);
    return { day, count: valid.length, revenue, average: valid.length ? Math.round(revenue / valid.length) : 0 };
  }).sort((a, b) => a.day.eventType.localeCompare(b.day.eventType) || b.day.date.localeCompare(a.day.date));
  if (!rows.length) { box.append(emptyMessage()); return box; }
  box.append(buildTable([
    { label: 'Date', value: (row) => row.day.date },
    { label: 'Type', value: (row) => row.day.eventType || '—' },
    { label: 'Météo', value: (row) => row.day.weather || '—' },
    { label: 'CA', num: true, value: (row) => money(row.revenue) },
    { label: 'Ventes', num: true, value: (row) => String(row.count) },
    { label: 'Panier moyen', num: true, value: (row) => money(row.average) },
  ], rows));
  return box;
}

// Liste des ventes avec annulation / restauration / Sales list with cancel / restore
function drawSalesList(list) {
  const box = section('Ventes');
  if (!list.length) { box.append(emptyMessage()); return box; }
  const shown = list.slice(0, MAX_LISTED_SALES);
  if (list.length > shown.length) box.append(el('p', 'muted', `Les ${MAX_LISTED_SALES} ventes les plus récentes sur ${list.length}.`));
  box.append(buildTable([
    { label: 'Heure', value: (sale) => formatTime(sale.timestamp) },
    { label: 'Détail', value: (sale) => (paymentOf(sale) === 'card' ? '💳 ' : '') + sale.lines.map((line) => `${line.qty} × ${line.name}`).join(', ') + (sale.cancelled ? ' (annulée)' : '') },
    { label: 'Total', num: true, value: (sale) => money(sale.totalCents) },
    {
      label: '',
      value: (sale) => {
        const button = makeButton(sale.cancelled ? 'Restaurer' : 'Annuler', 'btn btn-small' + (sale.cancelled ? '' : ' btn-danger'));
        button.onclick = () => toggleCancelled(sale);
        return button;
      },
    },
  ], shown, (sale) => (sale.cancelled ? 'cancelled' : '')));
  return box;
}

async function toggleCancelled(sale) {
  const previous = sale.cancelled;
  try {
    sale.cancelled = !previous;
    await storage.putOne('sales', sale);
    draw();
  } catch (error) {
    sale.cancelled = previous;
    showError('Modification de la vente impossible / Sale update failed', error);
  }
}

// ---------- Exports ----------
function drawExports(list, totals) {
  const box = section('Exporter');
  const row = el('div', 'export-row');
  const detailed = makeButton('CSV des ventes détaillées', 'btn');
  detailed.onclick = () => runExport(() => exportDetailedCsv(list));
  const recap = makeButton('CSV récapitulatif par article', 'btn');
  recap.onclick = () => runExport(() => exportRecapCsv(totals));
  const json = makeButton('Export JSON complet', 'btn');
  json.onclick = () => runExport(exportJson);
  row.append(detailed, recap, json);
  box.append(row, el('p', 'muted', 'Les CSV portent sur la sélection ci-dessus. Le JSON contient toutes les données.'));
  return box;
}

function runExport(action) {
  Promise.resolve(action()).catch((error) => showError('Export impossible / Export failed', error));
}

function exportSuffix() {
  if (selection.mode === 'day') return dayById(selection.dayId)?.date || toLocalDateString();
  return selection.mode === 'range' ? `${selection.from || 'debut'}_${selection.to || 'fin'}` : 'toutes-journees';
}

// Une ligne par article vendu, y compris les ventes annulées (colonne dédiée)
// One row per sold item, including cancelled sales (dedicated column)
function exportDetailedCsv(list) {
  const rows = [['Date', 'Heure', 'Caisse', 'Événement', 'Météo', 'Article', 'Catégorie', 'Quantité', 'Prix unitaire', 'Total ligne', 'Vente annulée', 'Paiement', 'Menu parent']];
  for (const sale of [...list].sort((a, b) => a.timestamp - b.timestamp)) {
    const day = dayById(sale.dayId);
    for (const line of sale.lines) {
      rows.push([
        toLocalDateString(new Date(sale.timestamp)), formatTime(sale.timestamp), sale.registerName,
        day ? day.eventType : '', day ? day.weather : '', line.name, categoryOf(line), line.qty,
        formatDecimal(line.priceCents), formatDecimal(line.priceCents * line.qty), sale.cancelled ? 'oui' : 'non',
        paymentOf(sale) === 'card' ? 'carte' : 'espèces', '',
      ]);
      // Composants d'un menu : prix 0 (le prix est sur la ligne du menu), colonne « Menu parent » renseignée
      // Menu components: price 0 (the price is on the menu line), "Menu parent" column filled in
      for (const component of line.isMenu ? line.components : []) {
        rows.push([
          toLocalDateString(new Date(sale.timestamp)), formatTime(sale.timestamp), sale.registerName,
          day ? day.eventType : '', day ? day.weather : '', component.name,
          categoryOf(component), line.qty * component.qty,
          formatDecimal(0), formatDecimal(0), sale.cancelled ? 'oui' : 'non',
          paymentOf(sale) === 'card' ? 'carte' : 'espèces', line.name,
        ]);
      }
    }
  }
  downloadFile(`buvette-ventes-${exportSuffix()}.csv`, toCsv(rows), 'text/csv;charset=utf-8');
}

function exportRecapCsv(totals) {
  const rows = [['Article', 'Catégorie', 'Quantité vendue', 'Dont en menu', 'Chiffre d\'affaires']];
  totals.forEach((item) => rows.push([item.name, item.category, item.qty, item.qtyInMenus, formatDecimal(item.revenueCents)]));
  downloadFile(`buvette-recap-${exportSuffix()}.csv`, toCsv(rows), 'text/csv;charset=utf-8');
}

async function exportJson() {
  const data = await storage.exportAll();
  downloadFile(`buvette-export-${toLocalDateString()}.json`, JSON.stringify(data, null, 2), 'application/json');
}
