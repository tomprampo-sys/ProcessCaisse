import { useMemo, useState } from "react";
import { valeursBillets } from "../../domain/billets";
import { calculerSynthese } from "../../domain/calculs";
import { formatDate, formatJour, formatJourComplet } from "../../domain/calendrier";
import { nouveauComptage } from "../../domain/comptage";
import { normaliserFond } from "../../domain/fondDeCaisse";
import { formatEuros } from "../../domain/money";
import { analyserComptage } from "../../domain/reference";
import type { Cents, Comptage as TComptage } from "../../domain/types";
import { ListeMouvements } from "../components/ListeMouvements";
import { ListeTitres } from "../components/ListeTitres";
import { ChampMontant, Compteur, Montant } from "../components/Montant";
import { naviguer } from "../navigation";
import { lirePreference } from "../preferences";
import { ZoneImpression } from "../print/Documents";
import { useStore } from "../store";
import { Synthese } from "./Synthese";

const ETAPES = [
  ["monnaie", "Monnaie"],
  ["billets", "Billets"],
  ["tr", "Titres-restaurant"],
  ["cv", "Chèques vacances"],
  ["mouvements", "Mouvements"],
  ["sumup", "SumUp"],
  ["synthese", "Synthèse"],
] as const;

const RAPIDES_CV: Cents[] = [1000, 2000, 2500, 5000];

/** Les 5 montants de titres-restaurant les plus saisis dans l'historique. */
function rapidesTR(comptages: TComptage[]): Cents[] {
  const frequences = new Map<Cents, number>();
  for (const c of comptages) for (const t of c.titresRestaurant) frequences.set(t.montant, (frequences.get(t.montant) || 0) + 1);
  return [...frequences.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([montant]) => montant)
    .sort((a, b) => a - b);
}

export function Comptage({ date, ouvrirReinit }: { date: string; ouvrirReinit: boolean }) {
  const store = useStore();
  const { reglages, comptages, calendrier } = store;
  const [vierge] = useState(() => {
    const dernierNom = lirePreference("comptePar");
    return dernierNom ? { ...nouveauComptage(date), comptePar: dernierNom } : nouveauComptage(date);
  });
  const enregistre = comptages.find((x) => x.date === date);
  const existe = !!enregistre;
  const verrouille = enregistre?.statut === "cloture";
  // Un brouillon suit toujours les réglages actuels du fond de caisse ; un comptage clôturé est figé.
  const c = useMemo(
    () => (enregistre?.statut === "cloture" ? enregistre : normaliserFond(enregistre ?? vierge, reglages)),
    [enregistre, vierge, reglages],
  );

  const analyse = useMemo(
    () => analyserComptage(date, c.type, comptages, calendrier, reglages.seuilReinitialisationJours),
    [date, c.type, comptages, calendrier, reglages.seuilReinitialisationJours],
  );
  const s = calculerSynthese(c, analyse, reglages.toleranceEcart);
  const reinit = analyse.type === "reinitialisation";
  const rapides = useMemo(() => rapidesTR(comptages), [comptages]);

  /** Chaque modification est enregistrée aussitôt : fermer l'onglet ne perd rien. */
  function modifier(patch: Partial<TComptage>) {
    if (verrouille) return;
    store.enregistrerComptage(normaliserFond({ ...c, ...patch, modifieLe: new Date().toISOString() }, reglages));
  }

  function saisirSumUp(jour: string, montant: Cents | null) {
    const autres = c.sumUp.filter((x) => x.date !== jour);
    const sumUp = montant == null ? autres : [...autres, { date: jour, montant }];
    modifier({ sumUp: sumUp.sort((a, b) => a.date.localeCompare(b.date)) });
  }

  const modeTotal = c.sumUpTotalSaisi != null;
  // Tant que rien n'est saisi, ni recette ni écart : un écart rouge sur une page vide n'apprend rien.
  const sansCalcul = reinit || !existe;
  const classeEcart = sansCalcul || s.statut == null ? "" : s.statut;

  return (
    <>
      <div className="app-ecran">
        <header className="barre no-print">
          <button type="button" className="btn" onClick={() => naviguer("/")}>
            ← Accueil
          </button>
          <h1>
            Comptage du {formatJourComplet(date)}
            {verrouille && <span className="pastille ok">clôturé</span>}
            {!verrouille && existe && <span className="pastille">brouillon enregistré</span>}
          </h1>
        </header>

        <div className="bandeau" role="status" aria-label="Totaux du comptage">
          <div>
            <span>Espèces comptées</span>
            <Montant cents={s.especesComptees} />
          </div>
          <div>
            <span>Référence</span>
            <Montant cents={s.reference} />
          </div>
          <div>
            <span>Recette</span>
            {sansCalcul ? <span className="montant">—</span> : <Montant cents={s.recette} />}
          </div>
          <div className={"ecart " + classeEcart}>
            <span>Écart</span>
            {reinit ? <span className="montant petit">réinitialisation</span> : sansCalcul ? <span className="montant">—</span> : <Montant cents={s.ecart} signe />}
          </div>
        </div>

        <nav className="etapes no-print" aria-label="Étapes du comptage">
          {ETAPES.map(([id, nom]) => (
            <button key={id} type="button" onClick={() => document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" })}>
              {nom}
            </button>
          ))}
        </nav>

        <main className="contenu">
          {store.erreur && <p className="message erreur" role="alert">{store.erreur}</p>}

          {analyse.type === "cumule" && (
            <p className="message info">
              Pas de comptage depuis le {formatJour(analyse.comptageReference!.date)}. Ce comptage couvre {analyse.periode.length} jours :{" "}
              {analyse.periode.map(formatJour).join(", ")}. Saisissez les montants espèces SumUp de chaque jour.
            </p>
          )}
          {analyse.reinitRecommandee && !verrouille && (
            <p className="message alerte">
              Longue période sans comptage : l'écart risque d'être difficile à expliquer. Vous pouvez réinitialiser le fond de caisse dans la synthèse.
            </p>
          )}
          {analyse.premier && (
            <p className="message info">
              Premier comptage : il sert de point de départ. Aucun écart n'est calculé, le fond laissé en caisse devient la référence.
            </p>
          )}

          <section id="monnaie" className="carte">
            <h2>1. Monnaie</h2>
            <ChampMontant
              grand
              label="Total des pièces"
              valeur={c.montantPieces}
              disabled={verrouille}
              onChange={(m) => modifier({ montantPieces: m ?? 0 })}
            />
            {c.montantPieces > reglages.seuilAlerteMonnaie && (
              <p className="message alerte">Monnaie supérieure à {formatEuros(reglages.seuilAlerteMonnaie)} : vérifiez la saisie.</p>
            )}
          </section>

          <section id="billets" className="carte">
            <h2>2. Billets</h2>
            <ul className="billets">
              {valeursBillets(reglages.afficherBillet500 || (c.billets[500] || 0) > 0).map((v) => (
                <li key={v}>
                  <span className="valeur">{v} €</span>
                  <Compteur
                    label={"Nombre de billets de " + v + " €"}
                    valeur={c.billets[v] || 0}
                    disabled={verrouille}
                    onChange={(n) => modifier({ billets: { ...c.billets, [v]: n } })}
                  />
                  <Montant cents={(c.billets[v] || 0) * v * 100} />
                </li>
              ))}
            </ul>
            <p className="total-ligne">
              <span>Total billets</span>
              <Montant cents={s.totalBillets} />
            </p>
          </section>

          <section id="tr" className="carte">
            <h2>3. Titres-restaurant</h2>
            <ListeTitres
              nom="titre-restaurant"
              titres={c.titresRestaurant}
              rapides={rapides}
              seuilAlerte={reglages.seuilAlerteTitre}
              disabled={verrouille}
              onChange={(titresRestaurant) => modifier({ titresRestaurant })}
            />
          </section>

          <section id="cv" className="carte">
            <h2>4. Chèques vacances</h2>
            <ListeTitres
              nom="chèque vacances"
              titres={c.chequesVacances}
              rapides={RAPIDES_CV}
              seuilAlerte={reglages.seuilAlerteTitre}
              disabled={verrouille}
              onChange={(chequesVacances) => modifier({ chequesVacances })}
            />
          </section>

          <section id="mouvements" className="carte">
            <h2>5. Mouvements de caisse</h2>
            <ListeMouvements mouvements={c.mouvements} periode={analyse.periode} disabled={verrouille} onChange={(mouvements) => modifier({ mouvements })} />
            {s.mouvementsHorsPeriode > 0 && (
              <p className="message alerte">
                {s.mouvementsHorsPeriode} mouvement(s) daté(s) hors de la période couverte : ils ne comptent pas dans le calcul.
              </p>
            )}
          </section>

          <section id="sumup" className="carte">
            <h2>6. Espèces SumUp</h2>
            {reinit && <p className="discret">Réinitialisation : le montant SumUp est saisi pour information, il n'entre dans aucun calcul.</p>}
            {modeTotal ? (
              <ChampMontant
                grand
                label={"Total espèces SumUp du " + formatDate(analyse.periode[0]) + " au " + formatDate(date)}
                valeur={c.sumUpTotalSaisi ?? null}
                disabled={verrouille}
                onChange={(m) => modifier({ sumUpTotalSaisi: m ?? 0 })}
              />
            ) : (
              <div className="sumup-jours">
                {analyse.periode.map((jour) => (
                  <ChampMontant
                    key={jour}
                    grand={analyse.periode.length === 1}
                    label={analyse.periode.length === 1 ? "Espèces SumUp du jour" : formatJour(jour)}
                    valeur={c.sumUp.find((x) => x.date === jour)?.montant ?? null}
                    disabled={verrouille}
                    onChange={(m) => saisirSumUp(jour, m)}
                  />
                ))}
              </div>
            )}
            {analyse.periode.length > 1 && (
              <>
                <p className="total-ligne">
                  <span>Total SumUp de la période</span>
                  <Montant cents={s.theorique} />
                </p>
                {!verrouille && (
                  <button type="button" className="btn" onClick={() => modifier({ sumUpTotalSaisi: modeTotal ? undefined : 0 })}>
                    {modeTotal ? "Saisir jour par jour" : "Saisir directement un total"}
                  </button>
                )}
              </>
            )}
          </section>

          <Synthese c={c} existe={existe} analyse={analyse} s={s} modifier={modifier} ouvrirReinit={ouvrirReinit} />
        </main>
      </div>
      <ZoneImpression comptage={c} analyse={analyse} synthese={s} reglages={reglages} />
    </>
  );
}
