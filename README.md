# Comptage de caisse

Application web de comptage de caisse de fin de journée pour un restaurant : espèces, titres-restaurant, chèques vacances, mouvements de caisse, écart avec SumUp, fond de caisse et pochette.

Tout est local : les données restent dans le navigateur (IndexedDB), sans serveur. L'application s'installe comme une PWA et fonctionne hors connexion après la première visite.

## Commandes

```bash
npm install      # installer les dépendances
npm run dev      # lancer en développement (http://localhost:5173)
npm test         # tests unitaires (Vitest)
npm run build    # vérification TypeScript + build de production dans dist/
npm run preview  # servir le build de production
```

Le dossier `dist/` est un site statique : il se dépose tel quel sur n'importe quel hébergement (les chemins sont relatifs).

## Mettre en ligne

Le workflow `.github/workflows/deploy.yml` teste, construit et publie l'application sur GitHub Pages à chaque push sur `main`.

Une étape est à faire une seule fois dans le dépôt GitHub : **Settings → Pages → Source : « GitHub Actions »**. Tant qu'elle n'est pas faite, le workflow échoue à l'étape de publication.

L'application est ensuite disponible à l'adresse `https://<compte>.github.io/ProcessCaisse/`. Le site publié ne contient que l'application, jamais les données de caisse. Attention : sur un compte GitHub gratuit, Pages n'est disponible que pour un dépôt public.

## Installer sur une nouvelle machine

Aucune installation technique : le salarié ouvre l'adresse, installe l'application depuis le navigateur, puis choisit au premier lancement de reprendre une sauvegarde ou de démarrer une nouvelle caisse. Le détail est dans [docs/GUIDE_SALARIES.md](docs/GUIDE_SALARIES.md).

Les données ne sont pas partagées entre appareils : l'usage prévu est un appareil de caisse par restaurant, et le transfert se fait par le fichier de sauvegarde.

## Organisation du code

```
src/
  domain/      règles métier, sans React ni stockage
    money.ts          parseEuros / formatEuros (calculs internes en centimes entiers)
    billets.ts        valeurs de billets
    calendrier.ts     jours d'ouverture, jours fermés
    reference.ts      comptage de référence, période couverte, normal / cumulé / réinitialisation
    calculs.ts        totaux, mouvements, recette, écart
    fondDeCaisse.ts   fond proposé et pochette
    historique.ts     lignes et totaux de l'historique
  storage/     IndexedDB (db.ts) et sauvegarde JSON (backup.ts)
  export/      export CSV
  ui/          écrans, composants et documents imprimables
tests/         tests unitaires, dont les cas réels tirés du tableur
```

## Règles principales

- `recette = espèces comptées − référence + sorties − entrées`, `écart = recette − espèces SumUp`.
- La référence est le fond laissé en caisse à la clôture du dernier comptage clôturé (pièces + billets gardés).
- Un jour d'ouverture sans comptage ne déclenche jamais de réinitialisation : le comptage suivant est cumulé sur la période. La réinitialisation est toujours un choix de l'utilisateur, sauf pour le tout premier comptage.
- Les valeurs calculées ne sont jamais stockées : une saisie rétroactive recalcule les comptages suivants.

## Données

Les données ne vivent que dans un seul navigateur. Pensez à télécharger régulièrement une sauvegarde JSON depuis l'écran Réglages.
