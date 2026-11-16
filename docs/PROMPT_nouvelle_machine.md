# Prompt — Rendre l'application utilisable par les salariés sur une nouvelle machine

> Document d'entrée pour Claude Code. Il complète `PLAN_caisse_restaurant.md` (le plan d'origine) et décrit ce qu'il faut ajouter pour qu'un salarié puisse utiliser l'application sur un appareil qui ne l'a jamais vue, sans aide technique.

## Contexte

L'application de comptage de caisse fonctionne aujourd'hui sur le Mac du gérant, lancée avec `npm run dev`. Elle est 100 % locale : pas de serveur, les données sont dans le navigateur (IndexedDB), elle s'installe comme une PWA et marche hors connexion.

Les salariés comptent la caisse en fin de service, sur la tablette ou le PC du restaurant. Ils n'ont ni Terminal, ni Node, ni accès au code. Aujourd'hui, sur une machine neuve, rien ne leur permet d'obtenir l'application, et au premier lancement elle est vide, sans explication.

## Objectif

Un salarié reçoit une adresse web. Il l'ouvre, suit un écran d'accueil, et l'application est prête à compter, avec l'historique du restaurant si le gérant lui a remis une sauvegarde. Aucune commande à taper.

## Contrainte à respecter (et à dire clairement à l'utilisateur)

Les données restent sur chaque appareil. Deux appareils ne partagent rien : on transporte l'historique d'une machine à l'autre par le fichier de sauvegarde JSON. Ne pas ajouter de serveur, de compte utilisateur ni de synchronisation : c'est hors périmètre du plan. L'usage visé est **un appareil de caisse par restaurant**, partagé par les salariés.

## Travail demandé

### 1. Mise en ligne automatique
- Ajouter un workflow GitHub Actions qui, à chaque push sur `main`, lance les tests, construit l'application et la publie sur GitHub Pages.
- Les chemins sont déjà relatifs (`base: "./"`) : vérifier que l'application marche dans un sous-dossier (`https://<compte>.github.io/ProcessCaisse/`).
- Ne pas activer GitHub Pages à la place de l'utilisateur : documenter l'étape unique à faire dans les réglages du dépôt.

### 2. Premier lancement sur une machine neuve
- Si l'appareil n'a aucun comptage et n'a jamais vu l'écran d'accueil, afficher un écran « Bienvenue » avec deux choix :
  - **Reprendre l'historique du restaurant** : choisir le fichier de sauvegarde JSON remis par le gérant, qui est validé puis restauré ;
  - **Démarrer une nouvelle caisse** : saisir le nom de l'établissement, puis arriver sur l'accueil.
- Expliquer en une phrase que les données restent sur cet appareil.
- L'écran ne revient plus ensuite, sauf après « Tout effacer ».

### 3. Installation sur l'appareil
- Proposer un bouton « Installer l'application » quand le navigateur le permet (événement `beforeinstallprompt`).
- Sur Safari (iPad, Mac), où ce bouton n'existe pas, afficher la marche à suivre (« Partager → Sur l'écran d'accueil »).
- Dans les Réglages, une section « Cet appareil » : version de l'application, installée ou non, stockage persistant accordé ou non.

### 4. Plusieurs salariés sur le même appareil
- Mémoriser sur l'appareil le dernier nom saisi dans « Compté par » et le préremplir au comptage suivant.
- Proposer les noms déjà utilisés dans l'historique pendant la saisie.

### 5. Ne pas perdre les données
- Sur l'accueil, rappeler de télécharger une sauvegarde s'il y a des comptages et qu'aucune sauvegarde n'a été faite depuis plus de 7 jours sur cet appareil, avec un bouton pour la télécharger tout de suite.
- Mémoriser la date de la dernière sauvegarde (préférence d'interface, dans `localStorage`).

### 6. Documentation
- `docs/GUIDE_SALARIES.md` : une page, sans jargon — ouvrir l'adresse, installer, premier lancement, compter, sauvegarder, changer d'appareil.
- README : section « Mettre en ligne » (activer GitHub Pages) et « Installer sur une nouvelle machine ».

## Règles
- Garder l'architecture : `domain/` sans React ni stockage ; préférences d'interface dans `localStorage` uniquement ; données métier dans IndexedDB.
- Interface en français, zones tactiles ≥ 44 px, tablette en priorité.
- Les tests existants doivent rester verts ; ajouter des tests pour toute nouvelle règle pure.
- Ne rien changer aux règles de calcul.

## Vérification attendue
- `npm test` et `npm run build` passent.
- Dans le navigateur, avec un stockage vide : l'écran Bienvenue apparaît ; « Démarrer une nouvelle caisse » mène à l'accueil ; la restauration d'une sauvegarde charge l'historique ; après rechargement, l'écran Bienvenue ne revient pas.
- Le rappel de sauvegarde apparaît puis disparaît après un téléchargement.
- « Compté par » est prérempli sur un nouveau comptage.

## Critères d'acceptation
- Un salarié installe et démarre l'application sur une machine neuve en moins de 2 minutes, avec seulement une adresse web et, si besoin, un fichier de sauvegarde.
- Aucune commande à taper, aucune dépendance à installer.
- L'application reste utilisable hors connexion après la première visite.
