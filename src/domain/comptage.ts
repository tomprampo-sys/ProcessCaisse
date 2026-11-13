import type { Comptage } from "./types";

export function nouvelId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 10);
}

export function nouveauComptage(date: string, maintenant: string = new Date().toISOString()): Comptage {
  return {
    id: date,
    date,
    statut: "brouillon",
    type: "normal",
    montantPieces: 0,
    billets: {},
    titresRestaurant: [],
    chequesVacances: [],
    mouvements: [],
    sumUp: [],
    billetsGardes: {},
    creeLe: maintenant,
    modifieLe: maintenant,
  };
}
