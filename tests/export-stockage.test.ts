import "fake-indexeddb/auto";
import { describe, expect, it } from "vitest";
import { lignesHistorique, totauxHistorique } from "../src/domain/historique";
import { REGLAGES_PAR_DEFAUT } from "../src/domain/types";
import { ENTETES_CSV, exporterCsv } from "../src/export/csv";
import { creerSauvegarde, lireSauvegarde, type Donnees } from "../src/storage/backup";
import * as db from "../src/storage/db";
import { CAL, comptage, mouvement } from "./aide";

const COMPTAGES = [
  comptage("2025-12-11", { montantPieces: 4026, billets: { 100: 3 } }),
  comptage("2025-12-12", {
    montantPieces: 4422,
    billets: { 50: 1, 20: 8, 10: 13, 5: 1 },
    mouvements: [mouvement("depense", 1125, "2025-12-12", "Achat au Carrefour")],
    sumUp: [{ date: "2025-12-12", montant: 6030 }],
    titresRestaurant: [{ id: "t1", montant: 900 }],
    commentaire: 'Erreur de rendu ; client "pressé"',
    comptePar: "Thomas",
  }),
  // 13/12 manqué, 14/12 dimanche, 15/12 lundi fermé
  comptage("2025-12-14", { montantPieces: 50000, sumUp: [{ date: "2025-12-13", montant: 5000 }, { date: "2025-12-14", montant: 6078 }] }),
];

const lignes = () => lignesHistorique("2025-12-11", "2025-12-16", COMPTAGES, CAL, REGLAGES_PAR_DEFAUT, "2025-12-16");

describe("historique", () => {
  it("rend visibles les jours manqués et fermés", () => {
    expect(lignes().map((l) => l.date + ":" + l.sorte)).toEqual([
      "2025-12-11:comptage",
      "2025-12-12:comptage",
      "2025-12-13:manque",
      "2025-12-14:comptage",
      "2025-12-15:ferme",
    ]);
  });

  it("cumule les écarts hors réinitialisations", () => {
    const t = totauxHistorique(lignes());
    // 11/12 = premier comptage (réinitialisation, exclu) ; 12/12 = −0,09 ; 14/12 = 500,00 − 389,22 − 110,78 = 0,00
    expect(t.nbComptages).toBe(3);
    expect(t.ecart).toBe(-9);
    expect(t.totalTR).toBe(900);
  });
});

describe("export CSV", () => {
  const csv = exporterCsv(lignes());
  const rangs = csv.slice(1).trimEnd().split("\r\n");

  it("commence par un BOM et utilise « ; » et CRLF", () => {
    expect(csv.charCodeAt(0)).toBe(0xfeff);
    expect(rangs[0]).toBe(ENTETES_CSV.join(";"));
    expect(rangs).toHaveLength(6);
  });

  it("écrit les montants avec une virgule et 2 décimales, sans symbole", () => {
    const cellules = rangs[2].split(";");
    expect(cellules[0]).toBe("12/12/2025");
    expect(cellules[ENTETES_CSV.indexOf("Espèces comptées")]).toBe("389,22");
    expect(cellules[ENTETES_CSV.indexOf("Écart")]).toBe("-0,09");
    expect(cellules[ENTETES_CSV.indexOf("Espèces SumUp")]).toBe("60,30");
  });

  it("protège les guillemets et les points-virgules", () => {
    expect(rangs[2].endsWith(';Thomas;"Erreur de rendu ; client ""pressé"""')).toBe(true);
  });

  it("signale les réinitialisations, les cumulés et les jours manqués", () => {
    expect(rangs[1].split(";")[2]).toBe("Réinitialisation");
    expect(rangs[1].split(";")[ENTETES_CSV.indexOf("Écart")]).toBe("");
    expect(rangs[3].split(";")[1]).toBe("Manqué");
    expect(rangs[4].split(";")[2]).toBe("Cumulé, 2 jours");
    expect(rangs[5].split(";")[1]).toBe("Fermé");
  });
});

describe("sauvegarde JSON", () => {
  const donnees: Donnees = {
    reglages: { ...REGLAGES_PAR_DEFAUT, nomEtablissement: "Chez Test", fondCible: 15000 },
    comptages: COMPTAGES,
    joursFermes: [{ date: "2025-12-25", motif: "Noël" }],
  };

  it("aller-retour sans perte", () => {
    expect(lireSauvegarde(creerSauvegarde(donnees))).toEqual(donnees);
  });

  it("refuse les fichiers invalides", () => {
    expect(() => lireSauvegarde("pas du json")).toThrow(/JSON/);
    expect(() => lireSauvegarde('{"application":"autre"}')).toThrow(/sauvegarde/);
    const abime = JSON.parse(creerSauvegarde(donnees));
    abime.comptages[0].montantPieces = "40,26";
    expect(() => lireSauvegarde(JSON.stringify(abime))).toThrow(/invalide/);
  });

  it("aller-retour par IndexedDB : restauration puis relecture", async () => {
    await db.remplacerTout(donnees);
    const relu = await db.chargerTout();
    expect(relu.reglages).toEqual(donnees.reglages);
    expect(relu.comptages).toEqual(donnees.comptages);
    expect(relu.joursFermes).toEqual(donnees.joursFermes);

    await db.enregistrerComptage({ ...COMPTAGES[0], montantPieces: 1 });
    await db.supprimerJourFerme("2025-12-25");
    const apres = await db.chargerTout();
    expect(apres.comptages.find((c) => c.date === "2025-12-11")?.montantPieces).toBe(1);
    expect(apres.joursFermes).toEqual([]);

    await db.toutEffacer();
    expect((await db.chargerTout()).comptages).toEqual([]);
  });
});
