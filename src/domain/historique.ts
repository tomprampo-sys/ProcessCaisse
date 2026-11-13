import { calculerSynthese, type Synthese } from "./calculs";
import { estOuvert, joursEntre } from "./calendrier";
import { analyserComptage } from "./reference";
import type { Analyse, Calendrier, Cents, Comptage, Reglages } from "./types";

export type LigneComptage = { sorte: "comptage"; date: string; comptage: Comptage; analyse: Analyse; synthese: Synthese };
export type LigneHistorique = LigneComptage | { sorte: "ferme"; date: string } | { sorte: "manque"; date: string };

type ReglagesCalcul = Pick<Reglages, "toleranceEcart" | "seuilReinitialisationJours">;

/**
 * Une ligne par jour de la plage : comptage, jour fermé ou jour manqué.
 * Les jours fermés ou manqués ne sont listés qu'à partir du premier comptage ;
 * un jour ouvert sans comptage n'est « manqué » que jusqu'à la veille d'aujourd'hui.
 */
export function lignesHistorique(
  debut: string,
  fin: string,
  comptages: Comptage[],
  cal: Calendrier,
  reglages: ReglagesCalcul,
  aujourdhui: string,
): LigneHistorique[] {
  const parDate = new Map(comptages.map((c) => [c.date, c]));
  const premier = comptages.reduce<string | null>((min, c) => (!min || c.date < min ? c.date : min), null);
  const lignes: LigneHistorique[] = [];
  for (const date of joursEntre(debut, fin)) {
    const comptage = parDate.get(date);
    if (comptage) {
      const analyse = analyserComptage(date, comptage.type, comptages, cal, reglages.seuilReinitialisationJours);
      lignes.push({
        sorte: "comptage",
        date,
        comptage,
        analyse,
        synthese: calculerSynthese(comptage, analyse, reglages.toleranceEcart),
      });
    } else if (!premier || date < premier) {
      // Rien à signaler avant le tout premier comptage.
    } else if (!estOuvert(date, cal)) {
      lignes.push({ sorte: "ferme", date });
    } else if (date < aujourdhui) {
      lignes.push({ sorte: "manque", date });
    }
  }
  return lignes;
}

export interface TotauxHistorique {
  nbComptages: number;
  recette: Cents;
  sumUp: Cents;
  /** Cumul des écarts, hors réinitialisations. */
  ecart: Cents;
  /** Pochettes de clôture + retraits pochette en cours de journée. */
  pochette: Cents;
  totalTR: Cents;
  totalCV: Cents;
}

export function totauxHistorique(lignes: LigneHistorique[]): TotauxHistorique {
  const t: TotauxHistorique = { nbComptages: 0, recette: 0, sumUp: 0, ecart: 0, pochette: 0, totalTR: 0, totalCV: 0 };
  for (const l of lignes) {
    if (l.sorte !== "comptage") continue;
    t.nbComptages++;
    t.pochette += l.synthese.totalPochette + l.synthese.mouvements.retraitsPochette;
    t.totalTR += l.synthese.totalTR;
    t.totalCV += l.synthese.totalCV;
    if (l.synthese.ecart != null && l.synthese.recette != null) {
      t.recette += l.synthese.recette;
      t.sumUp += l.synthese.theorique;
      t.ecart += l.synthese.ecart;
    }
  }
  return t;
}
