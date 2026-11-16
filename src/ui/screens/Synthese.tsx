import { useState } from "react";
import { valeursBillets } from "../../domain/billets";
import type { Synthese as TSynthese } from "../../domain/calculs";
import { formatDate, formatJour } from "../../domain/calendrier";
import { formatEuros } from "../../domain/money";
import type { Analyse, Comptage, MotifReinitialisation } from "../../domain/types";
import { ChampMontant, Compteur, Montant } from "../components/Montant";
import { naviguer } from "../navigation";
import { ecrirePreference } from "../preferences";
import { imprimer, MOTIFS_REINIT } from "../print/Documents";
import { useStore } from "../store";

interface Props {
  c: Comptage;
  /** false tant que rien n'a été saisi (comptage pas encore enregistré). */
  existe: boolean;
  analyse: Analyse;
  s: TSynthese;
  modifier(patch: Partial<Comptage>): void;
  ouvrirReinit: boolean;
}

const MOTIFS_CHOISIS: MotifReinitialisation[] = ["periode_trop_longue", "erreur", "autre"];

export function Synthese({ c, existe, analyse, s, modifier, ouvrirReinit }: Props) {
  const store = useStore();
  const { reglages } = store;
  const verrouille = c.statut === "cloture";
  const reinit = analyse.type === "reinitialisation";

  const [panneauReinit, setPanneauReinit] = useState(ouvrirReinit && !reinit && !verrouille);
  const [motif, setMotif] = useState<MotifReinitialisation>(analyse.reinitRecommandee ? "periode_trop_longue" : "erreur");
  const [commentaireReinit, setCommentaireReinit] = useState("");
  const [erreurs, setErreurs] = useState<string[]>([]);

  // Noms déjà utilisés dans l'historique, proposés pendant la saisie.
  const noms = [...new Set(store.comptages.map((x) => x.comptePar?.trim()).filter((n): n is string => !!n))].sort((a, b) => a.localeCompare(b, "fr"));
  const billetsComptes = valeursBillets(true).filter((v) => (c.billets[v] || 0) > 0);
  const commentaireRequis = !reinit && s.horsTolerance && reglages.commentaireObligatoireSiEcart;

  function confirmerReinit() {
    if (commentaireReinit.trim() === "" && motif === "autre") {
      setErreurs(["Précisez le motif de la réinitialisation."]);
      return;
    }
    modifier({ type: "reinitialisation", motifReinitialisation: motif, commentaireReinitialisation: commentaireReinit.trim() || undefined });
    setPanneauReinit(false);
    setErreurs([]);
  }

  function cloturer() {
    const liste: string[] = [];
    if (commentaireRequis && !c.commentaire?.trim()) {
      liste.push("Un commentaire est obligatoire : l'écart dépasse la tolérance (" + formatEuros(reglages.toleranceEcart) + ").");
    }
    setErreurs(liste);
    if (liste.length > 0) return;

    if (!reinit && c.sumUpTotalSaisi == null) {
      const sans = analyse.periode.filter((j) => !c.sumUp.some((x) => x.date === j));
      if (sans.length > 0 && !window.confirm("Aucun montant SumUp saisi pour : " + sans.map(formatJour).join(", ") + ".\nClôturer quand même ?")) return;
    }
    const maintenant = new Date().toISOString();
    store.enregistrerComptage({
      ...c,
      ...(analyse.premier ? { type: "reinitialisation" as const, motifReinitialisation: "premier_comptage" as const } : {}),
      statut: "cloture",
      clotureLe: maintenant,
      modifieLe: maintenant,
    });
  }

  function rouvrir() {
    if (!window.confirm("Rouvrir ce comptage clôturé ?\nTant qu'il n'est pas clôturé à nouveau, il ne sert plus de référence aux comptages suivants.")) return;
    store.enregistrerComptage({ ...c, statut: "brouillon", clotureLe: undefined, modifieLe: new Date().toISOString() });
  }

  function supprimer() {
    if (!window.confirm("Supprimer ce brouillon ? Toute la saisie du " + formatDate(c.date) + " sera perdue.")) return;
    store.supprimerComptage(c.id);
    naviguer("/");
  }

  return (
    <section id="synthese" className="carte synthese">
      <h2>7. Synthèse et clôture</h2>

      <p className="type-comptage">
        {analyse.type === "normal" && <span className="pastille">Comptage normal</span>}
        {analyse.type === "cumule" && (
          <span className="pastille info">
            Comptage cumulé du {formatDate(analyse.periode[0])} au {formatDate(c.date)} — {analyse.periode.length} jours
          </span>
        )}
        {reinit && (
          <span className="pastille alerte">
            Réinitialisation — {analyse.premier ? "premier comptage" : MOTIFS_REINIT[c.motifReinitialisation ?? "autre"]}
            {c.commentaireReinitialisation ? " : " + c.commentaireReinitialisation : ""}
          </span>
        )}
      </p>

      <div className={"ecart-bloc " + (reinit || !s.statut ? "neutre" : s.statut)}>
        <div>
          <span>Écart espèces</span>
          {reinit ? <strong className="montant">— réinitialisation</strong> : <Montant cents={s.ecart} signe className="tres-grand" />}
          {!reinit && s.statut && <em>{s.statut === "juste" ? "Caisse juste" : s.statut === "excedent" ? "Excédent" : "Manque"}</em>}
        </div>
        <div>
          <span>Pochette</span>
          <Montant cents={s.totalPochette} className="tres-grand" />
          <em>Fond laissé : {formatEuros(s.fondLaisse)}</em>
        </div>
      </div>
      {!reinit && s.ecart != null && Math.abs(s.ecart) > reglages.seuilAlerteEcart && (
        <p className="message alerte">Écart supérieur à {formatEuros(reglages.seuilAlerteEcart)} : vérifiez le comptage, les mouvements et le montant SumUp.</p>
      )}

      <table className="calcul">
        <tbody>
          <tr><th scope="row">Espèces comptées</th><td><Montant cents={s.especesComptees} /></td></tr>
          <tr><th scope="row">− Référence{analyse.comptageReference ? " (fond du " + formatDate(analyse.comptageReference.date) + ")" : ""}</th><td><Montant cents={s.reference} /></td></tr>
          <tr><th scope="row">+ Sorties (dépenses, remboursements, retraits pochette)</th><td><Montant cents={s.mouvements.sorties} /></td></tr>
          <tr><th scope="row">− Entrées (apports)</th><td><Montant cents={s.mouvements.entrees} /></td></tr>
          <tr className="fort"><th scope="row">= Recette espèces</th><td>{reinit ? "—" : <Montant cents={s.recette} />}</td></tr>
          <tr><th scope="row">− Espèces SumUp</th><td><Montant cents={s.theorique} /></td></tr>
          <tr className="fort"><th scope="row">= Écart</th><td>{reinit ? "—" : <Montant cents={s.ecart} signe />}</td></tr>
        </tbody>
      </table>

      {!verrouille && !reinit && !panneauReinit && (
        <button type="button" className="btn" onClick={() => setPanneauReinit(true)}>
          Réinitialiser le fond de caisse
        </button>
      )}
      {!verrouille && reinit && !analyse.premier && (
        <button type="button" className="btn" onClick={() => modifier({ type: "normal", motifReinitialisation: undefined, commentaireReinitialisation: undefined })}>
          Annuler la réinitialisation
        </button>
      )}
      {panneauReinit && !verrouille && !reinit && (
        <div className="panneau">
          <h3>Réinitialiser le fond de caisse</h3>
          <p>
            Aucune recette ni écart ne sera calculé pour ce comptage. Le fond laissé en caisse deviendra la nouvelle référence, et ce comptage sera exclu du cumul des écarts.
          </p>
          <label className="champ">
            <span className="champ-label">Motif</span>
            <select value={motif} onChange={(e) => setMotif(e.target.value as MotifReinitialisation)}>
              {MOTIFS_CHOISIS.map((m) => (
                <option key={m} value={m}>{MOTIFS_REINIT[m]}</option>
              ))}
            </select>
          </label>
          <label className="champ">
            <span className="champ-label">Précision{motif === "autre" ? "" : " (facultatif)"}</span>
            <input type="text" value={commentaireReinit} onChange={(e) => setCommentaireReinit(e.target.value)} />
          </label>
          <div className="actions">
            <button type="button" className="btn primaire" onClick={confirmerReinit}>Confirmer la réinitialisation</button>
            <button type="button" className="btn" onClick={() => setPanneauReinit(false)}>Annuler</button>
          </div>
        </div>
      )}

      <h3>Fond de caisse et pochette</h3>
      <p className="discret">
        {s.monnaiePochette > 0
          ? "Monnaie : " + formatEuros(s.montantPieces - s.monnaiePochette) + " restent en caisse, " + formatEuros(s.monnaiePochette) + " partent en pochette."
          : "La monnaie (" + formatEuros(s.montantPieces) + ") reste en caisse."}{" "}
        Fond cible : {formatEuros(reglages.fondCible)}.
      </p>
      {billetsComptes.length > 0 && (
        <table className="fond">
          <thead>
            <tr>
              <th scope="col">Billet</th>
              <th scope="col">Comptés</th>
              <th scope="col">Gardés en caisse</th>
              <th scope="col">Pochette</th>
            </tr>
          </thead>
          <tbody>
            {billetsComptes.map((v) => (
              <tr key={v}>
                <th scope="row">{v} €</th>
                <td>{c.billets[v]}</td>
                <td>
                  <Compteur
                    label={"Billets de " + v + " € gardés en caisse"}
                    valeur={c.billetsGardes[v] || 0}
                    max={c.billets[v]}
                    disabled={verrouille || !!c.pasDePochette}
                    onChange={(n) => modifier({ billetsGardes: { ...c.billetsGardes, [v]: n }, fondManuel: true })}
                  />
                </td>
                <td>{s.pochette[v] || 0}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <th scope="row" colSpan={2}>Total</th>
              <td><Montant cents={s.fondLaisse} /></td>
              <td><Montant cents={s.totalPochette} /></td>
            </tr>
          </tfoot>
        </table>
      )}
      <ChampMontant
        label="Monnaie mise en pochette (facultatif)"
        valeur={c.monnaiePochette ?? null}
        disabled={verrouille || !!c.pasDePochette}
        onChange={(m) => modifier({ monnaiePochette: m ?? undefined })}
      />
      {!c.pasDePochette && s.especesComptees < reglages.fondCible && s.especesComptees > 0 && (
        <p className="message alerte">Espèces comptées inférieures au fond cible : tout reste en caisse, pas de pochette.</p>
      )}
      {!c.pasDePochette && s.especesComptees >= reglages.fondCible && s.fondLaisse !== reglages.fondCible && (
        <p className="message info">Fond : {formatEuros(s.fondLaisse)} au lieu de {formatEuros(reglages.fondCible)}.</p>
      )}
      <div className="actions">
        <label className="case">
          <input type="checkbox" checked={!!c.pasDePochette} disabled={verrouille} onChange={(e) => modifier({ pasDePochette: e.target.checked, fondManuel: false })} />
          Pas de pochette aujourd'hui
        </label>
        {(c.fondManuel || s.monnaiePochette > 0) && !verrouille && (
          <button type="button" className="btn" onClick={() => modifier({ fondManuel: false, pasDePochette: false, monnaiePochette: undefined })}>
            Revenir à la proposition
          </button>
        )}
      </div>

      <h3>Titres</h3>
      <table className="calcul">
        <tbody>
          <tr><th scope="row">Titres-restaurant ({s.nbTR})</th><td><Montant cents={s.totalTR} /></td></tr>
          <tr><th scope="row">Chèques vacances ({s.nbCV})</th><td><Montant cents={s.totalCV} /></td></tr>
          <tr className="fort"><th scope="row">Total général (espèces + titres)</th><td><Montant cents={s.totalGeneral} /></td></tr>
        </tbody>
      </table>

      <label className="champ">
        <span className="champ-label">Commentaire du jour{commentaireRequis ? " (obligatoire : écart hors tolérance)" : ""}</span>
        <textarea rows={3} value={c.commentaire ?? ""} disabled={verrouille} onChange={(e) => modifier({ commentaire: e.target.value })} />
      </label>
      <label className="champ">
        <span className="champ-label">Compté par</span>
        <input
          type="text"
          list="noms-compte-par"
          value={c.comptePar ?? ""}
          disabled={verrouille}
          autoComplete="off"
          onChange={(e) => {
            modifier({ comptePar: e.target.value });
            ecrirePreference("comptePar", e.target.value.trim());
          }}
        />
        <datalist id="noms-compte-par">
          {noms.map((n) => (
            <option key={n} value={n} />
          ))}
        </datalist>
      </label>

      {erreurs.length > 0 && (
        <div className="message erreur" role="alert">
          {erreurs.map((e) => (
            <p key={e}>{e}</p>
          ))}
        </div>
      )}

      <div className="actions no-print">
        {verrouille ? (
          <button type="button" className="btn" onClick={rouvrir}>Rouvrir le comptage</button>
        ) : (
          <button type="button" className="btn primaire grand" onClick={cloturer}>Clôturer le comptage</button>
        )}
        <button type="button" className="btn" onClick={() => imprimer("fiche", reglages.formatImpression)}>Imprimer la fiche</button>
        <button type="button" className="btn" disabled={s.totalPochette === 0} onClick={() => imprimer("pochette", reglages.formatImpression)}>Bordereau de pochette</button>
        <button type="button" className="btn" disabled={s.nbTR + s.nbCV === 0} onClick={() => imprimer("titres", reglages.formatImpression)}>Listes TR / CV</button>
        {existe && !verrouille && (
          <button type="button" className="btn danger" onClick={supprimer}>Supprimer ce brouillon</button>
        )}
      </div>
      {verrouille && c.clotureLe && (
        <p className="discret">
          Clôturé le {new Date(c.clotureLe).toLocaleString("fr-FR")} · dernière modification le {new Date(c.modifieLe).toLocaleString("fr-FR")}
        </p>
      )}
    </section>
  );
}
