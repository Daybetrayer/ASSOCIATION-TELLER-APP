// Onglet Gestion des articles : liste par catégorie, ajout/modif/suppression, ordre, catégories
// Items management tab: list by category, add/edit/delete, ordering, categories

import * as storage from './storage.js';
import { ICON_FAMILIES, iconsOfFamily, iconMarkup } from './icons.js';
import { ARTICLE_COLORS, textColorFor, formatMoney, parseEurosToCents, newId, el, makeButton, showError, showToast, confirmDialog, formDialog } from './utils.js';

let root;
let app;
let articles = [];
let categories = [];

export function init(rootElement, sharedApp) {
  root = rootElement;
  app = sharedApp;
}

export async function render() {
  try {
    articles = (await storage.getAll('articles')).sort((a, b) => a.order - b.order);
    categories = (await storage.getAll('categories')).sort((a, b) => a.order - b.order);
    draw();
  } catch (error) {
    showError('Impossible de lire les articles / Cannot read items', error);
  }
}

// Exécute une action de stockage et réaffiche ; toute erreur est visible
// Runs a storage action then redraws; any error is visible
async function perform(action, errorMessage) {
  try {
    await action();
    await render();
  } catch (error) {
    showError(errorMessage, error);
  }
}

function draw() {
  root.innerHTML = '';
  root.append(el('h2', '', 'Articles'));

  const toolbar = el('div', 'articles-toolbar');
  const addArticleButton = makeButton('+ Nouvel article', 'btn btn-primary');
  addArticleButton.onclick = () => editArticle(null);
  const addMenuButton = makeButton('+ Nouveau menu', 'btn btn-primary');
  addMenuButton.onclick = () => editArticle(null, true);
  const addCategoryButton = makeButton('+ Nouvelle catégorie', 'btn');
  addCategoryButton.onclick = addCategory;
  toolbar.append(addArticleButton, addMenuButton, addCategoryButton);
  root.append(toolbar);

  categories.forEach((category, index) => root.append(drawCategory(category, index)));

  // Articles dont la catégorie n'existe plus (sécurité) / Items whose category no longer exists (safety)
  const orphans = articles.filter((article) => !categories.some((category) => category.name === article.category));
  if (orphans.length) {
    const box = el('div', 'category-section');
    box.append(el('h3', '', 'Sans catégorie'));
    orphans.forEach((article) => box.append(drawArticleRow(article, orphans)));
    root.append(box);
  }
}

// ---------- Catégories / Categories ----------
function drawCategory(category, index) {
  const section = el('div', 'category-section');
  const header = el('div', 'category-header');
  header.append(el('h3', '', category.name));
  const up = makeButton('▲', 'btn btn-small');
  up.setAttribute('aria-label', 'Monter la catégorie');
  up.disabled = index === 0;
  up.onclick = () => swapOrder('categories', categories[index], categories[index - 1]);
  const down = makeButton('▼', 'btn btn-small');
  down.setAttribute('aria-label', 'Descendre la catégorie');
  down.disabled = index === categories.length - 1;
  down.onclick = () => swapOrder('categories', categories[index], categories[index + 1]);
  const rename = makeButton('Renommer', 'btn btn-small');
  rename.onclick = () => renameCategory(category);
  const remove = makeButton('Supprimer', 'btn btn-small btn-danger');
  remove.onclick = () => deleteCategory(category);
  header.append(up, down, rename, remove);
  section.append(header);

  const itemsOfCategory = articles.filter((article) => article.category === category.name);
  if (itemsOfCategory.length === 0) section.append(el('p', 'muted', 'Aucun article dans cette catégorie.'));
  itemsOfCategory.forEach((article) => section.append(drawArticleRow(article, itemsOfCategory)));
  return section;
}

async function addCategory() {
  const input = document.createElement('input');
  const saved = await formDialog('Nouvelle catégorie', (body) => {
    input.placeholder = 'Nom (ex. Desserts)';
    body.append(input);
  }, () => nameError(input.value, null));
  if (!saved) return;
  const order = categories.length ? Math.max(...categories.map((category) => category.order)) + 1 : 0;
  perform(() => storage.putOne('categories', { id: newId(), name: input.value.trim(), order }), 'Catégorie non enregistrée / Category not saved');
}

async function renameCategory(category) {
  const input = document.createElement('input');
  input.value = category.name;
  const saved = await formDialog('Renommer la catégorie', (body) => body.append(input), () => nameError(input.value, category));
  if (!saved) return;
  const oldName = category.name;
  const newName = input.value.trim();
  if (newName === oldName) return;
  perform(async () => {
    // Les articles mémorisent le nom de leur catégorie : on les met à jour aussi
    // Items store their category name: update them too
    await storage.putOne('categories', { ...category, name: newName });
    for (const article of articles.filter((item) => item.category === oldName)) {
      await storage.putOne('articles', { ...article, category: newName });
    }
  }, 'Renommage impossible / Rename failed');
}

async function deleteCategory(category) {
  if (articles.some((article) => article.category === category.name)) {
    await confirmDialog('Cette catégorie contient des articles. Déplacez-les ou supprimez-les d\'abord.', { confirmLabel: 'OK' });
    return;
  }
  if (!(await confirmDialog(`Supprimer la catégorie « ${category.name} » ?`, { confirmLabel: 'Supprimer', danger: true }))) return;
  perform(() => storage.deleteOne('categories', category.id), 'Suppression impossible / Delete failed');
}

// Renvoie un message d'erreur si le nom est vide ou déjà pris / Error message if empty or already used
function nameError(rawName, currentCategory) {
  const name = rawName.trim();
  if (!name) return 'Le nom est obligatoire.';
  const duplicate = categories.some((category) => category !== currentCategory && category.name.toLowerCase() === name.toLowerCase());
  return duplicate ? 'Cette catégorie existe déjà.' : '';
}

// ---------- Articles ----------
function drawArticleRow(article, siblings) {
  const row = el('div', 'article-row' + (article.active ? '' : ' inactive'));
  const swatch = el('div', 'article-swatch');
  swatch.style.background = article.color || '#374151';
  const iconChip = el('span', 'icon-chip small');
  iconChip.innerHTML = iconMarkup(article.icon); // vide si aucune icône / empty if no icon
  iconChip.hidden = !iconMarkup(article.icon);
  const info = el('div', 'article-info');
  info.append(el('div', 'article-name', article.name + (article.active ? '' : ' (masqué)')));
  info.append(el('div', 'muted', formatMoney(article.priceCents, app.settings.currency)));
  if (article.isMenu) info.append(el('div', 'muted', `Menu : ${describeComponents(article)}`));

  const position = siblings.indexOf(article);
  const up = makeButton('▲', 'btn btn-small');
  up.setAttribute('aria-label', `Monter ${article.name}`);
  up.disabled = position === 0;
  up.onclick = () => swapOrder('articles', article, siblings[position - 1]);
  const down = makeButton('▼', 'btn btn-small');
  down.setAttribute('aria-label', `Descendre ${article.name}`);
  down.disabled = position === siblings.length - 1;
  down.onclick = () => swapOrder('articles', article, siblings[position + 1]);
  const edit = makeButton('Modifier', 'btn btn-small');
  edit.onclick = () => editArticle(article);
  const toggle = makeButton(article.active ? 'Masquer' : 'Réactiver', 'btn btn-small');
  toggle.onclick = () => perform(() => storage.putOne('articles', { ...article, active: !article.active }), 'Modification impossible / Update failed');
  const remove = makeButton('Supprimer', 'btn btn-small btn-danger');
  remove.onclick = () => deleteArticle(article);

  const actions = el('div', 'article-actions');
  actions.append(up, down, edit, toggle, remove);
  row.append(swatch, iconChip, info, actions);
  return row;
}

// Échange la position de deux éléments / Swap the position of two entries
function swapOrder(storeName, first, second) {
  perform(async () => {
    await storage.putOne(storeName, { ...first, order: second.order });
    await storage.putOne(storeName, { ...second, order: first.order });
  }, 'Réorganisation impossible / Reorder failed');
}

const MENU_CATEGORY_NAME = 'Menus';

// Ajout (article === null) ou modification / Add (article === null) or edit
// startAsMenu : ouvre le formulaire en mode « menu » / opens the form in "menu" mode
async function editArticle(article, startAsMenu = false) {
  if (categories.length === 0) {
    await confirmDialog('Créez d\'abord une catégorie.', { confirmLabel: 'OK' });
    return;
  }
  const nameInput = document.createElement('input');
  nameInput.value = article ? article.name : '';
  const priceInput = document.createElement('input');
  priceInput.inputMode = 'decimal';
  priceInput.placeholder = 'ex. 2,50';
  priceInput.value = article ? (article.priceCents / 100).toFixed(2).replace('.', ',') : '';
  const categorySelect = document.createElement('select');
  categories.forEach((category) => categorySelect.append(new Option(category.name, category.name)));
  categorySelect.value = article ? article.category : categories[0].name;
  // ----- Couleur de la touche : 25 couleurs prédéfinies / Button colour: 25 predefined colours -----
  let selectedColor = article && article.color ? article.color : ARTICLE_COLORS.find((color) => color.name === 'Bleu').hex;
  const colorButtons = []; // { hex, button }
  const colorGrid = el('div', 'color-grid');
  const refreshColorSelection = () => colorButtons.forEach(({ hex, button }) => {
    const isSelected = hex.toLowerCase() === selectedColor.toLowerCase();
    button.classList.toggle('selected', isSelected);
    button.setAttribute('aria-pressed', String(isSelected));
    button.textContent = isSelected ? '✓' : '';
  });
  const addColorButton = (name, hex) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'color-swatch';
    button.style.background = hex;
    button.style.color = textColorFor(hex); // couleur de la coche / tick colour
    button.title = name;
    button.setAttribute('aria-label', name);
    button.onclick = () => { selectedColor = hex; refreshColorSelection(); };
    colorButtons.push({ hex, button });
    colorGrid.append(button);
  };
  ARTICLE_COLORS.forEach((color) => addColorButton(color.name, color.hex));
  // Ancienne couleur libre hors palette : conservée tant qu'on n'en choisit pas une autre
  // Old free colour outside the palette: kept until another one is chosen
  if (!ARTICLE_COLORS.some((color) => color.hex.toLowerCase() === selectedColor.toLowerCase())) addColorButton('Couleur actuelle', selectedColor);
  refreshColorSelection();
  const colorSection = el('div', '');
  colorSection.append(el('strong', '', 'Couleur de la touche'), colorGrid);

  // ----- Icône (facultative) choisie dans la bibliothèque / Optional icon picked from the library -----
  let selectedIcon = article && iconMarkup(article.icon) ? article.icon : ''; // '' = aucune / none
  const iconPicker = el('div', 'icon-picker');
  const iconButtons = new Map(); // clé -> bouton / key -> button
  const refreshIconSelection = () => iconButtons.forEach((button, key) => {
    button.classList.toggle('selected', key === selectedIcon);
    button.setAttribute('aria-pressed', String(key === selectedIcon));
  });
  const noIconButton = makeButton('Aucune', 'icon-option none');
  noIconButton.onclick = () => { selectedIcon = ''; refreshIconSelection(); };
  iconButtons.set('', noIconButton);
  iconPicker.append(noIconButton);
  for (const family of ICON_FAMILIES) {
    iconPicker.append(el('p', 'icon-family-title', family));
    const options = el('div', 'icon-options');
    for (const icon of iconsOfFamily(family)) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'icon-option';
      button.innerHTML = icon.svg; // SVG fixe de icons.js / fixed SVG from icons.js
      button.title = icon.label;
      button.setAttribute('aria-label', icon.label);
      button.onclick = () => { selectedIcon = icon.key; refreshIconSelection(); };
      iconButtons.set(icon.key, button);
      options.append(button);
    }
    iconPicker.append(options);
  }
  const iconSection = el('div', '');
  iconSection.append(el('strong', '', 'Icône (facultative)'), iconPicker);
  refreshIconSelection();

  const labelled = (text, field) => { const label = el('label', '', text); label.append(field); return label; };

  // ----- Menu : case à cocher + composition / Menu: checkbox + composition -----
  const menuCheckbox = document.createElement('input');
  menuCheckbox.type = 'checkbox';
  menuCheckbox.checked = article ? Boolean(article.isMenu) : startAsMenu;
  const menuLabel = el('label', 'checkbox-label');
  menuLabel.append(menuCheckbox, document.createTextNode(' C\'est un menu (plusieurs articles pour un prix)'));

  // Un menu ne peut contenir que des articles simples (pas d'autre menu) / A menu only contains plain items
  const componentChoices = articles.filter((item) => !item.isMenu && (!article || item.id !== article.id));
  const componentRows = []; // { select, quantityInput }
  const compositionBox = el('div', 'composition-box');
  const compositionList = el('div', '');
  const priceHint = el('p', 'muted', '');
  const addComponentButton = makeButton('+ Ajouter un article au menu', 'btn btn-small');

  const updatePriceHint = () => {
    const total = componentRows.reduce((sum, row) => {
      const item = componentChoices.find((choice) => choice.id === row.select.value);
      return sum + (item ? item.priceCents * (Number(row.quantityInput.value) || 0) : 0);
    }, 0);
    priceHint.textContent = `Prix des articles à la carte : ${formatMoney(total, app.settings.currency)}`;
  };
  const addComponentRow = (articleId = '', quantity = 1) => {
    const rowBox = el('div', 'composition-row');
    const select = document.createElement('select');
    componentChoices.forEach((item) => select.append(new Option(item.active ? item.name : `${item.name} (masqué)`, item.id)));
    if (articleId) select.value = articleId;
    const quantityInput = document.createElement('input');
    quantityInput.type = 'number';
    quantityInput.min = '1';
    quantityInput.value = String(quantity);
    quantityInput.setAttribute('aria-label', 'Quantité');
    const removeButton = makeButton('✕', 'btn btn-danger btn-small');
    const row = { select, quantityInput };
    removeButton.onclick = () => { componentRows.splice(componentRows.indexOf(row), 1); rowBox.remove(); updatePriceHint(); };
    select.onchange = updatePriceHint;
    quantityInput.oninput = updatePriceHint;
    componentRows.push(row);
    rowBox.append(select, quantityInput, removeButton);
    compositionList.append(rowBox);
    updatePriceHint();
  };
  addComponentButton.onclick = () => addComponentRow(componentChoices.length ? componentChoices[0].id : '');
  compositionBox.append(el('p', 'muted', 'Composition du menu :'), compositionList, addComponentButton, priceHint);
  if (article && article.isMenu) article.components.forEach((component) => addComponentRow(component.articleId, component.qty));

  // La catégorie « Menus » est proposée en mode menu ; elle est créée à l'enregistrement si besoin
  // The "Menus" category is offered in menu mode; it is created on save if needed
  const menuCategoryIsNew = !categories.some((category) => category.name === MENU_CATEGORY_NAME);
  const syncMenuMode = () => {
    compositionBox.hidden = !menuCheckbox.checked;
    const pendingOption = [...categorySelect.options].find((option) => option.value === MENU_CATEGORY_NAME);
    if (menuCheckbox.checked) {
      if (!pendingOption) categorySelect.append(new Option(`${MENU_CATEGORY_NAME} (nouvelle catégorie)`, MENU_CATEGORY_NAME));
      if (!article) categorySelect.value = MENU_CATEGORY_NAME;
      if (!article && !selectedIcon) { selectedIcon = 'menu'; refreshIconSelection(); } // icône proposée, modifiable / suggested, can be changed
      if (componentRows.length === 0 && componentChoices.length) addComponentRow(componentChoices[0].id);
    } else if (menuCategoryIsNew && pendingOption) {
      pendingOption.remove();
    }
  };
  menuCheckbox.onchange = syncMenuMode;

  const saved = await formDialog(article ? 'Modifier l\'article' : (startAsMenu ? 'Nouveau menu' : 'Nouvel article'), (body) => {
    body.append(menuLabel, labelled('Nom', nameInput), compositionBox, labelled('Prix (€)', priceInput), labelled('Catégorie', categorySelect), colorSection, iconSection);
    syncMenuMode();
  }, () => {
    if (!nameInput.value.trim()) return 'Le nom est obligatoire.';
    const price = parseEurosToCents(priceInput.value);
    if (price === null || price < 0) return 'Prix invalide.';
    if (menuCheckbox.checked) {
      if (componentRows.length === 0) return 'Ajoutez au moins un article au menu.';
      const invalidRow = componentRows.some((row) => !row.select.value || !Number.isInteger(Number(row.quantityInput.value)) || Number(row.quantityInput.value) < 1);
      if (invalidRow) return 'Chaque article du menu doit avoir une quantité entière (1 ou plus).';
    }
    return '';
  });
  if (!saved) return;

  const updated = {
    ...(article || {}),
    id: article ? article.id : newId(),
    name: nameInput.value.trim(),
    priceCents: parseEurosToCents(priceInput.value),
    category: categorySelect.value,
    color: selectedColor,
    active: article ? article.active : true,
    order: article ? article.order : (articles.length ? Math.max(...articles.map((item) => item.order)) + 1 : 0),
  };
  if (selectedIcon) updated.icon = selectedIcon; else delete updated.icon;
  if (menuCheckbox.checked) {
    // Regroupe les lignes qui choisissent le même article / Merge rows choosing the same item
    const quantities = new Map();
    componentRows.forEach((row) => quantities.set(row.select.value, (quantities.get(row.select.value) || 0) + Number(row.quantityInput.value)));
    updated.isMenu = true;
    updated.components = [...quantities].map(([articleId, qty]) => ({ articleId, qty }));
  } else {
    delete updated.isMenu;
    delete updated.components;
  }
  perform(async () => {
    if (!categories.some((category) => category.name === updated.category)) {
      const order = categories.length ? Math.max(...categories.map((category) => category.order)) + 1 : 0;
      await storage.putOne('categories', { id: newId(), name: updated.category, order });
    }
    await storage.putOne('articles', updated);
  }, 'Article non enregistré / Item not saved');
}

// Texte de composition : « 1 × Hot dog + 1 × Soda » / Composition text
function describeComponents(menu) {
  return menu.components.map((component) => {
    const item = articles.find((other) => other.id === component.articleId);
    return `${component.qty} × ${item ? item.name : 'article inconnu'}`;
  }).join(' + ');
}

async function deleteArticle(article) {
  // Un article utilisé dans un menu ne peut pas être supprimé (le menu casserait)
  // An item used in a menu cannot be deleted (the menu would break)
  const usedInMenus = articles.filter((other) => other.isMenu && other.components.some((component) => component.articleId === article.id));
  if (usedInMenus.length) {
    await confirmDialog(`« ${article.name} » fait partie de : ${usedInMenus.map((menu) => menu.name).join(', ')}. Retirez-le d'abord de ce(s) menu(s). Vous pouvez aussi le masquer.`, { confirmLabel: 'OK' });
    return;
  }
  try {
    const sales = await storage.getAll('sales');
    const alreadySold = sales.some((sale) => sale.lines.some((line) => line.articleId === article.id));
    if (alreadySold) {
      // Proposer de masquer plutôt que supprimer / Offer to hide instead of deleting
      const hide = await confirmDialog(
        `« ${article.name} » a déjà été vendu : il vaut mieux le masquer que le supprimer (l'historique reste intact dans tous les cas). Masquer cet article ? (« Annuler » passe à la suppression.)`,
        { confirmLabel: 'Masquer' });
      if (hide) { await perform(() => storage.putOne('articles', { ...article, active: false }), 'Modification impossible / Update failed'); return; }
    }
    if (!(await confirmDialog(`Supprimer définitivement « ${article.name} » ?`, { confirmLabel: 'Supprimer', danger: true }))) return;
    await perform(() => storage.deleteOne('articles', article.id), 'Suppression impossible / Delete failed');
    showToast('Article supprimé');
  } catch (error) {
    showError('Suppression impossible / Delete failed', error);
  }
}
