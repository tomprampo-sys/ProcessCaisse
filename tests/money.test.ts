import { describe, expect, it } from "vitest";
import { formatEcart, formatEuros, formatSaisie, parseEuros } from "../src/domain/money";

describe("parseEuros", () => {
  it("accepte la virgule, le point et les espaces", () => {
    expect(parseEuros("12,5")).toBe(1250);
    expect(parseEuros("12.50")).toBe(1250);
    expect(parseEuros("1 234,56")).toBe(123456);
    expect(parseEuros("1 234,56 €")).toBe(123456);
    expect(parseEuros("50,74")).toBe(5074);
    expect(parseEuros("50")).toBe(5000);
    expect(parseEuros("0,05")).toBe(5);
    expect(parseEuros(",5")).toBe(50);
  });

  it("refuse le vide, le négatif, 3 décimales et le texte", () => {
    expect(parseEuros("")).toBeNull();
    expect(parseEuros("   ")).toBeNull();
    expect(parseEuros("-4")).toBeNull();
    expect(parseEuros("12,345")).toBeNull();
    expect(parseEuros("abc")).toBeNull();
    expect(parseEuros("1,2,3")).toBeNull();
  });

  it("ne produit jamais d'erreur d'arrondi flottant", () => {
    expect(parseEuros("53,30")).toBe(5330);
    expect(parseEuros("0,29")).toBe(29);
    expect(parseEuros("1,15")).toBe(115);
  });
});

describe("formatEuros", () => {
  it("affiche toujours 2 décimales au format français", () => {
    expect(formatEuros(1250)).toBe("12,50 €");
    expect(formatEuros(5000)).toBe("50,00 €");
    expect(formatEuros(0)).toBe("0,00 €");
    expect(formatEuros(5)).toBe("0,05 €");
    expect(formatEuros(123450)).toBe("1 234,50 €");
    expect(formatEuros(-400)).toBe("−4,00 €");
  });

  it("formate les écarts avec leur signe", () => {
    expect(formatEcart(175)).toBe("+1,75 €");
    expect(formatEcart(-9)).toBe("−0,09 €");
    expect(formatEcart(0)).toBe("0,00 €");
  });

  it("reformate une saisie : 50,7 -> 50,70", () => {
    expect(formatSaisie(parseEuros("50,7")!)).toBe("50,70");
    expect(formatSaisie(123456)).toBe("1234,56");
  });
});
