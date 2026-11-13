import { formatDate } from "../domain/calendrier";
import type { LigneComptage, LigneHistorique } from "../domain/historique";
import { formatSaisie } from "../domain/money";
import type { Cents } from "../domain/types";

const BOM = "﻿";

function cellule(valeur: string): string {
  return /[";\r\n]/.test(valeur) ? '"' + valeur.replace(/"/g, '""') + '"' : valeur;
}

const montant = (c: Cents | null): string => (c == null ? "" : formatSaisie(c));

export const ENTETES_CSV = [
  "Date", "Statut", "Type", "Période", "Monnaie", "Billets", "Espèces comptées", "Référence",
  "Dépenses", "Remboursements", "Retraits pochette", "Apports", "Recette espèces", "Espèces SumUp",
  "Écart", "Fond laissé", "Pochette", "Nb TR", "Total TR", "Nb CV", "Total CV", "Compté par", "Commentaire",
];

export function libelleType(l: LigneComptage): string {
  if (l.analyse.type === "reinitialisation") return "Réinitialisation";
  if (l.analyse.type === "cumule") return "Cumulé, " + l.analyse.periode.length + " jours";
  return "Normal";
}

/** CSV pour Excel en français : séparateur « ; », décimales à la virgule, UTF-8 avec BOM, fins de ligne CRLF. */
export function exporterCsv(lignes: LigneHistorique[]): string {
  const rangs: string[][] = [ENTETES_CSV];
  for (const l of lignes) {
    if (l.sorte !== "comptage") {
      const rang = new Array<string>(ENTETES_CSV.length).fill("");
      rang[0] = formatDate(l.date);
      rang[1] = l.sorte === "ferme" ? "Fermé" : "Manqué";
      rangs.push(rang);
      continue;
    }
    const { comptage: c, analyse: a, synthese: s } = l;
    const periode =
      a.type === "cumule" ? formatDate(a.periode[0]) + " au " + formatDate(a.periode[a.periode.length - 1]) : "";
    rangs.push([
      formatDate(c.date),
      c.statut === "cloture" ? "Clôturé" : "Brouillon",
      libelleType(l),
      periode,
      montant(s.montantPieces),
      montant(s.totalBillets),
      montant(s.especesComptees),
      montant(s.reference),
      montant(s.mouvements.depenses),
      montant(s.mouvements.remboursements),
      montant(s.mouvements.retraitsPochette),
      montant(s.mouvements.apports),
      montant(s.recette),
      montant(s.theorique),
      montant(s.ecart),
      montant(s.fondLaisse),
      montant(s.totalPochette),
      String(s.nbTR),
      montant(s.totalTR),
      String(s.nbCV),
      montant(s.totalCV),
      c.comptePar ?? "",
      [c.commentaireReinitialisation, c.commentaire].filter(Boolean).join(" — "),
    ]);
  }
  return BOM + rangs.map((r) => r.map(cellule).join(";")).join("\r\n") + "\r\n";
}

export function telecharger(nom: string, contenu: string, type: string): void {
  const url = URL.createObjectURL(new Blob([contenu], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = nom;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
