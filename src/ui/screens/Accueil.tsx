import { fondLaisse } from "../../domain/calculs";
import { aujourdHui, estOuvert, formatDate, formatJour, formatJourComplet } from "../../domain/calendrier";
import { analyserComptage, comptageDeReference } from "../../domain/reference";
import { useState } from "react";
import { Montant } from "../components/Montant";
import { useInstallation } from "../installation";
import { naviguer } from "../navigation";
import { lirePreference, sauvegardeEnRetard } from "../preferences";
import { telechargerSauvegarde } from "../sauvegarde";
import { useStore } from "../store";

const MAX_JOURS_LISTES = 6;

export function Accueil({ date, setDate }: { date: string; setDate(d: string): void }) {
  const store = useStore();
  const { reglages, comptages, calendrier, joursFermes } = store;
  const comptage = comptages.find((c) => c.date === date);
  const ouvert = estOuvert(date, calendrier);
  const marqueFerme = joursFermes.some((j) => j.date === date);
  const analyse = analyserComptage(date, comptage?.type ?? "normal", comptages, calendrier, reglages.seuilReinitialisationJours);
  const reference = comptageDeReference(date, comptages);
  const cloture = comptage?.statut === "cloture";
  const manques = cloture ? [] : analyse.joursManques;
  const installation = useInstallation();
  const [derniereSauvegarde, setDerniereSauvegarde] = useState(() => lirePreference("derniereSauvegarde"));
  const rappelSauvegarde = sauvegardeEnRetard(derniereSauvegarde, comptages.length, new Date());

  const statut = cloture ? "Clôturé" : comptage ? "Brouillon" : ouvert ? "À faire" : "Fermé";
  const classeStatut = cloture ? "ok" : comptage ? "info" : ouvert ? "alerte" : "";

  return (
    <div className="app-ecran">
      <header className="barre">
        <h1>{reglages.nomEtablissement || "Comptage de caisse"}</h1>
      </header>
      <main className="contenu">
        {store.erreur && <p className="message erreur" role="alert">{store.erreur}</p>}

        <section className="carte">
          <div className="jour">
            <label className="champ">
              <span className="champ-label">Jour du comptage</span>
              <input type="date" value={date} max={aujourdHui()} onChange={(e) => e.target.value && setDate(e.target.value)} />
            </label>
            <p className="jour-statut">
              <strong>{formatJourComplet(date)}</strong>
              <span className={"pastille " + classeStatut}>{statut}</span>
            </p>
          </div>
          {date !== aujourdHui() && (
            <p className="message info">
              Saisie rétroactive : vous n'êtes pas sur la date d'aujourd'hui.{" "}
              <button type="button" className="lien" onClick={() => setDate(aujourdHui())}>Revenir à aujourd'hui</button>
            </p>
          )}

          {manques.length > 0 && analyse.comptageReference && (
            <div className="message alerte" role="alert">
              <p>
                <strong>Pas de comptage depuis le {formatJour(analyse.comptageReference.date)}.</strong> Le comptage du {formatDate(date)} couvrira{" "}
                {analyse.periode.length} jours : vous additionnerez les montants espèces SumUp de chacun.
              </p>
              <ul className="jours-manques">
                {manques.slice(0, MAX_JOURS_LISTES).map((j) => (
                  <li key={j}>
                    {formatJour(j)}
                    <button type="button" className="btn" onClick={() => store.marquerFerme(j)}>
                      Marquer ce jour comme fermé
                    </button>
                  </li>
                ))}
                {manques.length > MAX_JOURS_LISTES && <li>… et {manques.length - MAX_JOURS_LISTES} autres jours</li>}
              </ul>
              {analyse.reinitRecommandee && (
                <p>Longue période sans comptage : l'écart risque d'être difficile à expliquer. La réinitialisation est conseillée, mais vous gardez le choix.</p>
              )}
              <div className="actions">
                <button type="button" className="btn primaire" onClick={() => naviguer("/comptage/" + date)}>
                  Faire un comptage cumulé
                </button>
                <button type="button" className="btn" onClick={() => naviguer("/comptage/" + date + "/reinit")}>
                  Réinitialiser le fond de caisse
                </button>
              </div>
            </div>
          )}

          <div className="actions">
            {(ouvert || comptage) && (
              <button type="button" className="btn primaire grand" onClick={() => naviguer("/comptage/" + date)}>
                {cloture ? "Voir le comptage" : comptage ? "Reprendre le comptage" : "Commencer le comptage"}
              </button>
            )}
            {!comptage && ouvert && (
              <button type="button" className="btn" onClick={() => store.marquerFerme(date)}>
                Marquer ce jour comme fermé
              </button>
            )}
            {!comptage && marqueFerme && (
              <button type="button" className="btn" onClick={() => store.rouvrirJour(date)}>
                Ce jour était ouvert
              </button>
            )}
            {!comptage && !ouvert && (
              <button type="button" className="btn" onClick={() => naviguer("/comptage/" + date)}>
                Compter quand même
              </button>
            )}
          </div>
          {!ouvert && !comptage && !marqueFerme && <p className="discret">Jour de fermeture d'après les réglages.</p>}
        </section>

        <section className="carte reference">
          <h2>Fond de référence</h2>
          {reference ? (
            <p>
              <Montant cents={fondLaisse(reference)} className="tres-grand" />
              <span className="discret"> laissés en caisse à la clôture du {formatJourComplet(reference.date)}</span>
            </p>
          ) : (
            <p className="discret">Aucun comptage clôturé avant cette date : le prochain comptage fixera le fond de référence.</p>
          )}
        </section>

        <nav className="menu">
          <button type="button" className="btn grand" onClick={() => naviguer("/historique")}>Historique</button>
          <button type="button" className="btn grand" onClick={() => naviguer("/reglages")}>Réglages</button>
        </nav>

        {rappelSauvegarde && (
          <div className="message alerte">
            <p>
              {derniereSauvegarde
                ? "La dernière sauvegarde de cet appareil date de plus de 7 jours."
                : "Aucune sauvegarde n'a encore été faite sur cet appareil."}{" "}
              Les comptages n'existent qu'ici : gardez-en une copie.
            </p>
            <div className="actions">
              <button
                type="button"
                className="btn"
                onClick={() => {
                  telechargerSauvegarde(store);
                  setDerniereSauvegarde(lirePreference("derniereSauvegarde"));
                }}
              >
                Télécharger une sauvegarde
              </button>
            </div>
          </div>
        )}

        {!installation.installee && installation.proposable && (
          <div className="message info">
            <p>Installez l'application sur cet appareil : elle s'ouvre comme une appli et fonctionne sans connexion.</p>
            <div className="actions">
              <button type="button" className="btn primaire" onClick={() => installation.installer()}>
                Installer l'application
              </button>
            </div>
          </div>
        )}

        {store.persistant === false && (
          <p className="message alerte">
            Le navigateur n'a pas accordé le stockage persistant : les données pourraient être effacées s'il manque de place. Faites régulièrement une sauvegarde depuis les Réglages.
          </p>
        )}
      </main>
    </div>
  );
}
