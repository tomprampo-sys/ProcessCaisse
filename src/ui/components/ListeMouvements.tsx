import { useState } from "react";
import { formatJour } from "../../domain/calendrier";
import { nouvelId } from "../../domain/comptage";
import { parseEuros } from "../../domain/money";
import type { Mouvement, TypeMouvement } from "../../domain/types";
import { Montant } from "./Montant";

export const TYPES_MOUVEMENT: { type: TypeMouvement; nom: string; sens: "sortie" | "entrée"; exemple: string }[] = [
  { type: "depense", nom: "Dépense", sens: "sortie", exemple: "Achat au Carrefour" },
  { type: "remboursement", nom: "Remboursement client", sens: "sortie", exemple: "Gaufre remboursée" },
  { type: "retrait_pochette", nom: "Retrait pochette", sens: "sortie", exemple: "Mis en pochette à midi" },
  { type: "apport", nom: "Apport / recharge", sens: "entrée", exemple: "Recharge caisse" },
];

export const nomMouvement = (type: TypeMouvement) => TYPES_MOUVEMENT.find((t) => t.type === type)!.nom;

interface Props {
  mouvements: Mouvement[];
  onChange(mouvements: Mouvement[]): void;
  /** Jours couverts par le comptage ; le dernier est la date du comptage. */
  periode: string[];
  disabled?: boolean;
}

export function ListeMouvements({ mouvements, onChange, periode, disabled }: Props) {
  const dateComptage = periode[periode.length - 1];
  const [type, setType] = useState<TypeMouvement>("depense");
  const [texte, setTexte] = useState("");
  const [libelle, setLibelle] = useState("");
  const [date, setDate] = useState(dateComptage);
  const [erreur, setErreur] = useState<string | null>(null);

  const dateChoisie = periode.includes(date) ? date : dateComptage;
  const libelleObligatoire = type === "depense" || type === "remboursement";
  const info = TYPES_MOUVEMENT.find((t) => t.type === type)!;

  function ajouter() {
    const montant = parseEuros(texte);
    if (montant == null || montant === 0) return setErreur("Saisissez un montant supérieur à 0,00 €.");
    if (libelleObligatoire && libelle.trim() === "") return setErreur("Le libellé est obligatoire pour une dépense ou un remboursement.");
    onChange([
      ...mouvements,
      { id: nouvelId(), type, montant, libelle: libelle.trim(), date: dateChoisie, creeLe: new Date().toISOString() },
    ]);
    setTexte("");
    setLibelle("");
    setErreur(null);
  }

  return (
    <div className="liste-mouvements">
      {!disabled && (
        <form
          className="ajout-mouvement"
          onSubmit={(e) => {
            e.preventDefault();
            ajouter();
          }}
        >
          <div className="segments" role="radiogroup" aria-label="Type de mouvement">
            {TYPES_MOUVEMENT.map((t) => (
              <button key={t.type} type="button" role="radio" aria-checked={type === t.type} className={type === t.type ? "actif" : ""} onClick={() => setType(t.type)}>
                {t.nom}
              </button>
            ))}
          </div>
          <div className="ajout-champs">
            <label className="champ-montant">
              <span className="champ-label">Montant ({info.sens})</span>
              <span className="champ-euro">
                <input type="text" inputMode="decimal" autoComplete="off" placeholder="0,00" value={texte} onChange={(e) => setTexte(e.target.value)} />
                <span aria-hidden="true">€</span>
              </span>
            </label>
            <label className="champ champ-large">
              <span className="champ-label">Libellé{libelleObligatoire ? "" : " (facultatif)"}</span>
              <input type="text" value={libelle} placeholder={info.exemple} onChange={(e) => setLibelle(e.target.value)} />
            </label>
            {periode.length > 1 && (
              <label className="champ">
                <span className="champ-label">Jour</span>
                <select value={dateChoisie} onChange={(e) => setDate(e.target.value)}>
                  {periode.map((j) => (
                    <option key={j} value={j}>
                      {formatJour(j)}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <button type="submit" className="btn primaire">
              Ajouter
            </button>
          </div>
          {erreur && <p className="erreur-champ" role="alert">{erreur}</p>}
        </form>
      )}

      {mouvements.length === 0 ? (
        <p className="discret">Aucun mouvement de caisse.</p>
      ) : (
        <ul className="lignes">
          {mouvements.map((m) => {
            const hors = !periode.includes(m.date);
            return (
              <li key={m.id} className={hors ? "hors-periode" : ""}>
                <span className={"pastille " + (m.type === "apport" ? "entree" : "sortie")}>{nomMouvement(m.type)}</span>
                <span className="libelle">
                  {m.libelle || "—"}
                  {(periode.length > 1 || hors) && <small> · {formatJour(m.date)}</small>}
                  {hors && <small> · hors période, ignoré</small>}
                </span>
                <Montant cents={m.type === "apport" ? m.montant : -m.montant} signe />
                {!disabled && (
                  <button type="button" className="btn discret-btn" onClick={() => onChange(mouvements.filter((x) => x.id !== m.id))} aria-label={"Supprimer : " + nomMouvement(m.type) + " " + m.libelle}>
                    Supprimer
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
