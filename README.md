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

## Tester sur l'ordinateur

Une PWA a besoin de `https://` **ou** de `localhost`. Depuis le dossier du projet :

```bash
python -m http.server 8080
```

Puis ouvrir <http://localhost:8080> dans Chrome. (Autre option : `npx serve`.)
Pour simuler la tablette : F12 → icône « appareil mobile », et tester portrait et paysage.
Pour tester le hors-ligne : F12 → onglet Application → Service Workers → « Offline », puis recharger.

## Jeu de données de test

Configuration → appuyer **7 fois rapidement sur le titre « Configuration »** → section « Mode développeur » :
- « Charger les données de test » ajoute 6 journées fictives (Tournoi, Fête, Vente de gâteaux) pour vérifier les statistiques ;
- « Supprimer les données de test » les retire, sans toucher aux vraies ventes.

## Installer sur la tablette Android

L'appli doit être servie en **HTTPS**. La solution la plus simple et gratuite : **GitHub Pages**.

1. Créer un dépôt GitHub (public) et y envoyer le contenu du dossier `TELLER_APP` (`index.html` à la racine du dépôt).
2. Dépôt → *Settings* → *Pages* → Source : branche `main`, dossier `/ (root)` → enregistrer.
3. Après une minute, l'adresse `https://VOTRE-NOM.github.io/NOM-DU-DEPOT/` est disponible.
4. Sur la tablette, ouvrir cette adresse dans **Chrome**, laisser la page se charger complètement (connexion internet nécessaire cette première fois).
5. Menu ⋮ → **Installer l'application** (ou « Ajouter à l'écran d'accueil »).
6. Ensuite, lancer l'appli depuis l'icône : elle fonctionne sans internet.

Alternative sans hébergement : un serveur local sur un ordinateur du même réseau ne fonctionne **pas** pour l'installation (pas de HTTPS). Préférez GitHub Pages ou Netlify/Cloudflare Pages.

### Mettre à jour l'application
Après une modification des fichiers, ouvrez `service-worker.js` et changez `CACHE_VERSION` (par ex. `buvette-v2`), publiez, puis rouvrez l'appli avec internet : la nouvelle version s'installe (parfois après un second lancement).

## Sauvegardes (important)

- Les données vivent dans IndexedDB, **sur la tablette**. Désinstaller l'appli ou vider les données de Chrome les efface.
- Configuration → **Sauvegarder maintenant** télécharge `buvette-sauvegarde-AAAA-MM-JJ.json` dans *Téléchargements* ; **Partager** l'envoie vers Drive, e-mail… si la tablette le permet.
- Sur Chrome pour Android, une page web ne peut pas écrire dans un dossier choisi : l'option « dossier automatique » n'apparaît que sur ordinateur (Chrome/Edge).
- **Restaurer** accepte un fichier de sauvegarde : *Fusionner* (ajoute, sans doublons d'articles ni de journées) ou *Remplacer*.
- Plusieurs tablettes : donnez à chacune un nom de caisse différent (Configuration), puis fusionnez les sauvegardes sur l'une d'elles.

## Exports pour tableur
Statistiques → exports CSV (UTF-8 avec BOM, séparateur `;`, virgule décimale : s'ouvre directement dans Excel/LibreOffice en français) et JSON complet.
