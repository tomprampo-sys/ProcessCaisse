import { describe, expect, it } from "vitest";
import { calculerSynthese } from "../src/domain/calculs";
import { estOuvert, jourOuverturePrecedent, joursOuvertureEntre } from "../src/domain/calendrier";
import { analyserComptage, comptageDeReference } from "../src/domain/reference";
import type { Calendrier } from "../src/domain/types";
import { CAL, comptage } from "./aide";

const SEUIL = 7;

describe("calendrier", () => {
  it("fermé le lundi : le jour d'ouverture avant le mardi est le dimanche", () => {
    expect(estOuvert("2025-12-29", CAL)).toBe(false); // lundi
    expect(jourOuverturePrecedent("2025-12-30", CAL)).toBe("2025-12-28");
  });

  it("un jour marqué fermé n'est pas un jour d'ouverture", () => {
    const cal: Calendrier = { ...CAL, joursFermes: ["2025-12-25"] };
    expect(estOuvert("2025-12-25", cal)).toBe(false);
    expect(jourOuverturePrecedent("2025-12-26", cal)).toBe("2025-12-24");
  });

  it("une période de fermeture saisonnière est sautée", () => {
    const cal: Calendrier = { ...CAL, periodesFermeture: [{ debut: "2025-04-01", fin: "2025-09-07" }] };
    expect(jourOuverturePrecedent("2025-09-09", cal)).toBe("2025-03-30"); // 08/09 lundi, 31/03 lundi
    expect(joursOuvertureEntre("2025-03-30", "2025-09-09", cal)).toEqual(["2025-09-09"]);
  });
});

describe("reference", () => {
  it("veille comptée -> comptage normal d'un jour", () => {
    const a = analyserComptage("2025-12-12", "normal", [comptage("2025-12-11")], CAL, SEUIL);
    expect(a.type).toBe("normal");
    expect(a.periode).toEqual(["2025-12-12"]);
    expect(a.joursManques).toEqual([]);
  });

  it("mardi après un lundi fermé -> référence le dimanche, comptage normal", () => {
    const a = analyserComptage("2025-12-30", "normal", [comptage("2025-12-28")], CAL, SEUIL);
    expect(a.type).toBe("normal");
    expect(a.comptageReference?.date).toBe("2025-12-28");
    expect(a.periode).toEqual(["2025-12-30"]);
  });

  it("jour férié marqué fermé -> comptage normal d'un jour", () => {
    const cal: Calendrier = { ...CAL, joursFermes: ["2025-12-25"] };
    const a = analyserComptage("2025-12-26", "normal", [comptage("2025-12-24")], cal, SEUIL);
    expect(a.type).toBe("normal");
    expect(a.periode).toEqual(["2025-12-26"]);
  });

  it("réouverture après fermeture saisonnière -> référence avant la fermeture, un seul jour", () => {
    const cal: Calendrier = { ...CAL, periodesFermeture: [{ debut: "2025-04-01", fin: "2025-09-07" }] };
    const a = analyserComptage("2025-09-09", "normal", [comptage("2025-03-30")], cal, SEUIL);
    expect(a.type).toBe("normal");
    expect(a.comptageReference?.date).toBe("2025-03-30");
    expect(a.periode).toEqual(["2025-09-09"]);
  });

  it("veille non comptée -> comptage cumulé, jamais de réinitialisation automatique", () => {
    // samedi 13/12 compté, dimanche 14/12 manqué, lundi 15/12 fermé, mardi 16/12
    const a = analyserComptage("2025-12-16", "normal", [comptage("2025-12-13")], CAL, SEUIL);
    expect(a.type).toBe("cumule");
    expect(a.periode).toEqual(["2025-12-14", "2025-12-16"]);
    expect(a.joursManques).toEqual(["2025-12-14"]);
    expect(a.reinitRecommandee).toBe(false);
  });

  it("période au-delà du seuil -> réinitialisation recommandée mais non imposée", () => {
    const a = analyserComptage("2025-12-30", "normal", [comptage("2025-12-13")], CAL, SEUIL);
    expect(a.periode.length).toBeGreaterThan(SEUIL);
    expect(a.type).toBe("cumule");
    expect(a.reinitRecommandee).toBe(true);
  });

  it("réinitialisation choisie -> pas d'écart, et le fond laissé devient la nouvelle référence", () => {
    const ref = comptage("2025-12-13", { montantPieces: 5000 });
    const reinit = comptage("2025-12-30", {
      type: "reinitialisation",
      montantPieces: 4000,
      billets: { 20: 10 },
      billetsGardes: { 20: 5 },
      sumUp: [{ date: "2025-12-30", montant: 9900 }],
    });
    const a = analyserComptage("2025-12-30", reinit.type, [ref, reinit], CAL, SEUIL);
    expect(a.type).toBe("reinitialisation");
    expect(a.reinitRecommandee).toBe(false);
    const s = calculerSynthese(reinit, a, 0);
    expect(s.recette).toBeNull();
    expect(s.ecart).toBeNull();
    expect(s.totalPochette).toBe(10000);

    const suivant = analyserComptage("2025-12-31", "normal", [ref, reinit], CAL, SEUIL);
    expect(suivant.type).toBe("normal");
    expect(suivant.reference).toBe(14000);
  });

  it("premier comptage -> réinitialisation", () => {
    const a = analyserComptage("2025-12-12", "normal", [], CAL, SEUIL);
    expect(a.type).toBe("reinitialisation");
    expect(a.premier).toBe(true);
    expect(a.reference).toBeNull();
  });

  it("un brouillon ne sert jamais de référence", () => {
    const brouillon = comptage("2025-12-11", { statut: "brouillon" });
    expect(comptageDeReference("2025-12-12", [brouillon])).toBeNull();
    expect(comptageDeReference("2025-12-12", [comptage("2025-12-10"), brouillon])?.date).toBe("2025-12-10");
  });

  it("saisie rétroactive du jour manqué -> le comptage suivant redevient un comptage d'un jour", () => {
    const samedi = comptage("2025-12-13");
    const mardi = comptage("2025-12-16");
    expect(analyserComptage("2025-12-16", "normal", [samedi, mardi], CAL, SEUIL).type).toBe("cumule");
    const dimanche = comptage("2025-12-14");
    const apres = analyserComptage("2025-12-16", "normal", [samedi, mardi, dimanche], CAL, SEUIL);
    expect(apres.type).toBe("normal");
    expect(apres.periode).toEqual(["2025-12-16"]);
    expect(apres.comptageReference?.date).toBe("2025-12-14");
  });

  it("une réinitialisation reste une réinitialisation après une saisie rétroactive", () => {
    const tous = [comptage("2025-12-13"), comptage("2025-12-14"), comptage("2025-12-16", { type: "reinitialisation" })];
    expect(analyserComptage("2025-12-16", "reinitialisation", tous, CAL, SEUIL).type).toBe("reinitialisation");
  });
});
