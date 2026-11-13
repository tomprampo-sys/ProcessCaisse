import { nouveauComptage } from "../src/domain/comptage";
import type { Calendrier, Comptage, Mouvement, TypeMouvement } from "../src/domain/types";

/** Fermé le lundi, comme le restaurant. */
export const CAL: Calendrier = { joursOuverture: [0, 2, 3, 4, 5, 6], periodesFermeture: [], joursFermes: [] };

/** Comptage clôturé où tout reste en caisse, sauf indication contraire. */
export function comptage(date: string, champs: Partial<Comptage> = {}): Comptage {
  const base = { ...nouveauComptage(date, "2025-01-01T00:00:00.000Z"), statut: "cloture" as const, ...champs };
  return { ...base, billetsGardes: champs.billetsGardes ?? { ...base.billets } };
}

let compteur = 0;
export function mouvement(type: TypeMouvement, montant: number, date: string, libelle = "test"): Mouvement {
  return { id: "m" + ++compteur, type, montant, libelle, date, creeLe: "2025-01-01T00:00:00.000Z" };
}
