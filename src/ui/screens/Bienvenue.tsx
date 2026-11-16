import { useRef, useState } from "react";
import { ecrirePreference } from "../preferences";
import { lireFichierSauvegarde } from "../sauvegarde";
import { useStore } from "../store";

/** Premier lancement sur un appareil : reprendre l'historique du restaurant ou démarrer une nouvelle caisse. */
export function Bienvenue({ onTermine }: { onTermine(): void }) {
  const store = useStore();
  const fichier = useRef<HTMLInputElement>(null);
  const [nom, setNom] = useState(store.reglages.nomEtablissement);
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, setEnCours] = useState(false);

  function terminer() {
    ecrirePreference("bienvenueVue", "oui");
    onTermine();
  }

  async function restaurer(f: File | undefined) {
    if (!f) return;
    setEnCours(true);
    setErreur(null);
    try {
      await store.restaurer(await lireFichierSauvegarde(f));
      // Le fichier vient d'être lu : il tient lieu de sauvegarde à jour.
      ecrirePreference("derniereSauvegarde", new Date().toISOString());
      terminer();
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "La restauration a échoué.");
      setEnCours(false);
      if (fichier.current) fichier.current.value = "";
    }
  }

  function demarrer() {
    if (nom.trim() !== store.reglages.nomEtablissement) store.majReglages({ nomEtablissement: nom.trim() });
    terminer();
  }

  return (
    <div className="app-ecran">
      <header className="barre">
        <h1>Bienvenue dans le comptage de caisse</h1>
      </header>
      <main className="contenu">
        <p className="message info">
          Sur cet appareil, l'application est vide. Les comptages sont enregistrés ici, dans ce navigateur : ils ne sont pas partagés avec les autres appareils.
        </p>

        <section className="carte">
          <h2>Reprendre l'historique du restaurant</h2>
          <p className="discret">
            Vous avez reçu un fichier de sauvegarde (son nom commence par « sauvegarde_caisse ») ? Choisissez-le pour retrouver les comptages et les réglages.
          </p>
          <button type="button" className="btn primaire grand" disabled={enCours} onClick={() => fichier.current?.click()}>
            {enCours ? "Chargement…" : "Choisir le fichier de sauvegarde"}
          </button>
          <input ref={fichier} type="file" accept="application/json,.json" hidden onChange={(e) => restaurer(e.target.files?.[0])} />
          {erreur && <p className="message erreur" role="alert">{erreur}</p>}
        </section>

        <section className="carte">
          <h2>Démarrer une nouvelle caisse</h2>
          <p className="discret">Sans fichier, l'application démarre vide. Le premier comptage fixera le fond de caisse de départ.</p>
          <form
            className="filtres"
            onSubmit={(e) => {
              e.preventDefault();
              demarrer();
            }}
          >
            <label className="champ champ-large">
              <span className="champ-label">Nom de l'établissement (facultatif)</span>
              <input type="text" value={nom} autoComplete="organization" onChange={(e) => setNom(e.target.value)} />
            </label>
            <button type="submit" className="btn grand" disabled={enCours}>
              Démarrer
            </button>
          </form>
        </section>
      </main>
    </div>
  );
}
