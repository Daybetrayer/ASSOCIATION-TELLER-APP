// Onglet Caisse : boutons d'articles, panier, total, monnaie, validation
// Caisse tab: item buttons, cart, total, change, validation

import * as storage from './storage.js';
import { scheduleAutoBackup } from './tab-config.js';
import { iconMarkup, CARD_ICON_SVG } from './icons.js';
import { formatMoney, parseEurosToCents, newId, el, makeButton, showError, showToast, confirmDialog } from './utils.js';

let root;
let app;

// État de l'écran / Screen state
let articles = [];       // articles actifs / active items
let articleById = new Map(); // tous les articles, même masqués (composants de menus) / all items, even hidden (menu components)
let categories = [];
let paymentMethod = 'cash'; // 'cash' (espèces) ou 'card' (carte SumUp) / cash or card
let selectedCategory = 'all';
let cart = [];           // lignes : { articleId, name, priceCents, qty } / lines
let today = null;        // journée en cours / current day
let daySales = [];       // ventes de la journée / sales of the day

// Éléments mis à jour souvent / Frequently updated elements
let filtersBox, itemsGrid, cartLinesBox, totalAmount, givenInput, changeResult, validateButton, clearButton, undoButton, counter, cardButton;
const quickCashButtons = [];

const QUICK_CASH_EUROS = [5, 10, 20, 50];

export function init(rootElement, sharedApp) {
  root = rootElement;
  app = sharedApp;
  buildLayout();
}

// Construit la structure une seule fois / Builds the structure once
function buildLayout() {
  root.innerHTML = '';
  const layout = el('div', 'caisse');

  // --- Colonne articles / Items column ---
  const itemsColumn = el('div', 'caisse-items');
  filtersBox = el('div', 'category-filters');
  itemsGrid = el('div', 'items-scroll'); // zone qui défile, contient une grille par catégorie / scrolling area
  itemsColumn.append(filtersBox, itemsGrid);

  // --- Panier / Cart ---
  const cartBox = el('div', 'cart');
  cartLinesBox = el('div', 'cart-lines');

  const totalRow = el('div', 'cart-total');
  totalRow.append(el('span', 'muted', 'Total à encaisser'));
  totalAmount = el('span', 'total-amount', '');
  totalRow.append(totalAmount);

  const changeBox = el('div', 'change-box');
  const quickCash = el('div', 'quick-cash');
  for (const euros of QUICK_CASH_EUROS) {
    const button = makeButton(`${euros} €`, `btn btn-bill bill-${euros}`); // billet coloré / coloured banknote
    button.onclick = () => { givenInput.value = String(euros); renderChange(); };
    quickCashButtons.push(button);
    quickCash.append(button);
  }
  // Paiement par carte bancaire (terminal SumUp) : pas de monnaie à rendre
  // Card payment (SumUp terminal): no change to give back
  cardButton = makeButton('', 'btn btn-card');
  cardButton.innerHTML = `${CARD_ICON_SVG}<span>Carte</span>`; // SVG fixe venant de icons.js / fixed SVG from icons.js
  cardButton.setAttribute('aria-pressed', 'false');
  cardButton.onclick = () => { paymentMethod = paymentMethod === 'card' ? 'cash' : 'card'; applyPaymentMode(); };
  quickCash.append(cardButton);
  const changeRow = el('div', 'change-row');
  givenInput = document.createElement('input');
  givenInput.type = 'text';
  givenInput.inputMode = 'decimal';
  givenInput.placeholder = 'Donné par le client';
  givenInput.setAttribute('aria-label', 'Donné par le client');
  givenInput.oninput = renderChange;
  changeResult = el('span', 'change-result', '');
  changeRow.append(givenInput, changeResult);
  changeBox.append(quickCash, changeRow);

  const actions = el('div', 'cart-actions');
  validateButton = makeButton('Valider la vente', 'btn btn-success btn-validate');
  validateButton.onclick = validateSale;
  clearButton = makeButton('Vider le panier', 'btn btn-danger');
  clearButton.onclick = clearCart;
  undoButton = makeButton('Annuler la dernière vente', 'btn');
  undoButton.onclick = cancelLastSale;
  actions.append(validateButton, clearButton, undoButton);

  counter = el('div', 'day-counter', '');
  cartBox.append(cartLinesBox, totalRow, changeBox, actions, counter);

  layout.append(itemsColumn, cartBox);
  root.append(layout);
}

// Appelé à chaque affichage de l'onglet / Called each time the tab is shown
export async function render() {
  try {
    const [allArticles, allCategories] = await Promise.all([storage.getAll('articles'), storage.getAll('categories')]);
    articles = allArticles.filter((article) => article.active).sort((a, b) => a.order - b.order);
    articleById = new Map(allArticles.map((article) => [article.id, article]));
    categories = allCategories.sort((a, b) => a.order - b.order);
    today = await storage.getOrCreateToday();
    daySales = await storage.getSalesOfDay(today.id);
    if (selectedCategory !== 'all' && !categories.some((category) => category.name === selectedCategory)) selectedCategory = 'all';
    renderFilters();
    renderItems();
    renderCart();
    renderCounter();
  } catch (error) {
    showError('Impossible de lire les données / Cannot read data', error);
  }
}

// ---------- Filtres de catégories / Category filters ----------
function renderFilters() {
  filtersBox.innerHTML = '';
  const names = ['all', ...categories.map((category) => category.name)];
  for (const name of names) {
    const chip = makeButton(name === 'all' ? 'Tout' : name, 'chip' + (name === selectedCategory ? ' active' : ''));
    chip.onclick = () => { selectedCategory = name; renderFilters(); renderItems(); };
    filtersBox.append(chip);
  }
}

// ---------- Grille d'articles / Items grid ----------
// Pastille blanche contenant l'icône / White chip holding the icon
function makeIconChip(iconKey, extraClass = '') {
  const chip = el('span', `icon-chip ${extraClass}`.trim());
  chip.innerHTML = iconMarkup(iconKey); // SVG fixe de icons.js, jamais de saisie utilisateur / fixed SVG, never user input
  return chip;
}

function makeItemButton(article) {
  const button = el('button', 'item-btn');
  button.type = 'button';
  button.style.background = article.color || '#374151';
  if (article.icon && iconMarkup(article.icon)) button.append(makeIconChip(article.icon)); // icône choisie dans l'onglet Articles / icon chosen in Articles tab
  button.append(el('span', '', article.name), el('span', 'item-price', formatMoney(article.priceCents, app.settings.currency)));
  const inCart = cart.find((line) => line.articleId === article.id);
  if (inCart) button.append(el('span', 'item-badge', `× ${inCart.qty}`));
  button.onclick = () => addToCart(article);
  return button;
}

// « Tout » : une section séparée par catégorie ; sinon une seule grille
// "All": one separate section per category; otherwise a single grid
function renderItems() {
  itemsGrid.innerHTML = '';
  if (articles.length === 0) itemsGrid.append(el('p', 'muted', 'Aucun article. Ajoutez-en dans l\'onglet Articles.'));

  // Liste de [titre, articles] à afficher / List of [title, items] to show
  const groups = [];
  if (selectedCategory === 'all') {
    for (const category of categories) groups.push([category.name, articles.filter((article) => article.category === category.name)]);
    const known = new Set(categories.map((category) => category.name));
    groups.push(['Autres', articles.filter((article) => !known.has(article.category))]);
  } else {
    groups.push([null, articles.filter((article) => article.category === selectedCategory)]);
  }

  for (const [title, items] of groups) {
    if (items.length === 0) continue;
    const block = el('div', 'category-block');
    if (title) block.append(el('h3', 'category-title', title));
    const grid = el('div', 'items-grid');
    items.forEach((article) => grid.append(makeItemButton(article)));
    block.append(grid);
    itemsGrid.append(block);
  }
}

// ---------- Panier / Cart ----------
function addToCart(article) {
  const existing = cart.find((line) => line.articleId === article.id);
  if (existing) existing.qty += 1;
  // Copie du nom et du prix : modifier l'article plus tard ne change pas la vente
  // Copy name and price: editing the item later won't change the sale
  // La catégorie est copiée aussi, pour les statistiques / Category is copied too, for statistics
  else {
    const line = { articleId: article.id, name: article.name, priceCents: article.priceCents, category: article.category, qty: 1 };
    if (article.isMenu) {
      // Menu : on copie aussi la composition (quantités PAR menu), pour les statistiques
      // Menu: the composition is copied too (quantities PER menu), for statistics
      line.isMenu = true;
      line.components = article.components.map((component) => {
        const source = articleById.get(component.articleId);
        return { articleId: component.articleId, name: source ? source.name : 'Article inconnu', category: source ? source.category : '', qty: component.qty };
      });
    }
    cart.push(line);
  }
  renderItems();
  renderCart();
}

function changeQuantity(line, delta) {
  line.qty += delta;
  if (line.qty <= 0) cart = cart.filter((other) => other !== line);
  renderItems();
  renderCart();
}

function removeLine(line) {
  cart = cart.filter((other) => other !== line);
  renderItems();
  renderCart();
}

async function clearCart() {
  if (cart.length === 0) return;
  if (!(await confirmDialog('Vider le panier ?', { confirmLabel: 'Vider', danger: true }))) return;
  resetCart();
}

function resetCart() {
  cart = [];
  givenInput.value = '';
  paymentMethod = 'cash'; // retour aux espèces pour le client suivant / back to cash for the next customer
  applyPaymentMode();
  renderItems();
  renderCart();
}

// Met à jour l'écran selon le moyen de paiement / Updates the screen for the payment method
function applyPaymentMode() {
  const isCard = paymentMethod === 'card';
  cardButton.classList.toggle('active', isCard);
  cardButton.setAttribute('aria-pressed', String(isCard));
  givenInput.disabled = isCard;
  quickCashButtons.forEach((button) => { button.disabled = isCard; });
  if (isCard) givenInput.value = '';
  renderChange();
}

const cartTotalCents = () => cart.reduce((sum, line) => sum + line.priceCents * line.qty, 0);

function renderCart() {
  cartLinesBox.innerHTML = '';
  if (cart.length === 0) cartLinesBox.append(el('div', 'cart-empty', 'Panier vide'));
  for (const line of cart) {
    const row = el('div', 'cart-line');
    const minus = makeButton('−', 'btn');
    minus.setAttribute('aria-label', `Retirer un ${line.name}`);
    minus.onclick = () => changeQuantity(line, -1);
    const plus = makeButton('+', 'btn');
    plus.setAttribute('aria-label', `Ajouter un ${line.name}`);
    plus.onclick = () => changeQuantity(line, +1);
    const remove = makeButton('🗑', 'btn btn-danger');
    remove.setAttribute('aria-label', `Supprimer ${line.name}`);
    remove.onclick = () => removeLine(line);
    // L'icône est lue sur l'article actuel (elle n'est pas copiée dans la vente) / Icon read from the current item (not copied into the sale)
    const lineIcon = articleById.get(line.articleId)?.icon;
    if (lineIcon && iconMarkup(lineIcon)) row.append(makeIconChip(lineIcon, 'small'));
    const nameBox = el('span', 'line-name', line.name);
    if (line.isMenu) {
      nameBox.append(el('small', 'line-components', line.components.map((component) => `${component.qty} × ${component.name}`).join(' + ')));
    }
    row.append(
      nameBox,
      minus, el('span', 'line-qty', String(line.qty)), plus,
      el('span', 'line-sub', formatMoney(line.priceCents * line.qty, app.settings.currency)),
      remove,
    );
    cartLinesBox.append(row);
  }
  totalAmount.textContent = formatMoney(cartTotalCents(), app.settings.currency);
  validateButton.disabled = cart.length === 0;
  clearButton.disabled = cart.length === 0;
  renderChange();
}

// Monnaie à rendre / Change to give back
function renderChange() {
  const given = parseEurosToCents(givenInput.value);
  const total = cartTotalCents();
  changeResult.className = 'change-result';
  if (paymentMethod === 'card') {
    changeResult.textContent = cart.length ? 'Carte (SumUp)' : '';
    return;
  }
  if (given === null || cart.length === 0) { changeResult.textContent = ''; return; }
  const difference = given - total;
  if (difference >= 0) {
    changeResult.textContent = `Rendre ${formatMoney(difference, app.settings.currency)}`;
    changeResult.classList.add('ok');
  } else {
    changeResult.textContent = `Manque ${formatMoney(-difference, app.settings.currency)}`;
    changeResult.classList.add('missing');
  }
}

// ---------- Validation / Validation ----------
async function validateSale() {
  if (cart.length === 0) return;
  const sale = {
    id: newId(),
    timestamp: Date.now(),
    lines: cart.map((line) => ({ ...line })),
    totalCents: cartTotalCents(),
    registerName: app.settings.registerName,
    paymentMethod, // 'cash' ou 'card' / or
    dayId: today.id,
    cancelled: false,
  };
  try {
    // Écrite tout de suite dans IndexedDB / Written to IndexedDB immediately
    await storage.putOne('sales', sale);
  } catch (error) {
    showError('La vente n\'a PAS été enregistrée ! / The sale was NOT saved!', error);
    return; // on garde le panier pour réessayer / keep the cart to retry
  }
  daySales.push(sale);
  scheduleAutoBackup(); // copie dans le dossier choisi, si activé / copy to chosen folder, if enabled
  resetCart();
  renderCounter();
  showToast(`✔ Vente enregistrée : ${formatMoney(sale.totalCents, app.settings.currency)}`);
}

// ---------- Annuler la dernière vente / Cancel last sale ----------
async function cancelLastSale() {
  const active = daySales.filter((sale) => !sale.cancelled).sort((a, b) => b.timestamp - a.timestamp);
  const last = active[0];
  if (!last) { showToast('Aucune vente à annuler'); return; }
  const summary = last.lines.map((line) => `${line.qty} × ${line.name}`).join(', ');
  const message = `Annuler la dernière vente (${formatMoney(last.totalCents, app.settings.currency)} : ${summary}) ?`;
  if (!(await confirmDialog(message, { confirmLabel: 'Annuler la vente', danger: true }))) return;
  try {
    last.cancelled = true; // marquée annulée, jamais supprimée / flagged, never deleted
    await storage.putOne('sales', last);
    scheduleAutoBackup();
    renderCounter();
    showToast('Vente annulée');
  } catch (error) {
    last.cancelled = false;
    showError('Annulation impossible / Cancellation failed', error);
  }
}

// ---------- Compteur du jour / Day counter ----------
function renderCounter() {
  const valid = daySales.filter((sale) => !sale.cancelled);
  const total = valid.reduce((sum, sale) => sum + sale.totalCents, 0);
  counter.textContent = `Aujourd'hui : ${valid.length} vente${valid.length > 1 ? 's' : ''} · ${formatMoney(total, app.settings.currency)}`;
  undoButton.disabled = valid.length === 0;
}
