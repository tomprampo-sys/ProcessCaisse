import { estDateIso } from "../domain/calendrier";
import { REGLAGES_PAR_DEFAUT, SCHEMA_VERSION, type Comptage, type JourFerme, type Reglages } from "../domain/types";

export interface Donnees {
  reglages: Reglages;
  comptages: Comptage[];
  joursFermes: JourFerme[];
}

export interface Sauvegarde extends Donnees {
  application: "process-caisse";
  schemaVersion: number;
  exporteLe: string;
}

export function creerSauvegarde(donnees: Donnees, maintenant: string = new Date().toISOString()): string {
  const sauvegarde: Sauvegarde = {
    application: "process-caisse",
    schemaVersion: SCHEMA_VERSION,
    exporteLe: maintenant,
    reglages: donnees.reglages,
    comptages: donnees.comptages,
    joursFermes: donnees.joursFermes,
  };
  return JSON.stringify(sauvegarde, null, 2);
}

const estEntier = (v: unknown): v is number => typeof v === "number" && Number.isInteger(v);

function verifierComptage(c: unknown): asserts c is Comptage {
  const o = c as Partial<Comptage> | null;
  const valide =
    !!o &&
    typeof o.date === "string" &&
    estDateIso(o.date) &&
    o.id === o.date &&
    (o.statut === "brouillon" || o.statut === "cloture") &&
    (o.type === "normal" || o.type === "reinitialisation") &&
    estEntier(o.montantPieces) &&
    o.montantPieces >= 0 &&
    !!o.billets &&
    typeof o.billets === "object" &&
    !!o.billetsGardes &&
    typeof o.billetsGardes === "object" &&
    Array.isArray(o.titresRestaurant) &&
    Array.isArray(o.chequesVacances) &&
    Array.isArray(o.mouvements) &&
    Array.isArray(o.sumUp);
  if (!valide) throw new Error("Un comptage de la sauvegarde est invalide.");
}

/** Lit et valide une sauvegarde JSON. Lève une erreur en français si le fichier n'est pas utilisable. */
export function lireSauvegarde(json: string): Donnees {
  let brut: unknown;
  try {
    brut = JSON.parse(json);
  } catch {
    throw new Error("Le fichier n'est pas un JSON valide.");
  }
  const s = brut as Partial<Sauvegarde> | null;
  if (!s || s.application !== "process-caisse") {
    throw new Error("Ce fichier n'est pas une sauvegarde de l'application.");
  }
  if (!estEntier(s.schemaVersion) || s.schemaVersion > SCHEMA_VERSION) {
    throw new Error("Cette sauvegarde vient d'une version plus récente de l'application.");
  }
  if (!Array.isArray(s.comptages) || !Array.isArray(s.joursFermes) || !s.reglages || typeof s.reglages !== "object") {
    throw new Error("La sauvegarde est incomplète.");
  }
  s.comptages.forEach(verifierComptage);
  for (const j of s.joursFermes) {
    if (!j || typeof j.date !== "string" || !estDateIso(j.date)) {
      throw new Error("Un jour fermé de la sauvegarde est invalide.");
    }
  }
  return {
    reglages: { ...REGLAGES_PAR_DEFAUT, ...s.reglages, schemaVersion: SCHEMA_VERSION },
    comptages: s.comptages,
    joursFermes: s.joursFermes,
  };
}
