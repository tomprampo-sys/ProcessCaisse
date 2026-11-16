import { describe, expect, it } from "vitest";
import { totalBillets } from "../src/domain/billets";
import { fondLaisse } from "../src/domain/calculs";
import { normaliserFond, proposerFond } from "../src/domain/fondDeCaisse";

const COMPOSITION = { 5: 6, 10: 8, 20: 5 };

describe("proposerFond", () => {
  it("cible atteinte exactement", () => {
    const p = proposerFond({
      montantPieces: 5000,
      billets: { 5: 4, 10: 10, 20: 10, 50: 4 },
      fondCible: 30000,
      compositionCible: COMPOSITION,
    });
    expect(p.fondLaisse).toBe(30000);
    expect(p.alerte).toBe("ok");
    expect(p.gardes).toEqual({ 5: 4, 10: 9, 20: 7 });
    expect(p.pochette).toEqual({ 10: 1, 20: 3, 50: 4 });
    expect(p.totalPochette).toBe(27000);
  });

  it("montant exact impossible : au plus près par défaut, écart signalé", () => {
    const p = proposerFond({
      montantPieces: 5074,
      billets: { 5: 4, 10: 10, 20: 10, 50: 4 },
      fondCible: 30000,
      compositionCible: COMPOSITION,
    });
    // 50,74 + composition (200,00) + 40,00 : il ne reste aucun billet de 5 € pour s'approcher davantage
    expect(p.fondLaisse).toBe(29074);
    expect(p.alerte).toBe("sous_cible");
  });

  it("choisit la meilleure combinaison, pas la première venue", () => {
    const p = proposerFond({ montantPieces: 25000, billets: { 20: 1, 50: 1 }, fondCible: 30000, compositionCible: {} });
    expect(p.gardes).toEqual({ 50: 1 });
    expect(p.fondLaisse).toBe(30000);
  });

  it("une composition cible supérieure au fond cible est réduite", () => {
    const p = proposerFond({ montantPieces: 0, billets: { 50: 10 }, fondCible: 20000, compositionCible: { 50: 10 } });
    expect(p.gardes).toEqual({ 50: 4 });
    expect(p.fondLaisse).toBe(20000);
  });

  it("pièces seules au-dessus de la cible : aucun billet gardé", () => {
    const p = proposerFond({ montantPieces: 35000, billets: { 20: 3 }, fondCible: 30000, compositionCible: COMPOSITION });
    expect(p.gardes).toEqual({});
    expect(p.fondLaisse).toBe(35000);
    expect(p.totalPochette).toBe(6000);
    expect(p.alerte).toBe("pieces_depassent");
  });

  it("espèces sous la cible : tout reste en caisse, pochette à 0", () => {
    const p = proposerFond({ montantPieces: 4000, billets: { 20: 3, 50: 1 }, fondCible: 30000, compositionCible: COMPOSITION });
    expect(p.gardes).toEqual({ 20: 3, 50: 1 });
    expect(p.totalPochette).toBe(0);
    expect(p.alerte).toBe("especes_insuffisantes");
  });

  it("invariant : fond laissé + pochette = espèces comptées, sans jamais dépasser la cible avec des billets", () => {
    let graine = 42;
    const alea = (max: number) => {
      graine = (graine * 1664525 + 1013904223) % 4294967296;
      return graine % (max + 1);
    };
    for (let i = 0; i < 500; i++) {
      const billets: Record<number, number> = {};
      const composition: Record<number, number> = {};
      for (const v of [5, 10, 20, 50, 100, 200]) {
        if (alea(2) > 0) billets[v] = alea(12);
        if (alea(2) > 0) composition[v] = alea(10);
      }
      const entree = { montantPieces: alea(40000), billets, fondCible: alea(8) * 5000, compositionCible: composition };
      const p = proposerFond(entree);
      const especes = entree.montantPieces + totalBillets(billets);
      expect(p.fondLaisse + p.totalPochette).toBe(especes);
      for (const v of Object.keys(billets).map(Number)) {
        expect((p.gardes[v] || 0) + (p.pochette[v] || 0)).toBe(billets[v]);
      }
      if (especes >= entree.fondCible && totalBillets(p.gardes) > 0) {
        expect(p.fondLaisse).toBeLessThanOrEqual(entree.fondCible);
      }
    }
  });
});

describe("normaliserFond", () => {
  const reglages = { fondCible: 30000, compositionCibleBillets: COMPOSITION };
  const base = { montantPieces: 5000, billets: { 5: 4, 10: 10, 20: 10, 50: 4 }, billetsGardes: {} };

  it("applique la proposition automatique par défaut", () => {
    expect(normaliserFond(base, reglages).billetsGardes).toEqual({ 5: 4, 10: 9, 20: 7 });
  });

  it("« pas de pochette » : tout reste en caisse", () => {
    expect(normaliserFond({ ...base, pasDePochette: true }, reglages).billetsGardes).toEqual(base.billets);
  });

  it("la monnaie mise en pochette sort du fond et est bornée à la monnaie comptée", () => {
    const c = normaliserFond({ ...base, fondManuel: true, billetsGardes: { 20: 5 }, monnaiePochette: 49 }, reglages);
    expect(c.monnaiePochette).toBe(49);
    expect(fondLaisse(c)).toBe(5000 - 49 + 10000);
    expect(normaliserFond({ ...base, monnaiePochette: 9999 }, reglages).monnaiePochette).toBe(5000);
    expect(normaliserFond({ ...base, monnaiePochette: 49, pasDePochette: true }, reglages).monnaiePochette).toBeUndefined();
  });

  it("un ajustement manuel est conservé, borné au nombre de billets comptés", () => {
    const c = { ...base, fondManuel: true, billetsGardes: { 50: 9, 20: 2, 100: 1 } };
    expect(normaliserFond(c, reglages).billetsGardes).toEqual({ 50: 4, 20: 2 });
  });
});
