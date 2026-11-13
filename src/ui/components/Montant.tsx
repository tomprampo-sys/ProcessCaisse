import { useEffect, useState, type KeyboardEvent } from "react";
import { formatEcart, formatEuros, formatSaisie, parseEuros } from "../../domain/money";
import type { Cents } from "../../domain/types";

/** Montant affiché en euros, 2 décimales, chiffres alignés. */
export function Montant({ cents, signe = false, className = "" }: { cents: Cents | null; signe?: boolean; className?: string }) {
  if (cents == null) return <span className={"montant " + className}>—</span>;
  return <span className={"montant " + className}>{signe ? formatEcart(cents) : formatEuros(cents)}</span>;
}

interface ChampMontantProps {
  valeur: Cents | null;
  /** Appelé avec le montant saisi, ou null si le champ est vidé. Jamais appelé avec une saisie invalide. */
  onChange(valeur: Cents | null): void;
  label: string;
  /** Masque le libellé à l'écran (il reste lu par les lecteurs d'écran). */
  labelMasque?: boolean;
  id?: string;
  disabled?: boolean;
  grand?: boolean;
  placeholder?: string;
  onEntree?(): void;
}

/** Champ de saisie d'un montant en euros : virgule ou point, 2 décimales au plus, reformatage à la sortie. */
export function ChampMontant(p: ChampMontantProps) {
  const [texte, setTexte] = useState(p.valeur ? formatSaisie(p.valeur) : "");
  const invalide = texte.trim() !== "" && parseEuros(texte) == null;

  useEffect(() => {
    // Resynchronise seulement si la valeur a changé ailleurs que dans ce champ.
    setTexte((t) => ((parseEuros(t) ?? 0) === (p.valeur ?? 0) ? t : p.valeur ? formatSaisie(p.valeur) : ""));
  }, [p.valeur]);

  function saisir(t: string) {
    setTexte(t);
    if (t.trim() === "") p.onChange(null);
    else {
      const cents = parseEuros(t);
      if (cents != null) p.onChange(cents);
    }
  }

  function quitter() {
    const cents = parseEuros(texte);
    if (cents != null) setTexte(formatSaisie(cents));
  }

  function touche(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && p.onEntree) {
      e.preventDefault();
      p.onEntree();
    }
  }

  return (
    <label className={"champ-montant" + (p.grand ? " grand" : "")}>
      <span className={p.labelMasque ? "sr-only" : "champ-label"}>{p.label}</span>
      <span className="champ-euro">
        <input
          id={p.id}
          type="text"
          inputMode="decimal"
          autoComplete="off"
          value={texte}
          placeholder={p.placeholder ?? "0,00"}
          disabled={p.disabled}
          aria-invalid={invalide}
          onChange={(e) => saisir(e.target.value)}
          onBlur={quitter}
          onKeyDown={touche}
          onFocus={(e) => e.target.select()}
        />
        <span aria-hidden="true">€</span>
      </span>
      {invalide && <span className="erreur-champ">Montant invalide (2 décimales au plus, pas de négatif)</span>}
    </label>
  );
}

/** Compteur entier avec boutons − / + (nombre de billets). */
export function Compteur(p: { valeur: number; onChange(n: number): void; label: string; max?: number; disabled?: boolean }) {
  const borner = (n: number) => Math.max(0, Math.min(p.max ?? 9999, n));
  return (
    <span className="compteur">
      <button type="button" disabled={p.disabled || p.valeur <= 0} onClick={() => p.onChange(borner(p.valeur - 1))} aria-label={"Retirer un : " + p.label}>
        −
      </button>
      <input
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        autoComplete="off"
        aria-label={p.label}
        value={p.valeur === 0 ? "" : String(p.valeur)}
        placeholder="0"
        disabled={p.disabled}
        onFocus={(e) => e.target.select()}
        onChange={(e) => {
          const chiffres = e.target.value.replace(/\D/g, "");
          p.onChange(borner(chiffres === "" ? 0 : Number(chiffres)));
        }}
      />
      <button
        type="button"
        disabled={p.disabled || (p.max != null && p.valeur >= p.max)}
        onClick={() => p.onChange(borner(p.valeur + 1))}
        aria-label={"Ajouter un : " + p.label}
      >
        +
      </button>
    </span>
  );
}
