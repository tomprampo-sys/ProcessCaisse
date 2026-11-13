import type { Cents } from "./types";

const NBSP = " ";
const ESPACE_FINE = " ";
const MOINS = "−";

/**
 * Convertit une saisie en euros ("12,5", "12.50", "1 234,56") en centimes.
 * Renvoie null si la saisie est vide, négative, mal formée ou a plus de 2 décimales.
 */
export function parseEuros(saisie: string): Cents | null {
  const t = saisie.replace(/[\s  €]/g, "").replace(",", ".");
  if (t === "") return null;
  if (!/^(\d+\.?\d{0,2}|\.\d{1,2})$/.test(t)) return null;
  const [entier, decimales = ""] = t.split(".");
  const cents = Number(entier || "0") * 100 + Number((decimales + "00").slice(0, 2));
  return Number.isSafeInteger(cents) ? cents : null;
}

function decomposer(cents: Cents): { negatif: boolean; euros: string; centimes: string } {
  const abs = Math.abs(Math.round(cents));
  return {
    negatif: cents < 0 && abs !== 0,
    euros: String(Math.floor(abs / 100)),
    centimes: String(abs % 100).padStart(2, "0"),
  };
}

/** 1250 -> "12,50" ; 123450 -> "1 234,50" ; -400 -> "−4,00" */
export function formatNombre(cents: Cents): string {
  const { negatif, euros, centimes } = decomposer(cents);
  const groupes = euros.replace(/\B(?=(\d{3})+(?!\d))/g, ESPACE_FINE);
  return `${negatif ? MOINS : ""}${groupes},${centimes}`;
}

/** 1250 -> "12,50 €" — toujours 2 décimales, format français. */
export function formatEuros(cents: Cents): string {
  return `${formatNombre(cents)}${NBSP}€`;
}

/** Écart signé : "+1,75 €", "−4,00 €", "0,00 €". */
export function formatEcart(cents: Cents): string {
  return `${cents > 0 ? "+" : ""}${formatEuros(cents)}`;
}

/** Valeur à remettre dans un champ de saisie : "50,70" (sans séparateur de milliers ni symbole). */
export function formatSaisie(cents: Cents): string {
  const { negatif, euros, centimes } = decomposer(cents);
  return `${negatif ? "-" : ""}${euros},${centimes}`;
}
