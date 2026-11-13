import { fondLaisse } from "./calculs";
import { joursOuvertureEntre } from "./calendrier";
import type { Analyse, Calendrier, Comptage } from "./types";

/** Dernier comptage clôturé strictement avant `date`. Les brouillons ne servent jamais de référence. */
export function comptageDeReference(date: string, comptages: Iterable<Comptage>): Comptage | null {
  let ref: Comptage | null = null;
  for (const c of comptages) {
    if (c.statut !== "cloture" || c.date >= date) continue;
    if (!ref || c.date > ref.date) ref = c;
  }
  return ref;
}

/**
 * Détermine la nature d'un comptage (normal / cumulé / réinitialisation), sa référence
 * et la période qu'il couvre. Un jour manqué ne déclenche jamais de réinitialisation :
 * seul le choix de l'utilisateur (`typeStocke`) ou l'absence de tout comptage antérieur le fait.
 */
export function analyserComptage(
  date: string,
  typeStocke: Comptage["type"],
  comptages: Iterable<Comptage>,
  cal: Calendrier,
  seuilReinitJours: number,
): Analyse {
  const ref = comptageDeReference(date, comptages);
  if (!ref) {
    return {
      type: "reinitialisation",
      premier: true,
      comptageReference: null,
      reference: null,
      periode: [date],
      joursManques: [],
      reinitRecommandee: false,
    };
  }

  const periode = joursOuvertureEntre(ref.date, date, cal);
  // Un comptage fait un jour normalement fermé couvre quand même ce jour.
  if (periode[periode.length - 1] !== date) periode.push(date);

  const estReinit = typeStocke === "reinitialisation";
  return {
    type: estReinit ? "reinitialisation" : periode.length > 1 ? "cumule" : "normal",
    premier: false,
    comptageReference: ref,
    reference: fondLaisse(ref),
    periode,
    joursManques: periode.slice(0, -1),
    reinitRecommandee: !estReinit && periode.length > seuilReinitJours,
  };
}
