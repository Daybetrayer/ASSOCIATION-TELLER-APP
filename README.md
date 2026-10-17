# Buvette – assistant de comptage

Application web (PWA) pour compter les ventes d'une buvette et obtenir des statistiques.
Elle fonctionne **hors ligne**, sans serveur, sans compte. Les données restent dans le navigateur de l'appareil (IndexedDB).

## Organisation des fichiers

| Fichier | Rôle |
|---|---|
| `index.html` | Page unique : barre d'onglets + 4 zones |
| `css/base.css` | Couleurs, thèmes clair/sombre, tailles de boutons |
| `css/components.css` | Boutons, grilles, panier, tableaux, fenêtres |
| `js/app.js` | Démarrage, navigation, écran allumé, service worker |
| `js/storage.js` | Base IndexedDB, export / import / effacement |
| `js/utils.js` | Argent, dates, CSV, fenêtres de confirmation, messages d'erreur |
| `js/tab-caisse.js` | Onglet Caisse |
| `js/tab-articles.js` | Onglet Articles |
| `js/tab-stats.js` | Onglet Statistiques |
| `js/tab-config.js` | Onglet Configuration |
| `js/devdata.js` | Jeu de données de test |
| `service-worker.js` | Cache pour le mode hors ligne |
| `manifest.webmanifest` | Informations d'installation de la PWA |

Aucune dépendance externe : le graphique est du SVG écrit à la main.

## Fonctions à connaître

- **Caisse** : le filtre « Tout » affiche une section par catégorie. Le bouton **💳 Carte** (à côté des billets) enregistre la vente comme payée par carte (SumUp) : pas de monnaie à rendre. Le moyen de paiement apparaît dans les statistiques et dans le CSV.
- **Menus** : Articles → « + Nouveau menu ». On choisit les articles qui le composent (ex. 1 hot dog + 1 soda + 1 cookie) et un prix. En caisse, le menu est une seule ligne ; dans les statistiques, ses composants sont aussi décomptés (colonne « Dont en menu ») pour prévoir les achats. Le chiffre d'affaires reste attribué au menu.
- **Icônes** : dans Articles, chaque article (ou menu) peut recevoir une icône de la bibliothèque (ou « Aucune »). Elle s'affiche sur le bouton de la Caisse et dans le panier. Les icônes sont dessinées dans `js/icons.js` : pour en ajouter une, ajoutez une ligne dans `ICON_LIST`. Les barres chocolatées sont des emballages génériques (couleurs approchantes, sans logo).
- **Catégories de nourriture** : « Nourriture salée » et « Nourriture sucrée » sont séparées en Caisse. Une ancienne catégorie « Nourriture » est scindée automatiquement (les articles à icône sucrée passent en sucrée ; les autres se déplacent avec Modifier → Catégorie).
- **Couleurs** : chaque article choisit sa couleur parmi 25 couleurs prédéfinies ; le texte du bouton passe en noir sur les couleurs claires.
- **Billets** : les boutons 5 / 10 / 20 / 50 € ont la couleur des vrais billets.

## Sauvegardes (important)

- Les données vivent dans IndexedDB, **sur la tablette**. Désinstaller l'appli ou vider les données de Chrome les efface.
- Configuration → **Sauvegarder maintenant** télécharge `buvette-sauvegarde-AAAA-MM-JJ.json` dans *Téléchargements* ; **Partager** l'envoie vers Drive, e-mail… si la tablette le permet.
- Sur Chrome pour Android, une page web ne peut pas écrire dans un dossier choisi : l'option « dossier automatique » n'apparaît que sur ordinateur (Chrome/Edge).
- **Restaurer** accepte un fichier de sauvegarde : *Fusionner* (ajoute, sans doublons d'articles ni de journées) ou *Remplacer*.
- Plusieurs tablettes : donnez à chacune un nom de caisse différent (Configuration), puis fusionnez les sauvegardes sur l'une d'elles.

## Exports pour tableur
Statistiques → exports CSV (UTF-8 avec BOM, séparateur `;`, virgule décimale : s'ouvre directement dans Excel/LibreOffice en français) et JSON complet.
