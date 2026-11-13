import { useState } from "react";
import { totalTitres } from "../../domain/calculs";
import { nouvelId } from "../../domain/comptage";
import { formatEuros, parseEuros } from "../../domain/money";
import type { Cents, Titre } from "../../domain/types";
import { ChampMontant, Montant } from "./Montant";

interface Props {
  /** « titre-restaurant » ou « chèque vacances » */
  nom: string;
  titres: Titre[];
  onChange(titres: Titre[]): void;
  rapides: Cents[];
  seuilAlerte: Cents;
  disabled?: boolean;
}

/** Saisie titre par titre : champ + Entrée, boutons rapides, liste modifiable, nombre et total. */
export function ListeTitres({ nom, titres, onChange, rapides, seuilAlerte, disabled }: Props) {
  const [texte, setTexte] = useState("");
  const saisi = parseEuros(texte);
  const invalide = texte.trim() !== "" && (saisi == null || saisi === 0);

  const ajouter = (montant: Cents) => onChange([...titres, { id: nouvelId(), montant }]);

  function valider() {
    if (saisi == null || saisi === 0) return;
    ajouter(saisi);
    setTexte("");
  }

  return (
    <div className="liste-titres">
      {!disabled && (
        <>
          <form
            className="ajout"
            onSubmit={(e) => {
              e.preventDefault();
              valider();
            }}
          >
            <label className="champ-montant">
              <span className="sr-only">Montant du {nom}</span>
              <span className="champ-euro">
                <input
                  type="text"
                  inputMode="decimal"
                  autoComplete="off"
                  enterKeyHint="done"
                  placeholder="0,00"
                  value={texte}
                  aria-invalid={invalide}
                  onChange={(e) => setTexte(e.target.value)}
                />
                <span aria-hidden="true">€</span>
              </span>
            </label>
            <button type="submit" className="btn primaire" disabled={saisi == null || saisi === 0}>
              Ajouter
            </button>
          </form>
          {rapides.length > 0 && (
            <div className="rapides" aria-label="Saisie rapide">
              {rapides.map((r) => (
                <button key={r} type="button" className="btn" onClick={() => ajouter(r)}>
                  + {formatEuros(r)}
                </button>
              ))}
            </div>
          )}
        </>
      )}

      {titres.length === 0 ? (
        <p className="discret">Aucun {nom} saisi.</p>
      ) : (
        <ul className="lignes">
          {titres.map((t, i) => (
            <li key={t.id}>
              <span className="rang">{i + 1}</span>
              {disabled ? (
                <Montant cents={t.montant} />
              ) : (
                <ChampMontant
                  label={"Montant du " + nom + " n° " + (i + 1)}
                  labelMasque
                  valeur={t.montant}
                  onChange={(m) => {
                    if (m) onChange(titres.map((x) => (x.id === t.id ? { ...x, montant: m } : x)));
                  }}
                />
              )}
              {t.montant > seuilAlerte && <span className="pastille alerte">montant élevé</span>}
              {!disabled && (
                <button
                  type="button"
                  className="btn discret-btn"
                  onClick={() => onChange(titres.filter((x) => x.id !== t.id))}
                  aria-label={"Supprimer le " + nom + " n° " + (i + 1)}
                >
                  Supprimer
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      <p className="total-ligne">
        <span>
          {titres.length} {titres.length > 1 ? "titres" : "titre"}
        </span>
        <Montant cents={totalTitres(titres)} />
      </p>
    </div>
  );
}
