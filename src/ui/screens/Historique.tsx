import { useMemo, useState } from "react";
import { ajouterJours, aujourdHui, formatDate, formatJour } from "../../domain/calendrier";
import { lignesHistorique, totauxHistorique } from "../../domain/historique";
import { exporterCsv, libelleType, telecharger } from "../../export/csv";
import { Montant } from "../components/Montant";
import { naviguer } from "../navigation";
import { useStore } from "../store";

export function Historique() {
  const { comptages, calendrier, reglages } = useStore();
  const aujourdhui = aujourdHui();
  const [debut, setDebut] = useState(() => ajouterJours(aujourdhui, -30));
  const [fin, setFin] = useState(aujourdhui);

  const lignes = useMemo(
    () => (debut <= fin ? lignesHistorique(debut, fin, comptages, calendrier, reglages, aujourdhui) : []),
    [debut, fin, comptages, calendrier, reglages, aujourdhui],
  );
  const totaux = totauxHistorique(lignes);
  const affichees = [...lignes].reverse();

  function exporter() {
    telecharger("comptages_" + debut + "_" + fin + ".csv", exporterCsv(lignes), "text/csv;charset=utf-8");
  }

  return (
    <div className="app-ecran large">
      <header className="barre no-print">
        <button type="button" className="btn" onClick={() => naviguer("/")}>← Accueil</button>
        <h1>Historique</h1>
      </header>
      <main className="contenu">
        <h1 className="print-only">
          {reglages.nomEtablissement ? reglages.nomEtablissement + " — " : ""}Comptages du {formatDate(debut)} au {formatDate(fin)}
        </h1>
        <section className="carte no-print">
          <div className="filtres">
            <label className="champ">
              <span className="champ-label">Du</span>
              <input type="date" value={debut} max={fin} onChange={(e) => e.target.value && setDebut(e.target.value)} />
            </label>
            <label className="champ">
              <span className="champ-label">Au</span>
              <input type="date" value={fin} min={debut} onChange={(e) => e.target.value && setFin(e.target.value)} />
            </label>
            <button type="button" className="btn" onClick={() => { setDebut(aujourdhui.slice(0, 8) + "01"); setFin(aujourdhui); }}>Ce mois</button>
            <button type="button" className="btn" onClick={() => { setDebut(aujourdhui.slice(0, 4) + "-01-01"); setFin(aujourdhui); }}>Cette année</button>
            <button type="button" className="btn primaire" disabled={lignes.length === 0} onClick={exporter}>Exporter en CSV</button>
            <button type="button" className="btn" disabled={lignes.length === 0} onClick={() => window.print()}>Imprimer</button>
          </div>
        </section>

        <section className="carte totaux">
          <div><span>Comptages</span><strong>{totaux.nbComptages}</strong></div>
          <div><span>Recette espèces</span><Montant cents={totaux.recette} /></div>
          <div><span>Espèces SumUp</span><Montant cents={totaux.sumUp} /></div>
          <div className={"ecart " + (totaux.ecart > 0 ? "excedent" : totaux.ecart < 0 ? "manque" : "juste")}>
            <span>Cumul des écarts (hors réinitialisations)</span>
            <Montant cents={totaux.ecart} signe />
          </div>
          <div><span>Pochettes</span><Montant cents={totaux.pochette} /></div>
          <div><span>Titres-restaurant</span><Montant cents={totaux.totalTR} /></div>
          <div><span>Chèques vacances</span><Montant cents={totaux.totalCV} /></div>
        </section>

        {affichees.length === 0 ? (
          <p className="discret">Aucun comptage sur cette période.</p>
        ) : (
          <div className="table-defilante">
            <table className="historique">
              <thead>
                <tr>
                  <th scope="col">Date</th>
                  <th scope="col">Type</th>
                  <th scope="col" className="num">Espèces</th>
                  <th scope="col" className="num">Pochette</th>
                  <th scope="col" className="num">Recette</th>
                  <th scope="col" className="num">SumUp</th>
                  <th scope="col" className="num">Écart</th>
                  <th scope="col" className="num">TR</th>
                  <th scope="col" className="num">CV</th>
                  <th scope="col">Commentaire</th>
                </tr>
              </thead>
              <tbody>
                {affichees.map((l) => {
                  if (l.sorte !== "comptage") {
                    return (
                      <tr key={l.date} className="grise">
                        <th scope="row">{formatJour(l.date)}</th>
                        <td colSpan={9}>
                          {l.sorte === "ferme" ? "Fermé" : "Pas de comptage"}
                          {l.sorte === "manque" && (
                            <button type="button" className="lien no-print" onClick={() => naviguer("/comptage/" + l.date)}>Saisir ce jour</button>
                          )}
                        </td>
                      </tr>
                    );
                  }
                  const { comptage: c, analyse: a, synthese: s } = l;
                  const reinit = a.type === "reinitialisation";
                  return (
                    <tr key={l.date} className={c.statut === "brouillon" ? "brouillon" : ""}>
                      <th scope="row">
                        <button type="button" className="lien" onClick={() => naviguer("/comptage/" + c.date)}>{formatJour(c.date)}</button>
                      </th>
                      <td>
                        {reinit ? "↺ Réinit." : libelleType(l)}
                        {a.type === "cumule" && <small> ({formatDate(a.periode[0]).slice(0, 5)} → {formatDate(c.date).slice(0, 5)})</small>}
                        {c.statut === "brouillon" && <small> · brouillon</small>}
                      </td>
                      <td className="num"><Montant cents={s.especesComptees} /></td>
                      <td className="num"><Montant cents={s.totalPochette} /></td>
                      <td className="num">{reinit ? "—" : <Montant cents={s.recette} />}</td>
                      <td className="num"><Montant cents={s.theorique} /></td>
                      <td className={"num ecart " + (reinit || !s.statut ? "" : s.statut)}>{reinit ? "—" : <Montant cents={s.ecart} signe />}</td>
                      <td className="num">{s.nbTR > 0 ? <Montant cents={s.totalTR} /> : ""}</td>
                      <td className="num">{s.nbCV > 0 ? <Montant cents={s.totalCV} /> : ""}</td>
                      <td className="commentaire">{[c.commentaireReinitialisation, c.commentaire].filter(Boolean).join(" — ")}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
