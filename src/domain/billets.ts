import type { Cents } from "./types";

/** Valeurs de billets en euros, de la plus petite à la plus grande. */
export const BILLETS = [5, 10, 20, 50, 100, 200] as const;
export const BILLET_500 = 500;

export function valeursBillets(afficherBillet500: boolean): number[] {
  return afficherBillet500 ? [...BILLETS, BILLET_500] : [...BILLETS];
}

/** Total en centimes d'un lot de billets (valeur en euros -> nombre). */
export function totalBillets(billets: Record<number, number>): Cents {
  let total = 0;
  for (const [valeur, nombre] of Object.entries(billets)) {
    total += Number(valeur) * 100 * (nombre || 0);
  }
  return total;
}
