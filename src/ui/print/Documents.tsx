import { valeursBillets } from "../../domain/billets";
import type { Synthese } from "../../domain/calculs";
import { formatDate, formatJour, formatJourComplet } from "../../domain/calendrier";
import type { Analyse, Comptage, Reglages, Titre } from "../../domain/types";
import { nomMouvement } from "../components/ListeMouvements";
import { Montant } from "../components/Montant";

export const MOTIFS_REINIT: Record<string, string> = {
  periode_trop_longue: "Période trop longue",
  premier_comptage: "Premier comptage",
  erreur: "Erreur",
  autre: "Autre",
};

export type DocumentImpression = "fiche" | "pochette" | "titres";

interface Props {
  comptage: Comptage;
  analyse: Analyse;
  synthese: Synthese;
  reglages: Reglages;
}

function Entete({ titre, comptage, reglages }: { titre: string } & Pick<Props, "comptage" | "reglages">) {
  return (
    <header className="doc-entete">
      {reglages.nomEtablissement && <p className="doc-etablissement">{reglages.nomEtablissement}</p>}
      <h1>{titre}</h1>
      <p>
        {formatJourComplet(comptage.date)}
        {comptage.statut === "brouillon" && " — BROUILLON, non clôturé"}
      </p>
    </header>
  );
}

function Ligne({ nom, children, fort }: { nom: string; children: React.ReactNode; fort?: boolean }) {
  return (
    <tr className={fort ? "fort" : ""}>
      <th scope="row">{nom}</th>
      <td>{children}</td>
    </tr>
  );
}

function TableBillets({ billets, valeurs }: { billets: Record<number, number>; valeurs: number[] }) {
  const lignes = valeurs.filter((v) => (billets[v] || 0) > 0);
  if (lignes.length === 0) return <p>Aucun billet.</p>;
  return (
    <table className="doc-table">
      <thead>
        <tr>
          <th scope="col">Billet</th>
          <th scope="col">Nombre</th>
          <th scope="col">Total</th>
        </tr>
      </thead>
      <tbody>
        {lignes.map((v) => (
          <tr key={v}>
            <th scope="row">{v} €</th>
            <td>{billets[v]}</td>
            <td>
              <Montant cents={billets[v] * v * 100} />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function FicheCloture({ comptage: c, analyse, synthese: s, reglages }: Props) {
  const valeurs = valeursBillets(true);
  const reinit = analyse.type === "reinitialisation";
  const sumUp = c.sumUp.filter((x) => analyse.periode.includes(x.date));
  return (
    <article data-doc="fiche" className="doc">
      <Entete titre="Fiche de clôture de caisse" comptage={c} reglages={reglages} />
      {analyse.type === "cumule" && (
        <p className="doc-mention">
          Comptage cumulé du {formatDate(analyse.periode[0])} au {formatDate(c.date)} ({analyse.periode.length} jours)
        </p>
      )}
      {reinit && (
        <p className="doc-mention">
          Réinitialisation du fond de caisse
          {c.motifReinitialisation ? " — " + MOTIFS_REINIT[c.motifReinitialisation] : analyse.premier ? " — Premier comptage" : ""}
          {c.commentaireReinitialisation ? " : " + c.commentaireReinitialisation : ""}
        </p>
      )}

      <h2>Espèces comptées</h2>
      <TableBillets billets={c.billets} valeurs={valeurs} />
      <table className="doc-table">
        <tbody>
          <Ligne nom="Monnaie (pièces)"><Montant cents={s.montantPieces} /></Ligne>
          <Ligne nom="Billets"><Montant cents={s.totalBillets} /></Ligne>
          <Ligne nom="Espèces comptées" fort><Montant cents={s.especesComptees} /></Ligne>
        </tbody>
      </table>

      {c.mouvements.length > 0 && (
        <>
          <h2>Mouvements de caisse</h2>
          <table className="doc-table">
            <tbody>
              {c.mouvements.map((m) => (
                <tr key={m.id}>
                  <th scope="row">
                    {nomMouvement(m.type)}
                    {m.libelle ? " — " + m.libelle : ""}
                    {analyse.periode.length > 1 ? " (" + formatJour(m.date) + ")" : ""}
                  </th>
                  <td><Montant cents={m.type === "apport" ? m.montant : -m.montant} signe /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      <h2>Écart espèces</h2>
      <table className="doc-table">
        <tbody>
          <Ligne nom="Référence (fond laissé la dernière fois)"><Montant cents={s.reference} /></Ligne>
          <Ligne nom="Sorties (dépenses, remboursements, retraits)"><Montant cents={s.mouvements.sorties} /></Ligne>
          <Ligne nom="Entrées (apports)"><Montant cents={s.mouvements.entrees} /></Ligne>
          <Ligne nom="Recette espèces">{reinit ? "— réinitialisation" : <Montant cents={s.recette} />}</Ligne>
          {c.sumUpTotalSaisi == null &&
            sumUp.length > 1 &&
            sumUp.map((x) => (
              <Ligne key={x.date} nom={"SumUp " + formatJour(x.date)}><Montant cents={x.montant} /></Ligne>
            ))}
          <Ligne nom="Espèces SumUp"><Montant cents={s.theorique} /></Ligne>
          <Ligne nom="Écart" fort>{reinit ? "— réinitialisation" : <Montant cents={s.ecart} signe />}</Ligne>
        </tbody>
      </table>

      <h2>Fond de caisse et pochette</h2>
      <table className="doc-table">
        <tbody>
          <Ligne nom="Fond laissé en caisse" fort><Montant cents={s.fondLaisse} /></Ligne>
          <Ligne nom="Pochette (dépôt banque)" fort><Montant cents={s.totalPochette} /></Ligne>
        </tbody>
      </table>

      <h2>Titres</h2>
      <table className="doc-table">
        <tbody>
          <Ligne nom={"Titres-restaurant (" + s.nbTR + ")"}><Montant cents={s.totalTR} /></Ligne>
          <Ligne nom={"Chèques vacances (" + s.nbCV + ")"}><Montant cents={s.totalCV} /></Ligne>
        </tbody>
      </table>

      {c.commentaire && (
        <>
          <h2>Commentaire</h2>
          <p>{c.commentaire}</p>
        </>
      )}
      <p className="doc-signature">
        Compté par : {c.comptePar || "………………………"}
        <span>Signature :</span>
      </p>
    </article>
  );
}

function BordereauPochette({ comptage: c, synthese: s, reglages }: Props) {
  return (
    <article data-doc="pochette" className="doc">
      <Entete titre="Bordereau de pochette" comptage={c} reglages={reglages} />
      <TableBillets billets={s.pochette} valeurs={valeursBillets(true)} />
      <table className="doc-table">
        <tbody>
          {s.monnaiePochette > 0 && <Ligne nom="Monnaie"><Montant cents={s.monnaiePochette} /></Ligne>}
          <Ligne nom="Total de la pochette" fort><Montant cents={s.totalPochette} /></Ligne>
        </tbody>
      </table>
      <p className="doc-signature">
        Préparée par : {c.comptePar || "………………………"}
        <span>Signature :</span>
      </p>
    </article>
  );
}

function ListeDoc({ titre, titres }: { titre: string; titres: Titre[] }) {
  return (
    <section>
      <h2>
        {titre} — {titres.length} {titres.length > 1 ? "titres" : "titre"}
      </h2>
      {titres.length === 0 ? (
        <p>Aucun.</p>
      ) : (
        <ol className="doc-liste">
          {titres.map((t) => (
            <li key={t.id}><Montant cents={t.montant} /></li>
          ))}
        </ol>
      )}
    </section>
  );
}

function ListesTitres({ comptage: c, synthese: s, reglages }: Props) {
  return (
    <article data-doc="titres" className="doc">
      <Entete titre="Titres-restaurant et chèques vacances" comptage={c} reglages={reglages} />
      <ListeDoc titre="Titres-restaurant" titres={c.titresRestaurant} />
      <p className="doc-total">Total titres-restaurant : <Montant cents={s.totalTR} /></p>
      <ListeDoc titre="Chèques vacances" titres={c.chequesVacances} />
      <p className="doc-total">Total chèques vacances : <Montant cents={s.totalCV} /></p>
    </article>
  );
}

/** Les trois documents sont toujours rendus ; la feuille d'impression n'affiche que celui demandé. */
export function ZoneImpression(props: Props) {
  return (
    <div className="zone-impression">
      <FicheCloture {...props} />
      <BordereauPochette {...props} />
      <ListesTitres {...props} />
    </div>
  );
}

/** Lance l'impression d'un document, au format A4 ou ticket 80 mm. */
export function imprimer(doc: DocumentImpression, format: Reglages["formatImpression"]): void {
  const style = document.createElement("style");
  style.textContent = format === "ticket80" ? "@page { size: 80mm auto; margin: 4mm; }" : "@page { size: A4; margin: 15mm; }";
  document.head.appendChild(style);
  document.body.dataset.impression = doc;
  document.body.dataset.format = format;
  const nettoyer = () => {
    delete document.body.dataset.impression;
    delete document.body.dataset.format;
    style.remove();
    window.removeEventListener("afterprint", nettoyer);
  };
  window.addEventListener("afterprint", nettoyer);
  window.print();
}
