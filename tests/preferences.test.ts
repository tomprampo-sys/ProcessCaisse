import { describe, expect, it } from "vitest";
import { sauvegardeEnRetard } from "../src/ui/preferences";

describe("rappel de sauvegarde", () => {
  const maintenant = new Date("2026-11-16T20:00:00Z");

  it("rien à rappeler sur un appareil sans comptage", () => {
    expect(sauvegardeEnRetard(null, 0, maintenant)).toBe(false);
  });

  it("rappel s'il y a des comptages et aucune sauvegarde", () => {
    expect(sauvegardeEnRetard(null, 3, maintenant)).toBe(true);
    expect(sauvegardeEnRetard("date illisible", 3, maintenant)).toBe(true);
  });

  it("rappel seulement au-delà de 7 jours", () => {
    expect(sauvegardeEnRetard("2026-11-10T20:00:00Z", 3, maintenant)).toBe(false);
    expect(sauvegardeEnRetard("2026-11-09T20:00:00Z", 3, maintenant)).toBe(false);
    expect(sauvegardeEnRetard("2026-11-09T19:59:59Z", 3, maintenant)).toBe(true);
  });
});
