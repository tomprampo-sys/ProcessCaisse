import { totalBillets } from "./billets";
import type { Cents, Comptage, Reglages } from "./types";

export type AlerteFond =
  | "ok"
  /** Montant exact impossible avec les billets disponibles : fond en dessous de la cible. */
  | "sous_cible"
  /** Les pièces seules dépassent la cible : aucun billet gardé. */
  | "pieces_depassent"
  /** Espèces comptées inférieures à la cible : tout reste en caisse. */
  | "especes_insuffisantes";

export interface PropositionFond {
  /** Billets laissés en caisse (valeur en euros -> nombre). */
  gardes: Record<number, number>;
  /** Billets mis en pochette. */
  pochette: Record<number, number>;
  fondLaisse: Cents;
  totalPochette: Cents;
  alerte: AlerteFond;
}

export interface EntreeFond {
  montantPieces: Cents;
  billets: Record<number, number>;
  fondCible: Cents;
  compositionCible: Record<number, number>;
}

const UNITE = 500; // tous les billets sont des multiples de 5 €

/**
 * Parmi les billets `dispo`, trouve la combinaison de total maximal sans dépasser `plafond`,
 * en privilégiant les petites valeurs (plus utiles pour rendre la monnaie).
 */
function completer(dispo: Record<number, number>, plafond: Cents): Record<number, number> {
  const valeurs = Object.keys(dispo)
    .map(Number)
    .filter((v) => dispo[v] > 0)
    .sort((a, b) => a - b);
  const unites = valeurs.map((v) => (v * 100) / UNITE);
  const totalDispo = valeurs.reduce((s, v, i) => s + unites[i] * dispo[v], 0);
  const max = Math.min(Math.floor(plafond / UNITE), totalDispo);
  const pris: Record<number, number> = {};
  if (max <= 0 || valeurs.length === 0) return pris;

  // atteignable[i][s] : la somme s est faisable avec les valeurs i, i+1, …
  const n = valeurs.length;
  const atteignable: Uint8Array[] = Array.from({ length: n + 1 }, () => new Uint8Array(max + 1));
  atteignable[n][0] = 1;
  for (let i = n - 1; i >= 0; i--) {
    for (let s = 0; s <= max; s++) {
      for (let k = 0; k <= dispo[valeurs[i]] && k * unites[i] <= s; k++) {
        if (atteignable[i + 1][s - k * unites[i]]) {
          atteignable[i][s] = 1;
          break;
        }
      }
    }
  }

  let reste = max;
  while (reste > 0 && !atteignable[0][reste]) reste--;
  for (let i = 0; i < n && reste > 0; i++) {
    const kMax = Math.min(dispo[valeurs[i]], Math.floor(reste / unites[i]));
    for (let k = kMax; k >= 0; k--) {
      if (atteignable[i + 1][reste - k * unites[i]]) {
        if (k > 0) pris[valeurs[i]] = k;
        reste -= k * unites[i];
        break;
      }
    }
  }
  return pris;
}

function construire(entree: EntreeFond, gardes: Record<number, number>, alerte: AlerteFond): PropositionFond {
  const poche: Record<number, number> = {};
  const propres: Record<number, number> = {};
  for (const [v, n] of Object.entries(entree.billets)) {
    const valeur = Number(v);
    const garde = Math.min(gardes[valeur] || 0, n || 0);
    if (garde > 0) propres[valeur] = garde;
    if ((n || 0) - garde > 0) poche[valeur] = (n || 0) - garde;
  }
  return {
    gardes: propres,
    pochette: poche,
    fondLaisse: entree.montantPieces + totalBillets(propres),
    totalPochette: totalBillets(poche),
    alerte,
  };
}

/**
 * Propose les billets à garder en caisse. Les pièces restent toujours en caisse ;
 * seuls des billets partent en pochette. Invariant : fondLaisse + totalPochette = espèces comptées.
 */
export function proposerFond(entree: EntreeFond): PropositionFond {
  const { montantPieces, billets, fondCible, compositionCible } = entree;
  const especes = montantPieces + totalBillets(billets);

  if (especes < fondCible) return construire(entree, { ...billets }, "especes_insuffisantes");
  if (montantPieces >= fondCible) {
    return construire(entree, {}, montantPieces > fondCible ? "pieces_depassent" : "ok");
  }

  // Composition souhaitée, dans la limite de ce qui a été compté.
  const gardes: Record<number, number> = {};
  for (const [v, n] of Object.entries(billets)) {
    const valeur = Number(v);
    const garde = Math.min(n || 0, compositionCible[valeur] || 0);
    if (garde > 0) gardes[valeur] = garde;
  }

  // Si la composition dépasse la cible, retirer les plus gros billets.
  let fond = montantPieces + totalBillets(gardes);
  const decroissant = Object.keys(gardes).map(Number).sort((a, b) => b - a);
  for (const valeur of decroissant) {
    while (fond > fondCible && gardes[valeur] > 0) {
      gardes[valeur]--;
      fond -= valeur * 100;
    }
  }

  // Compléter avec les billets restants, au plus près de la cible sans la dépasser.
  const restants: Record<number, number> = {};
  for (const [v, n] of Object.entries(billets)) {
    const valeur = Number(v);
    const reste = (n || 0) - (gardes[valeur] || 0);
    if (reste > 0) restants[valeur] = reste;
  }
  for (const [v, k] of Object.entries(completer(restants, fondCible - fond))) {
    gardes[Number(v)] = (gardes[Number(v)] || 0) + k;
  }

  fond = montantPieces + totalBillets(gardes);
  return construire(entree, gardes, fond < fondCible ? "sous_cible" : "ok");
}

/** Ramène les billets gardés entre 0 et le nombre compté. */
export function bornerGardes(gardes: Record<number, number>, billets: Record<number, number>): Record<number, number> {
  const resultat: Record<number, number> = {};
  for (const [v, n] of Object.entries(billets)) {
    const garde = Math.max(0, Math.min(gardes[Number(v)] || 0, n || 0));
    if (garde > 0) resultat[Number(v)] = garde;
  }
  return resultat;
}

type ChampsFond = Pick<Comptage, "montantPieces" | "billets" | "billetsGardes" | "fondManuel" | "pasDePochette">;

/**
 * Met à jour `billetsGardes` après une modification du comptage :
 * tout garder si « pas de pochette », sinon la proposition automatique,
 * sauf si l'utilisateur a ajusté lui-même (auquel cas on borne seulement).
 */
export function normaliserFond<T extends ChampsFond>(
  c: T,
  reglages: Pick<Reglages, "fondCible" | "compositionCibleBillets">,
): T {
  let billetsGardes: Record<number, number>;
  if (c.pasDePochette) billetsGardes = bornerGardes(c.billets, c.billets);
  else if (c.fondManuel) billetsGardes = bornerGardes(c.billetsGardes, c.billets);
  else {
    billetsGardes = proposerFond({
      montantPieces: c.montantPieces,
      billets: c.billets,
      fondCible: reglages.fondCible,
      compositionCible: reglages.compositionCibleBillets,
    }).gardes;
  }
  return { ...c, billetsGardes };
}
