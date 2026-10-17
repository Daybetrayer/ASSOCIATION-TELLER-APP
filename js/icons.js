// Bibliothèque d'icônes des articles : pictogrammes SVG dessinés à la main, sans dépendance ni image.
// Article icon library: hand-drawn SVG pictograms, no dependency and no image files.
//
// POUR AJOUTER UNE ICÔNE / TO ADD AN ICON : ajoutez une ligne dans ICON_LIST ci-dessous
// { key (sans accent, unique), label (nom affiché), family, inner (dessin SVG dans une grille 64 × 64) }.
// add a line to ICON_LIST below (key without accents and unique, displayed label, family, SVG drawing on a 64 × 64 grid).
//
// Le SVG vient uniquement de ce fichier (jamais de saisie utilisateur) : l'injecter avec innerHTML est sûr.
// The SVG only comes from this file (never from user input): injecting it with innerHTML is safe.

// Familles, dans l'ordre d'affichage / Families, in display order
export const ICON_FAMILIES = ['Boissons', 'Salé', 'Sucré', 'Barres chocolatées', 'Générique'];

// Emballage de barre chocolatée générique (aucun logo de marque) : couleur + décor propre à chaque barre
// Generic chocolate bar wrapper (no brand logo): colour + a decoration specific to each bar
function chocolateBar(wrapperColor, decoration) {
  const crimpLeft = `<path d="M10 20L4 22.5 10 25 4 27.5 10 30 4 32.5 10 35 4 37.5 10 40 4 42 10 44z" fill="${wrapperColor}"/>`;
  const crimpRight = `<path d="M54 20l6 2.5-6 2.5 6 2.5-6 2.5 6 2.5-6 2.5 6 2.5-6 2.5 6 2-6 2z" fill="${wrapperColor}"/>`;
  return `<g transform="rotate(-22 32 32)"><rect x="10" y="20" width="44" height="24" fill="${wrapperColor}"/>${crimpLeft}${crimpRight}${decoration}<path d="M14 22.5h36" stroke="#fff" stroke-width="2" opacity=".35" stroke-linecap="round"/></g>`;
}

// Bouteille (eau ou soda) : même forme, couleurs différentes / Bottle (water or soda): same shape, different colours
const bottleShape = (capColor, bodyColor) =>
  `<rect x="26" y="3" width="12" height="7" rx="2" fill="${capColor}"/><path d="M27 10h10v6c0 3 7 5 7 11v28a5 5 0 0 1-5 5H25a5 5 0 0 1-5-5V27c0-6 7-8 7-11z" fill="${bodyColor}"/>`;

// Tasse vue de côté / Cup seen from the side
const cupShape = (cupColor, drinkColor) =>
  `<ellipse cx="29" cy="56" rx="22" ry="4" fill="#cbd5e1"/><path d="M10 28h34v10a14 14 0 0 1-14 14h-6A14 14 0 0 1 10 38z" fill="${cupColor}"/><ellipse cx="27" cy="28" rx="17" ry="4" fill="${drinkColor}"/><path d="M44 31h4a6 6 0 0 1 0 12h-6" stroke="${cupColor}" stroke-width="4" fill="none" stroke-linecap="round"/>`;

// Pavé en perspective (gâteau salé, part de gâteau) : face avant, côté, dessus
// Block in perspective (savoury cake, cake slice): front, side, top
const blockFaces = (front, side, top) =>
  `<path d="M44 30l12-9v24l-12 9z" fill="${side}"/><path d="M6 30l12-9h38l-12 9z" fill="${top}"/><rect x="6" y="30" width="38" height="24" fill="${front}"/>`;

const ICON_LIST = [
  // ---------- Boissons / Drinks ----------
  {
    key: 'eau', label: "Bouteille d'eau", family: 'Boissons',
    inner: `${bottleShape('#2563eb', '#9fdcf7')}<rect x="20" y="32" width="24" height="14" fill="#fff" opacity=".9"/><path d="M25 39c3-3 5 3 8 0s5 2 6 0" stroke="#2563eb" stroke-width="2.2" fill="none" stroke-linecap="round"/><path d="M24 22v8" stroke="#fff" stroke-width="2.5" stroke-linecap="round" opacity=".8"/>`,
  },
  {
    key: 'soda', label: 'Bouteille de soda', family: 'Boissons',
    inner: `${bottleShape('#dc2626', '#6b3519')}<rect x="20" y="32" width="24" height="14" fill="#dc2626"/><path d="M20 39c4-4 7 4 12 0s8 4 12 0" stroke="#fff" stroke-width="2.5" fill="none" stroke-linecap="round"/><circle cx="29" cy="20" r="1.8" fill="#fff" opacity=".6"/><circle cx="35" cy="24" r="1.4" fill="#fff" opacity=".6"/><path d="M24 50v3" stroke="#fff" stroke-width="2.5" stroke-linecap="round" opacity=".5"/>`,
  },
  {
    key: 'canette', label: 'Canette', family: 'Boissons',
    inner: `<rect x="19" y="12" width="26" height="44" rx="5" fill="#e5484d"/><rect x="19" y="12" width="26" height="6" rx="2" fill="#cbd5e1"/><rect x="19" y="50" width="26" height="6" rx="3" fill="#cbd5e1"/><rect x="28" y="8" width="8" height="4" rx="2" fill="#94a3b8"/><path d="M19 32c4-4 7 4 13 0s9 4 13 0v8c-4 4-7-4-13 0s-9-4-13 0z" fill="#fff" opacity=".9"/>`,
  },
  {
    key: 'cafe', label: 'Café', family: 'Boissons',
    inner: `${cupShape('#8b5a2b', '#3b2314')}<path d="M21 19c-3-3 3-5 0-9M31 19c-3-3 3-5 0-9" stroke="#94a3b8" stroke-width="2.5" fill="none" stroke-linecap="round"/>`,
  },
  {
    key: 'the', label: 'Thé', family: 'Boissons',
    inner: `${cupShape('#4f8fd6', '#c77d2b')}<path d="M27 27c0-8 8-10 12-14" stroke="#64748b" stroke-width="1.8" fill="none"/><rect x="38" y="6" width="10" height="9" rx="1.5" fill="#22a06b" transform="rotate(25 43 10)"/>`,
  },
  {
    key: 'chocolat', label: 'Chocolat chaud', family: 'Boissons',
    inner: `<path d="M12 28h32v14a12 12 0 0 1-12 12h-8A12 12 0 0 1 12 42z" fill="#d0583f"/><ellipse cx="28" cy="28" rx="16" ry="4" fill="#4a2512"/><path d="M44 31h3a6 6 0 0 1 0 12h-5" stroke="#d0583f" stroke-width="4" fill="none" stroke-linecap="round"/><path d="M14 25c0-6 8-8 14-8s14 2 14 8c0 3-4 4-14 4s-14-1-14-4z" fill="#fff" stroke="#e8d9c9" stroke-width="1.5"/><circle cx="22" cy="14" r="4.5" fill="#fbcfe8" stroke="#f0a8cf" stroke-width="1.2"/><circle cx="33" cy="12" r="4.5" fill="#fff" stroke="#e0d0c0" stroke-width="1.2"/>`,
  },
  {
    key: 'biere', label: 'Bière', family: 'Boissons',
    inner: `<path d="M12 16h28v36a4 4 0 0 1-4 4H16a4 4 0 0 1-4-4z" fill="#f5a623"/><path d="M40 22h6a6 6 0 0 1 6 6v10a6 6 0 0 1-6 6h-6" stroke="#94a3b8" stroke-width="4" fill="none"/><path d="M18 30v18M26 32v14M34 30v18" stroke="#fcd34d" stroke-width="2.5" stroke-linecap="round"/><g fill="#fff8e1" stroke="#e8d9a8" stroke-width="1.5"><rect x="12" y="14" width="28" height="9"/><circle cx="16" cy="14" r="6"/><circle cx="26" cy="11" r="7"/><circle cx="36" cy="14" r="6"/></g>`,
  },
  {
    key: 'vin', label: 'Verre de vin', family: 'Boissons',
    inner: `<path d="M16 8h32c2 14-2 26-16 28C18 34 14 22 16 8z" fill="#f1f5f9" stroke="#94a3b8" stroke-width="2"/><path d="M17 22h30c-1 9-6 14-15 14s-14-5-15-14z" fill="#9b1c31"/><path d="M32 36v17" stroke="#94a3b8" stroke-width="3.5"/><ellipse cx="32" cy="56" rx="12" ry="3.5" fill="#94a3b8"/>`,
  },
  {
    key: 'jus', label: 'Jus de fruit', family: 'Boissons',
    inner: `<path d="M14 18h30l-3 38a3 3 0 0 1-3 3H20a3 3 0 0 1-3-3z" fill="#e2e8f0" stroke="#94a3b8" stroke-width="2"/><path d="M16.5 27h25l-1.8 28.5H18.3z" fill="#f59e0b"/><path d="M34 22L44 5" stroke="#ef4444" stroke-width="3" stroke-linecap="round"/><circle cx="46" cy="22" r="9" fill="#fb923c"/><circle cx="46" cy="22" r="6.5" fill="#fdba74"/><path d="M46 15.5v13M39.5 22h13M41.4 17.4l9.2 9.2M50.6 17.4l-9.2 9.2" stroke="#fb923c" stroke-width="1"/>`,
  },
  {
    key: 'gobelet', label: 'Gobelet', family: 'Boissons',
    inner: `<path d="M12 10h40l-5 46a3 3 0 0 1-3 3H20a3 3 0 0 1-3-3z" fill="#bfe3f5" stroke="#7fb8d9" stroke-width="2"/><path d="M14 22h36l-1 10H15z" fill="#e5484d"/><rect x="10" y="8" width="44" height="5" rx="2.5" fill="#7fb8d9"/>`,
  },

  // ---------- Salé / Savoury ----------
  {
    key: 'hotdog', label: 'Hot dog', family: 'Salé',
    inner: `<path d="M4 36a8 8 0 0 1 8-8h40a8 8 0 0 1 8 8v8a8 8 0 0 1-8 8H12a8 8 0 0 1-8-8z" fill="#e5a95b"/><rect x="2" y="20" width="60" height="16" rx="8" fill="#c0392b"/><path d="M8 28l5-4 6 8 6-8 6 8 6-8 6 8 6-8 5 4" stroke="#facc15" stroke-width="3" fill="none" stroke-linejoin="round" stroke-linecap="round"/><path d="M4 38c0-2 2-4 4-4h48c2 0 4 2 4 4v6a8 8 0 0 1-8 8H12a8 8 0 0 1-8-8z" fill="#efb866"/>`,
  },
  {
    key: 'sandwich', label: 'Sandwich', family: 'Salé',
    inner: `<rect x="8" y="48" width="48" height="8" rx="4" fill="#e5b46b"/><rect x="6" y="44" width="52" height="5" rx="2" fill="#f4a6a6"/><rect x="8" y="40" width="48" height="5" fill="#facc15"/><g fill="#ef4444"><ellipse cx="16" cy="38" rx="7" ry="3"/><ellipse cx="32" cy="38" rx="7" ry="3"/><ellipse cx="48" cy="38" rx="7" ry="3"/></g><path d="M5 33h54v4c-5 3-8-2-13 1s-8-2-13 1-8-2-13 1-8-2-13 1z" fill="#5cb85c"/><path d="M7 34C7 18 18 12 32 12s25 6 25 22z" fill="#e5b46b"/><path d="M20 20l3 2M32 17l3 2M43 21l3 2" stroke="#c98a3a" stroke-width="2" stroke-linecap="round"/>`,
  },
  {
    key: 'panini', label: 'Panini', family: 'Salé',
    inner: `<path d="M6 42h52a2 2 0 0 1 2 2v2a8 8 0 0 1-8 8H12a8 8 0 0 1-8-8v-2a2 2 0 0 1 2-2z" fill="#d89a52"/><rect x="5" y="39" width="54" height="4" fill="#facc15"/><rect x="5" y="36" width="54" height="4" fill="#f4a6a6"/><path d="M44 42v9a3 3 0 0 0 6 0v-9z" fill="#facc15"/><path d="M5 36v-4a8 8 0 0 1 8-8h38a8 8 0 0 1 8 8v4z" fill="#d89a52"/><path d="M17 26l-3 8M27 26l-3 8M37 26l-3 8M47 26l-3 8" stroke="#7c3f14" stroke-width="3.2" stroke-linecap="round"/>`,
  },
  {
    key: 'cakesale', label: 'Cake salé', family: 'Salé',
    inner: `${blockFaces('#f3cf7a', '#d9a441', '#c98a32')}<g fill="#5b8c2a"><circle cx="14" cy="38" r="3.8"/><circle cx="30" cy="46" r="3.8"/><circle cx="36" cy="36" r="3.8"/></g><g fill="#c0392b"><circle cx="14" cy="38" r="1.3"/><circle cx="30" cy="46" r="1.3"/><circle cx="36" cy="36" r="1.3"/></g><g fill="#f4a6a6"><rect x="20" y="33" width="6" height="5" rx="1"/><rect x="11" y="47" width="6" height="5" rx="1"/></g><rect x="37" y="46" width="5" height="5" rx="1" fill="#facc15"/>`,
  },
  {
    key: 'frites', label: 'Frites', family: 'Salé',
    inner: `<g fill="#f6c744"><rect x="14" y="10" width="6" height="32" rx="2" transform="rotate(-10 17 40)"/><rect x="21" y="6" width="6" height="34" rx="2" transform="rotate(-4 24 40)"/><rect x="29" y="8" width="6" height="34" rx="2"/><rect x="37" y="6" width="6" height="34" rx="2" transform="rotate(5 40 40)"/><rect x="44" y="11" width="6" height="30" rx="2" transform="rotate(11 47 40)"/></g><path d="M10 34h44l-5 24H15z" fill="#d6372f"/><path d="M25 34l-1.5 24M39 34l1.5 24" stroke="#fff" stroke-width="2" opacity=".6"/>`,
  },
  {
    key: 'crepe', label: 'Crêpe', family: 'Salé',
    inner: `<ellipse cx="32" cy="50" rx="27" ry="9" fill="#e2e8f0"/><path d="M10 46L32 14l22 32c-7 6-15 8-22 8s-15-2-22-8z" fill="#e8b866"/><path d="M32 14v38" stroke="#c98a32" stroke-width="2"/><path d="M17 38c4 3 6-3 10 0s6-3 10 0 6-2 9 0M21 28c3 2 5-2 8 0s5-2 8 0" stroke="#4a2512" stroke-width="3" fill="none" stroke-linecap="round"/>`,
  },
  {
    key: 'pizza', label: 'Pizza (part)', family: 'Salé',
    inner: `<path d="M6 16C24 6 40 6 58 16L32 58z" fill="#f6c945"/><path d="M6 16C24 6 40 6 58 16" stroke="#d9953c" stroke-width="7" fill="none" stroke-linecap="round"/><g fill="#d62828"><circle cx="22" cy="24" r="5"/><circle cx="40" cy="25" r="5"/><circle cx="31" cy="38" r="5"/></g><g fill="#4c9a2a"><circle cx="31" cy="25" r="2"/><circle cx="24" cy="35" r="2"/><circle cx="37" cy="45" r="2"/></g>`,
  },
  {
    key: 'saucisse', label: 'Saucisse / merguez', family: 'Salé',
    inner: `<path d="M14 46C6 32 22 14 40 20s16 22 4 30" stroke="#a8321f" stroke-width="13" stroke-linecap="round" fill="none"/><path d="M13 42C8 32 20 18 36 21" stroke="#d65a3a" stroke-width="3" stroke-linecap="round" fill="none" opacity=".7"/><path d="M20 34l6 5M30 24l5 6M43 34l-6 5" stroke="#5c1a10" stroke-width="2.4" stroke-linecap="round" opacity=".7"/>`,
  },
  {
    key: 'chips', label: 'Chips', family: 'Salé',
    inner: `<rect x="12" y="6" width="40" height="52" rx="3" fill="#f2a31c"/><path d="M12 11h40M12 53h40" stroke="#c77d0a" stroke-width="2" stroke-dasharray="3 2"/><circle cx="32" cy="32" r="13" fill="#fff3c4"/><path d="M24 34c0-8 14-10 16-2s-12 10-16 2z" fill="#f6c744" stroke="#c77d0a" stroke-width="1.5"/>`,
  },
  {
    key: 'pain', label: 'Pain', family: 'Salé',
    inner: `<g transform="rotate(-35 32 32)"><rect x="2" y="22" width="60" height="20" rx="10" fill="#d99a4e"/><path d="M14 25l4 14M26 25l4 14M38 25l4 14M50 25l4 14" stroke="#f3d29a" stroke-width="3.5" stroke-linecap="round"/></g>`,
  },

  // ---------- Sucré / Sweet ----------
  {
    key: 'cookie', label: 'Cookie', family: 'Sucré',
    inner: `<circle cx="32" cy="32" r="26" fill="#d99a4e" stroke="#c0803a" stroke-width="2"/><g fill="#4a2c17"><ellipse cx="21" cy="22" rx="5" ry="4"/><ellipse cx="38" cy="17" rx="4.5" ry="3.5"/><ellipse cx="45" cy="33" rx="5" ry="4"/><ellipse cx="29" cy="35" rx="5" ry="4"/><ellipse cx="18" cy="42" rx="4" ry="3.5"/><ellipse cx="38" cy="47" rx="5" ry="4"/></g>`,
  },
  {
    key: 'brownie', label: 'Brownie', family: 'Sucré',
    inner: `<path d="M8 28L32 16l24 12-24 12z" fill="#7a4526"/><path d="M8 28v14l24 12V40z" fill="#4e2a14"/><path d="M56 28v14L32 54V40z" fill="#5e3319"/><path d="M19 27l6 3M34 22l5 3M30 32l8-4" stroke="#a8693a" stroke-width="2" stroke-linecap="round"/><g fill="#d9a066"><circle cx="24" cy="24" r="2.2"/><circle cx="40" cy="30" r="2.2"/><circle cx="31" cy="27" r="1.8"/></g>`,
  },
  {
    key: 'muffin', label: 'Muffin', family: 'Sucré',
    inner: `<path d="M8 38c-2-10 4-16 12-16 2-8 10-12 18-8 6 2 8 6 8 8 6 2 10 8 8 16z" fill="#c27a3c"/><g fill="#4a2c17"><circle cx="20" cy="30" r="2.5"/><circle cx="32" cy="24" r="2.5"/><circle cx="44" cy="31" r="2.5"/><circle cx="30" cy="34" r="2.2"/></g><path d="M12 37h40l-4 19a3 3 0 0 1-3 2H19a3 3 0 0 1-3-2z" fill="#ec6ca0"/><path d="M24 38l1 20M32 38v20M40 38l-1 20" stroke="#fff" stroke-width="1.8" opacity=".6"/>`,
  },
  {
    key: 'gaufre', label: 'Gaufre', family: 'Sucré',
    inner: `<rect x="8" y="10" width="48" height="46" rx="8" fill="#e2a64a"/><path d="M8 25h48M8 41h48M24 10v46M40 10v46" stroke="#b97b22" stroke-width="3"/><circle cx="32" cy="33" r="11" fill="#fff" stroke="#e8d9c9" stroke-width="1.5"/><circle cx="32" cy="33" r="5.5" fill="#e11d48"/>`,
  },
  {
    key: 'glace', label: 'Glace', family: 'Sucré',
    inner: `<path d="M19 30h26L32 61z" fill="#e0a44f"/><path d="M23 33l13 19M30 31l10 14M41 33L28 52M34 31L24 45" stroke="#b97b22" stroke-width="1.6"/><circle cx="32" cy="28" r="13" fill="#f48fb1"/><circle cx="32" cy="17" r="10" fill="#fde68a" stroke="#e8c76a" stroke-width="1.2"/><circle cx="36" cy="6" r="3.5" fill="#d62828"/>`,
  },
  {
    key: 'donut', label: 'Donut', family: 'Sucré',
    inner: `<circle cx="32" cy="32" r="26" fill="#e8b06a"/><circle cx="32" cy="30" r="22" fill="#f06292"/><circle cx="32" cy="31" r="8" fill="#fff" stroke="#e8b06a" stroke-width="2"/><g stroke-linecap="round" stroke-width="2.6"><path d="M20 20l4 2" stroke="#fff"/><path d="M40 16l3 3" stroke="#facc15"/><path d="M47 30l4 1" stroke="#fff"/><path d="M16 33l4-1" stroke="#4ade80"/><path d="M26 44l3-3" stroke="#facc15"/><path d="M42 42l3 2" stroke="#fff"/><path d="M30 14l4-1" stroke="#4ade80"/></g>`,
  },
  {
    key: 'gateau', label: 'Part de gâteau', family: 'Sucré',
    inner: `<path d="M44 30l12-9v24l-12 9z" fill="#e0a95c"/><path d="M6 30l12-9h38l-12 9z" fill="#f48fb1"/><rect x="6" y="30" width="38" height="8" fill="#f1c27d"/><rect x="6" y="38" width="38" height="6" fill="#fff" stroke="#f0e0c0" stroke-width="1"/><rect x="6" y="44" width="38" height="10" fill="#f1c27d"/><circle cx="32" cy="21" r="5" fill="#d62828"/><path d="M32 16c0-4 3-6 5-7" stroke="#4c9a2a" stroke-width="2" fill="none" stroke-linecap="round"/>`,
  },
  {
    key: 'bonbon', label: 'Sucette', family: 'Sucré',
    inner: `<path d="M32 40v20" stroke="#cbd5e1" stroke-width="4" stroke-linecap="round"/><circle cx="32" cy="24" r="19" fill="#ec4899"/><path d="M32 24a3 3 0 0 1 6 0 6 6 0 0 1-12 0 9 9 0 0 1 18 0 12 12 0 0 1-24 0" stroke="#fff" stroke-width="3" fill="none" stroke-linecap="round"/>`,
  },
  {
    key: 'popcorn', label: 'Pop-corn', family: 'Sucré',
    inner: `<g fill="#fff8e1" stroke="#f0c36d" stroke-width="1.5"><circle cx="18" cy="28" r="7"/><circle cx="28" cy="20" r="8"/><circle cx="40" cy="22" r="8"/><circle cx="48" cy="30" r="6"/><circle cx="34" cy="30" r="7"/></g><path d="M14 34h36l-4 24a2 2 0 0 1-2 2H20a2 2 0 0 1-2-2z" fill="#e5484d"/><path d="M22 34h5l1.1 26h-3.9zM37 34h5l-2.2 26h-3.9z" fill="#fff"/>`,
  },
  {
    key: 'fruit', label: 'Fruit (pomme)', family: 'Sucré',
    inner: `<path d="M32 20c-6-5-18-2-18 12 0 12 8 22 14 22 2 0 3-1 4-1s2 1 4 1c6 0 14-10 14-22 0-14-12-17-18-12z" fill="#dc2626"/><ellipse cx="22" cy="30" rx="3" ry="6" fill="#fff" opacity=".35" transform="rotate(15 22 30)"/><path d="M32 20c0-5 2-9 6-12" stroke="#7a4a2b" stroke-width="3" fill="none" stroke-linecap="round"/><path d="M36 13c4-5 10-4 12-3-1 5-6 7-12 3z" fill="#4c9a2a"/>`,
  },

  // ---------- Barres chocolatées (emballages génériques, sans logo) / Chocolate bars (generic, no logo) ----------
  {
    key: 'barre-lion', label: 'Barre Lion', family: 'Barres chocolatées',
    inner: chocolateBar('#f77f00', '<rect x="10" y="29" width="44" height="7" fill="#5a2d0c"/><g fill="#ffe066"><circle cx="20" cy="32.5" r="1.8"/><circle cx="32" cy="32.5" r="1.8"/><circle cx="44" cy="32.5" r="1.8"/></g>'),
  },
  {
    key: 'barre-mars', label: 'Barre Mars', family: 'Barres chocolatées',
    inner: chocolateBar('#3b1d16', '<path d="M24 20h14L26 44H12z" fill="#d62828"/><path d="M40 20L28 44" stroke="#f2c14e" stroke-width="2.5"/>'),
  },
  {
    key: 'barre-bounty', label: 'Barre Bounty', family: 'Barres chocolatées',
    inner: chocolateBar('#2a7fd4', '<circle cx="32" cy="32" r="9.5" fill="#fff"/><path d="M22.5 32a9.5 9.5 0 0 0 19 0z" fill="#7a4a2b"/>'),
  },
  {
    key: 'barre-twix', label: 'Barre Twix', family: 'Barres chocolatées',
    inner: chocolateBar('#d9a21b', '<rect x="10" y="26" width="44" height="12" fill="#c1121f"/><path d="M10 32h44" stroke="#f5d061" stroke-width="2"/>'),
  },
  {
    key: 'barre-kitkat', label: 'Barre Kit Kat', family: 'Barres chocolatées',
    inner: chocolateBar('#d90f1a', '<rect x="10" y="26" width="44" height="12" fill="#fff"/><path d="M20 26v12M30 26v12M40 26v12" stroke="#d90f1a" stroke-width="2"/>'),
  },
  {
    key: 'barre-snickers', label: 'Barre Snickers', family: 'Barres chocolatées',
    inner: chocolateBar('#1d3b8f', '<ellipse cx="32" cy="32" rx="18" ry="8" fill="#fff"/><ellipse cx="32" cy="32" rx="15" ry="5.5" fill="#c1272d"/><path d="M10 40h44" stroke="#8b4513" stroke-width="3"/>'),
  },

  // ---------- Générique / Generic ----------
  {
    key: 'menu', label: 'Menu (plat)', family: 'Générique',
    inner: `<circle cx="32" cy="14" r="4.5" fill="#94a3b8"/><path d="M8 46a24 24 0 0 1 48 0z" fill="#c9d2dc"/><path d="M15 40a18 18 0 0 1 12-14" stroke="#fff" stroke-width="3" fill="none" stroke-linecap="round" opacity=".8"/><rect x="4" y="46" width="56" height="6" rx="3" fill="#94a3b8"/>`,
  },
  {
    key: 'etoile', label: 'Étoile', family: 'Générique',
    inner: `<path d="M32 4l8.2 17 18.6 2.5-13.6 13 3.4 18.4L32 45.8 15.4 54.9l3.4-18.4L5.2 23.5 23.8 21z" fill="#facc15" stroke="#e0a800" stroke-width="2" stroke-linejoin="round"/>`,
  },
  {
    key: 'cadeau', label: 'Cadeau / tombola', family: 'Générique',
    inner: `<rect x="8" y="28" width="48" height="28" rx="3" fill="#e5484d"/><rect x="6" y="20" width="52" height="12" rx="3" fill="#ef6b70"/><rect x="28" y="20" width="8" height="36" fill="#facc15"/><path d="M32 20c-6-12-18-8-14 0zM32 20c6-12 18-8 14 0z" fill="none" stroke="#facc15" stroke-width="4" stroke-linejoin="round"/>`,
  },
  {
    key: 'autre', label: 'Autre', family: 'Générique',
    inner: `<circle cx="32" cy="32" r="26" fill="#94a3b8"/><text x="32" y="45" text-anchor="middle" font-size="36" font-weight="700" fill="#fff" font-family="system-ui, sans-serif">?</text>`,
  },
];

const wrapSvg = (inner) => `<svg viewBox="0 0 64 64" aria-hidden="true" focusable="false">${inner}</svg>`;

// Index par clé / Lookup by key
export const ICONS = Object.fromEntries(ICON_LIST.map((icon) => [icon.key, { ...icon, svg: wrapSvg(icon.inner) }]));

// Renvoie le SVG de l'icône, ou '' si la clé est vide ou inconnue (ex. sauvegarde d'une version plus récente)
// Returns the icon SVG, or '' when the key is empty or unknown (e.g. backup from a newer version)
export function iconMarkup(key) {
  return key && ICONS[key] ? ICONS[key].svg : '';
}

// Liste des icônes d'une famille / Icons of one family
export const iconsOfFamily = (family) => Object.values(ICONS).filter((icon) => icon.family === family);

// Pictogramme de carte bancaire bleue (bouton « Carte » de la Caisse) / Blue bank card pictogram (Caisse "Card" button)
export const CARD_ICON_SVG = '<svg viewBox="0 0 48 32" aria-hidden="true" focusable="false" class="card-icon"><rect x="1" y="1" width="46" height="30" rx="4" fill="#1d4ed8" stroke="#fff" stroke-width="1.5"/><rect x="1" y="8" width="46" height="6" fill="#0b1e5b"/><rect x="6" y="20" width="12" height="5" rx="1.5" fill="#facc15"/><circle cx="36" cy="22" r="4" fill="#ef4444" opacity=".9"/><circle cx="41" cy="22" r="4" fill="#fb923c" opacity=".9"/></svg>';
