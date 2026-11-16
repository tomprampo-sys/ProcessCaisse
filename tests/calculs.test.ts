import { describe, expect, it } from "vitest";
import { calculerSynthese, especesComptees, horsTolerance } from "../src/domain/calculs";
import { formatEuros } from "../src/domain/money";
import { analyserComptage } from "../src/domain/reference";
import { CAL, comptage, mouvement } from "./aide";

const SEUIL = 7;

function synthese(date: string, tous: ReturnType<typeof comptage>[], tolerance = 0) {
  const c = tous.find((x) => x.date === date)!;
  const analyse = analyserComptage(date, c.type, tous, CAL, SEUIL);
  return { analyse, s: calculerSynthese(c, analyse, tolerance) };
}

describe("cas réels tirés du tableur", () => {
  it("saisie du 12/12/2025 : 389,22 € exactement", () => {
    const c = comptage("2025-12-12", { montantPieces: 4422, billets: { 50: 1, 20: 8, 10: 13, 5: 1 } });
    expect(especesComptees(c)).toBe(38922);
    expect(formatEuros(especesComptees(c))).toBe("389,22 €");
  });

  it("12/12/2025 : écart −0,09 €", () => {
    const veille = comptage("2025-12-11", { montantPieces: 4026, billets: { 100: 3 } }); // fond 340,26
    const jour = comptage("2025-12-12", {
      montantPieces: 4422,
      billets: { 50: 1, 20: 8, 10: 13, 5: 1 },
      mouvements: [mouvement("depense", 1125, "2025-12-12", "Achat au Carrefour")],
      sumUp: [{ date: "2025-12-12", montant: 6030 }],
    });
    const { analyse, s } = synthese("2025-12-12", [veille, jour]);
    expect(analyse.type).toBe("normal");
    expect(s.reference).toBe(34026);
    expect(s.recette).toBe(6021);
    expect(s.ecart).toBe(-9);
    expect(s.statut).toBe("manque");
  });

  it("30/12/2025 (mardi, lundi fermé) : recette 122,35 €, écart −4,00 €", () => {
    const dimanche = comptage("2025-12-28", { montantPieces: 6070, billets: { 100: 4 } }); // fond 460,70
    const mardi = comptage("2025-12-30", {
      montantPieces: 4448,
      billets: { 100: 5 },
      mouvements: [
        mouvement("depense", 897, "2025-12-30"),
        mouvement("remboursement", 2380, "2025-12-30"),
        mouvement("remboursement", 580, "2025-12-30", "gaufre"),
      ],
      sumUp: [{ date: "2025-12-30", montant: 12635 }],
    });
    const { analyse, s } = synthese("2025-12-30", [dimanche, mardi]);
    expect(analyse.type).toBe("normal");
    expect(s.especesComptees).toBe(54448);
    expect(s.reference).toBe(46070);
    expect(s.recette).toBe(12235);
    expect(s.ecart).toBe(-400);
  });

  it("07/02/2026, comptage cumulé sur 3 jours : écart +1,75 €", () => {
    const mercredi = comptage("2026-02-04", { montantPieces: 798, billets: { 100: 5 } }); // fond 507,98
    const samedi = comptage("2026-02-07", {
      montantPieces: 8423,
      billets: { 100: 6 },
      mouvements: [
        mouvement("retrait_pochette", 15000, "2026-02-05"),
        mouvement("remboursement", 4000, "2026-02-06"),
        mouvement("depense", 1660, "2026-02-07"),
        mouvement("apport", 9500, "2026-02-07", "Recharge caisse"),
      ],
      sumUp: [
        { date: "2026-02-05", montant: 3230 },
        { date: "2026-02-06", montant: 12660 },
        { date: "2026-02-07", montant: 12720 },
      ],
    });
    const { analyse, s } = synthese("2026-02-07", [mercredi, samedi]);
    expect(analyse.type).toBe("cumule");
    expect(analyse.periode).toEqual(["2026-02-05", "2026-02-06", "2026-02-07"]);
    expect(s.theorique).toBe(28610);
    expect(s.mouvements.sorties).toBe(20660);
    expect(s.mouvements.entrees).toBe(9500);
    expect(s.recette).toBe(28785);
    expect(s.ecart).toBe(175);
    expect(s.statut).toBe("excedent");
  });
});

describe("règles de calcul", () => {
  it("la pochette de la veille réduit la référence du lendemain", () => {
    const veille = comptage("2025-12-11", { montantPieces: 5000, billets: { 50: 6 }, billetsGardes: { 50: 2 } });
    const jour = comptage("2025-12-12", { montantPieces: 5000, billets: { 50: 3 }, sumUp: [{ date: "2025-12-12", montant: 5000 }] });
    const { s } = synthese("2025-12-12", [veille, jour]);
    expect(s.reference).toBe(15000);
    expect(s.recette).toBe(5000);
    expect(s.ecart).toBe(0);
    expect(s.statut).toBe("juste");
  });

  it("la monnaie mise en pochette réduit aussi la référence du lendemain", () => {
    // Cas du tableur : pochette de 130,49 € le 26/12 (130 € en billets + 0,49 € de monnaie)
    const veille = comptage("2025-12-26", { montantPieces: 3304, billets: { 20: 15, 10: 13 }, billetsGardes: { 20: 10, 10: 10 }, monnaiePochette: 49 });
    const jour = comptage("2025-12-27", { montantPieces: 3304, billets: { 50: 1, 20: 10, 10: 17, 5: 6 }, sumUp: [{ date: "2025-12-27", montant: 15090 }] });
    const tous = [veille, jour];
    expect(synthese("2025-12-26", tous).s.totalPochette).toBe(13049);
    const { s } = synthese("2025-12-27", tous);
    expect(s.reference).toBe(46304 - 13049);
    expect(s.ecart).toBe(-41);
  });

  it("un total SumUp saisi directement remplace le détail par jour", () => {
    const ref = comptage("2026-02-04");
    const jour = comptage("2026-02-07", {
      montantPieces: 10000,
      sumUp: [{ date: "2026-02-05", montant: 100 }],
      sumUpTotalSaisi: 10000,
    });
    expect(synthese("2026-02-07", [ref, jour]).s.ecart).toBe(0);
  });

  it("après une saisie rétroactive, SumUp et mouvements hors période sont ignorés", () => {
    const samedi = comptage("2025-12-13", { montantPieces: 10000 });
    const mardi = comptage("2025-12-16", {
      montantPieces: 12000,
      mouvements: [mouvement("depense", 500, "2025-12-14"), mouvement("depense", 300, "2025-12-16")],
      sumUp: [
        { date: "2025-12-14", montant: 4000 },
        { date: "2025-12-16", montant: 2300 },
      ],
    });
    const dimanche = comptage("2025-12-14", { montantPieces: 10000 });
    const { analyse, s } = synthese("2025-12-16", [samedi, dimanche, mardi]);
    expect(analyse.type).toBe("normal");
    expect(s.theorique).toBe(2300);
    expect(s.mouvements.sorties).toBe(300);
    expect(s.mouvementsHorsPeriode).toBe(1);
    expect(s.ecart).toBe(0);
  });

  it("totaux informatifs TR et chèques vacances", () => {
    const c = comptage("2025-12-12", {
      montantPieces: 1000,
      billets: { 10: 2 },
      titresRestaurant: [{ id: "a", montant: 900 }, { id: "b", montant: 1150 }],
      chequesVacances: [{ id: "c", montant: 2000 }],
    });
    const { s } = synthese("2025-12-12", [c]);
    expect([s.nbTR, s.totalTR, s.nbCV, s.totalCV]).toEqual([2, 2050, 1, 2000]);
    expect(s.totalGeneral).toBe(3000 + 2050 + 2000);
  });

  it("écart dans / hors tolérance", () => {
    expect(horsTolerance(-9, 0)).toBe(true);
    expect(horsTolerance(-9, 10)).toBe(false);
    expect(horsTolerance(10, 10)).toBe(false);
    expect(horsTolerance(11, 10)).toBe(true);
    expect(horsTolerance(0, 0)).toBe(false);
  });
});
