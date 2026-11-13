import { useRef, useState } from "react";
import { valeursBillets } from "../../domain/billets";
import { JOURS_SEMAINE, aujourdHui, formatDate, formatJourComplet } from "../../domain/calendrier";
import { formatEuros } from "../../domain/money";
import { telecharger } from "../../export/csv";
import { creerSauvegarde, lireSauvegarde } from "../../storage/backup";
import { ChampMontant, Compteur } from "../components/Montant";
import { naviguer } from "../navigation";
import { useStore } from "../store";

// Affichage de la semaine à partir du lundi.
const ORDRE_JOURS = [1, 2, 3, 4, 5, 6, 0];

export function Reglages() {
  const store = useStore();
  const { reglages: r, joursFermes } = store;
  const fichier = useRef<HTMLInputElement>(null);
  const [debut, setDebut] = useState("");
  const [fin, setFin] = useState("");
  const [motif, setMotif] = useState("");
  const [message, setMessage] = useState<{ texte: string; erreur: boolean } | null>(null);

  const compositionTotale = Object.entries(r.compositionCibleBillets).reduce((t, [v, n]) => t + Number(v) * 100 * n, 0);

  function ajouterPeriode() {
    if (!debut || !fin || debut > fin) return;
    store.majReglages({
      periodesFermeture: [...r.periodesFermeture, { debut, fin, ...(motif.trim() ? { motif: motif.trim() } : {}) }].sort((a, b) => a.debut.localeCompare(b.debut)),
    });
    setDebut("");
    setFin("");
    setMotif("");
  }

  function sauvegarder() {
    const json = creerSauvegarde({ reglages: r, comptages: store.comptages, joursFermes });
    telecharger("sauvegarde_caisse_" + aujourdHui() + ".json", json, "application/json");
  }

  async function restaurer(f: File | undefined) {
    if (!f) return;
    try {
      const donnees = lireSauvegarde(await f.text());
      const question = "Restaurer cette sauvegarde (" + donnees.comptages.length + " comptages) ?\nToutes les données actuelles seront remplacées.";
      if (!window.confirm(question)) return;
      await store.restaurer(donnees);
      setMessage({ texte: "Sauvegarde restaurée : " + donnees.comptages.length + " comptages.", erreur: false });
    } catch (e) {
      setMessage({ texte: e instanceof Error ? e.message : "La restauration a échoué.", erreur: true });
    } finally {
      if (fichier.current) fichier.current.value = "";
    }
  }

  async function toutEffacer() {
    if (!window.confirm("Effacer TOUTES les données (comptages, jours fermés, réglages) ?")) return;
    if (!window.confirm("Dernière confirmation : cette action est définitive. Avez-vous fait une sauvegarde ?")) return;
    await store.toutEffacer();
    setMessage({ texte: "Toutes les données ont été effacées.", erreur: false });
  }

  return (
    <div className="app-ecran">
      <header className="barre">
        <button type="button" className="btn" onClick={() => naviguer("/")}>← Accueil</button>
        <h1>Réglages</h1>
      </header>
      <main className="contenu">
        {store.erreur && <p className="message erreur" role="alert">{store.erreur}</p>}

        <section className="carte">
          <h2>Établissement</h2>
          <label className="champ">
            <span className="champ-label">Nom de l'établissement</span>
            <input type="text" value={r.nomEtablissement} autoComplete="organization" onChange={(e) => store.majReglages({ nomEtablissement: e.target.value })} />
          </label>
        </section>

        <section className="carte">
          <h2>Jours d'ouverture</h2>
          <div className="cases">
            {ORDRE_JOURS.map((j) => (
              <label key={j} className="case">
                <input
                  type="checkbox"
                  checked={r.joursOuverture.includes(j)}
                  onChange={(e) =>
                    store.majReglages({ joursOuverture: e.target.checked ? [...r.joursOuverture, j].sort() : r.joursOuverture.filter((x) => x !== j) })
                  }
                />
                {JOURS_SEMAINE[j]}
              </label>
            ))}
          </div>

          <h3>Périodes de fermeture</h3>
          {r.periodesFermeture.length === 0 ? (
            <p className="discret">Aucune période de fermeture (congés, fermeture saisonnière…).</p>
          ) : (
            <ul className="lignes">
              {r.periodesFermeture.map((p, i) => (
                <li key={p.debut + p.fin + i}>
                  <span className="libelle">
                    Du {formatDate(p.debut)} au {formatDate(p.fin)}
                    {p.motif && <small> · {p.motif}</small>}
                  </span>
                  <button type="button" className="btn discret-btn" onClick={() => store.majReglages({ periodesFermeture: r.periodesFermeture.filter((_, k) => k !== i) })}>
                    Supprimer
                  </button>
                </li>
              ))}
            </ul>
          )}
          <form
            className="filtres"
            onSubmit={(e) => {
              e.preventDefault();
              ajouterPeriode();
            }}
          >
            <label className="champ">
              <span className="champ-label">Du</span>
              <input type="date" value={debut} onChange={(e) => setDebut(e.target.value)} />
            </label>
            <label className="champ">
              <span className="champ-label">Au</span>
              <input type="date" value={fin} min={debut} onChange={(e) => setFin(e.target.value)} />
            </label>
            <label className="champ champ-large">
              <span className="champ-label">Motif (facultatif)</span>
              <input type="text" value={motif} onChange={(e) => setMotif(e.target.value)} />
            </label>
            <button type="submit" className="btn" disabled={!debut || !fin || debut > fin}>Ajouter la période</button>
          </form>

          <h3>Jours marqués fermés</h3>
          {joursFermes.length === 0 ? (
            <p className="discret">Aucun. Un jour se marque comme fermé depuis l'accueil.</p>
          ) : (
            <ul className="lignes">
              {[...joursFermes].sort((a, b) => b.date.localeCompare(a.date)).map((j) => (
                <li key={j.date}>
                  <span className="libelle">{formatJourComplet(j.date)}</span>
                  <button type="button" className="btn discret-btn" onClick={() => store.rouvrirJour(j.date)}>Retirer</button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="carte">
          <h2>Fond de caisse</h2>
          <ChampMontant label="Fond de caisse cible" valeur={r.fondCible} onChange={(m) => store.majReglages({ fondCible: m ?? 0 })} />
          <h3>Billets à garder en priorité</h3>
          <ul className="billets">
            {valeursBillets(r.afficherBillet500).map((v) => (
              <li key={v}>
                <span className="valeur">{v} €</span>
                <Compteur
                  label={"Nombre de billets de " + v + " € à garder"}
                  valeur={r.compositionCibleBillets[v] || 0}
                  onChange={(n) => store.majReglages({ compositionCibleBillets: { ...r.compositionCibleBillets, [v]: n } })}
                />
              </li>
            ))}
          </ul>
          <p className="discret">
            Soit {formatEuros(compositionTotale)} en billets ; la monnaie et, si besoin, d'autres petits billets complètent jusqu'au fond cible.
          </p>
          <label className="case">
            <input type="checkbox" checked={r.afficherBillet500} onChange={(e) => store.majReglages({ afficherBillet500: e.target.checked })} />
            Afficher le billet de 500 €
          </label>
        </section>

        <section className="carte">
          <h2>Écart et alertes</h2>
          <div className="grille-champs">
            <ChampMontant label="Tolérance d'écart" valeur={r.toleranceEcart} onChange={(m) => store.majReglages({ toleranceEcart: m ?? 0 })} />
            <ChampMontant label="Alerte si l'écart dépasse" valeur={r.seuilAlerteEcart} onChange={(m) => store.majReglages({ seuilAlerteEcart: m ?? 0 })} />
            <ChampMontant label="Alerte si la monnaie dépasse" valeur={r.seuilAlerteMonnaie} onChange={(m) => store.majReglages({ seuilAlerteMonnaie: m ?? 0 })} />
            <ChampMontant label="Alerte si un titre dépasse" valeur={r.seuilAlerteTitre} onChange={(m) => store.majReglages({ seuilAlerteTitre: m ?? 0 })} />
          </div>
          <label className="case">
            <input type="checkbox" checked={r.commentaireObligatoireSiEcart} onChange={(e) => store.majReglages({ commentaireObligatoireSiEcart: e.target.checked })} />
            Commentaire obligatoire si l'écart dépasse la tolérance
          </label>
          <div className="ligne-reglage">
            <span>Recommander la réinitialisation au-delà de (jours d'ouverture sans comptage)</span>
            <Compteur label="Seuil en jours d'ouverture" valeur={r.seuilReinitialisationJours} max={365} onChange={(n) => store.majReglages({ seuilReinitialisationJours: Math.max(1, n) })} />
          </div>
        </section>

        <section className="carte">
          <h2>Impression</h2>
          <div className="segments" role="radiogroup" aria-label="Format d'impression">
            <button type="button" role="radio" aria-checked={r.formatImpression === "a4"} className={r.formatImpression === "a4" ? "actif" : ""} onClick={() => store.majReglages({ formatImpression: "a4" })}>
              A4
            </button>
            <button type="button" role="radio" aria-checked={r.formatImpression === "ticket80"} className={r.formatImpression === "ticket80" ? "actif" : ""} onClick={() => store.majReglages({ formatImpression: "ticket80" })}>
              Ticket 80 mm
            </button>
          </div>
        </section>

        <section className="carte">
          <h2>Données</h2>
          <p className="discret">
            Les données sont enregistrées uniquement dans ce navigateur ({store.comptages.length} comptages).{" "}
            {store.persistant === true && "Le stockage persistant est accordé."}
            {store.persistant === false && "Le stockage persistant a été refusé par le navigateur : sauvegardez régulièrement."}
          </p>
          <div className="actions">
            <button type="button" className="btn primaire" onClick={sauvegarder}>Télécharger une sauvegarde</button>
            <button type="button" className="btn" onClick={() => fichier.current?.click()}>Restaurer une sauvegarde…</button>
            <input ref={fichier} type="file" accept="application/json,.json" hidden onChange={(e) => restaurer(e.target.files?.[0])} />
            <button type="button" className="btn danger" onClick={toutEffacer}>Tout effacer</button>
          </div>
          {message && <p className={"message " + (message.erreur ? "erreur" : "ok")} role="status">{message.texte}</p>}
        </section>
      </main>
    </div>
  );
}
