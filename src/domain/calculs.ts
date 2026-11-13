import { totalBillets } from "./billets";
import type { Analyse, Cents, Comptage, Mouvement, Titre } from "./types";

export function especesComptees(c: Pick<Comptage, "montantPieces" | "billets">): Cents {
  return c.montantPieces + totalBillets(c.billets);
}

/** Fond laissé en caisse à la clôture : toutes les pièces + les billets gardés. */
export function fondLaisse(c: Pick<Comptage, "montantPieces" | "billetsGardes">): Cents {
  return c.montantPieces + totalBillets(c.billetsGardes);
}

/** Billets partis en pochette à la clôture : comptés − gardés, par valeur. */
export function pochette(c: Pick<Comptage, "billets" | "billetsGardes">): Record<number, number> {
  const resultat: Record<number, number> = {};
  for (const [valeur, nombre] of Object.entries(c.billets)) {
    const reste = (nombre || 0) - (c.billetsGardes[Number(valeur)] || 0);
    if (reste > 0) resultat[Number(valeur)] = reste;
  }
  return resultat;
}

export function totalTitres(titres: Titre[]): Cents {
  return titres.reduce((s, t) => s + t.montant, 0);
}

export interface TotauxMouvements {
  depenses: Cents;
  remboursements: Cents;
  retraitsPochette: Cents;
  apports: Cents;
  /** dépenses + remboursements + retraits pochette */
  sorties: Cents;
  /** apports */
  entrees: Cents;
}

export function totauxMouvements(mouvements: Mouvement[]): TotauxMouvements {
  const t = { depenses: 0, remboursements: 0, retraitsPochette: 0, apports: 0 };
  for (const m of mouvements) {
    if (m.type === "depense") t.depenses += m.montant;
    else if (m.type === "remboursement") t.remboursements += m.montant;
    else if (m.type === "retrait_pochette") t.retraitsPochette += m.montant;
    else t.apports += m.montant;
  }
  return { ...t, sorties: t.depenses + t.remboursements + t.retraitsPochette, entrees: t.apports };
}

/** recette = espèces comptées − référence + sorties − entrées */
export function recetteEspeces(especes: Cents, reference: Cents, sorties: Cents, entrees: Cents): Cents {
  return especes - reference + sorties - entrees;
}

export type StatutEcart = "juste" | "excedent" | "manque";

export function statutEcart(ecart: Cents): StatutEcart {
  return ecart > 0 ? "excedent" : ecart < 0 ? "manque" : "juste";
}

export function horsTolerance(ecart: Cents, tolerance: Cents): boolean {
  return Math.abs(ecart) > tolerance;
}

/** Somme des montants espèces SumUp de la période (ou total saisi directement). */
export function theoriqueEspeces(c: Pick<Comptage, "sumUp" | "sumUpTotalSaisi">, periode: string[]): Cents {
  if (c.sumUpTotalSaisi != null) return c.sumUpTotalSaisi;
  return c.sumUp.filter((s) => periode.includes(s.date)).reduce((t, s) => t + s.montant, 0);
}

export interface Synthese {
  montantPieces: Cents;
  totalBillets: Cents;
  especesComptees: Cents;
  mouvements: TotauxMouvements;
  /** Mouvements datés hors de la période couverte : ignorés dans le calcul. */
  mouvementsHorsPeriode: number;
  reference: Cents | null;
  theorique: Cents;
  /** null pour une réinitialisation : ni recette ni écart. */
  recette: Cents | null;
  ecart: Cents | null;
  statut: StatutEcart | null;
  horsTolerance: boolean;
  fondLaisse: Cents;
  pochette: Record<number, number>;
  totalPochette: Cents;
  nbTR: number;
  totalTR: Cents;
  nbCV: number;
  totalCV: Cents;
  totalGeneral: Cents;
}

/** Toutes les valeurs calculées d'un comptage. Rien de tout cela n'est stocké. */
export function calculerSynthese(c: Comptage, analyse: Analyse, tolerance: Cents): Synthese {
  const especes = especesComptees(c);
  const estReinit = analyse.type === "reinitialisation";
  const dansPeriode = estReinit ? c.mouvements : c.mouvements.filter((m) => analyse.periode.includes(m.date));
  const mouvements = totauxMouvements(dansPeriode);
  const theorique = theoriqueEspeces(c, analyse.periode);

  let recette: Cents | null = null;
  let ecart: Cents | null = null;
  if (!estReinit && analyse.reference != null) {
    recette = recetteEspeces(especes, analyse.reference, mouvements.sorties, mouvements.entrees);
    ecart = recette - theorique;
  }

  const fond = fondLaisse(c);
  const totalTR = totalTitres(c.titresRestaurant);
  const totalCV = totalTitres(c.chequesVacances);
  return {
    montantPieces: c.montantPieces,
    totalBillets: totalBillets(c.billets),
    especesComptees: especes,
    mouvements,
    mouvementsHorsPeriode: c.mouvements.length - dansPeriode.length,
    reference: analyse.reference,
    theorique,
    recette,
    ecart,
    statut: ecart == null ? null : statutEcart(ecart),
    horsTolerance: ecart != null && horsTolerance(ecart, tolerance),
    fondLaisse: fond,
    pochette: pochette(c),
    totalPochette: especes - fond,
    nbTR: c.titresRestaurant.length,
    totalTR,
    nbCV: c.chequesVacances.length,
    totalCV,
    totalGeneral: especes + totalTR + totalCV,
  };
}
