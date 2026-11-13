import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { REGLAGES_PAR_DEFAUT, type Calendrier, type Comptage, type JourFerme, type Reglages } from "../domain/types";
import type { Donnees } from "../storage/backup";
import * as db from "../storage/db";

interface Store extends Donnees {
  calendrier: Calendrier;
  /** true : stockage persistant accordé ; false : refusé ; null : inconnu ou non pris en charge. */
  persistant: boolean | null;
  erreur: string | null;
  enregistrerComptage(c: Comptage): void;
  supprimerComptage(id: string): void;
  marquerFerme(date: string, motif?: string): void;
  rouvrirJour(date: string): void;
  majReglages(patch: Partial<Reglages>): void;
  restaurer(d: Donnees): Promise<void>;
  toutEffacer(): Promise<void>;
}

const Contexte = createContext<Store | null>(null);

export function useStore(): Store {
  const store = useContext(Contexte);
  if (!store) throw new Error("StoreProvider manquant");
  return store;
}

const VIDE: Donnees = { comptages: [], joursFermes: [], reglages: REGLAGES_PAR_DEFAUT };

export function StoreProvider({ children }: { children: ReactNode }) {
  const [donnees, setDonnees] = useState<Donnees | null>(null);
  const [persistant, setPersistant] = useState<boolean | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);

  useEffect(() => {
    db.chargerTout()
      .then(setDonnees)
      .catch(() => {
        setErreur("Impossible d'ouvrir le stockage du navigateur. Les saisies ne seront pas conservées.");
        setDonnees(VIDE);
      });
    if (navigator.storage?.persist) {
      navigator.storage.persist().then(setPersistant, () => setPersistant(null));
    }
  }, []);

  /** Met à jour la mémoire tout de suite, puis écrit dans IndexedDB. */
  const appliquer = useCallback((maj: (d: Donnees) => Donnees, ecrire: () => Promise<void>) => {
    setDonnees((d) => (d ? maj(d) : d));
    ecrire().then(
      () => setErreur(null),
      () => setErreur("L'enregistrement a échoué. Vérifiez l'espace disponible, puis modifiez à nouveau la saisie."),
    );
  }, []);

  const store = useMemo<Store | null>(() => {
    if (!donnees) return null;
    return {
      ...donnees,
      persistant,
      erreur,
      calendrier: {
        joursOuverture: donnees.reglages.joursOuverture,
        periodesFermeture: donnees.reglages.periodesFermeture,
        joursFermes: donnees.joursFermes.map((j) => j.date),
      },
      enregistrerComptage(c) {
        appliquer(
          (d) => ({ ...d, comptages: [...d.comptages.filter((x) => x.id !== c.id), c] }),
          () => db.enregistrerComptage(c),
        );
      },
      supprimerComptage(id) {
        appliquer(
          (d) => ({ ...d, comptages: d.comptages.filter((x) => x.id !== id) }),
          () => db.supprimerComptage(id),
        );
      },
      marquerFerme(date, motif) {
        const jour: JourFerme = motif ? { date, motif } : { date };
        appliquer(
          (d) => ({ ...d, joursFermes: [...d.joursFermes.filter((j) => j.date !== date), jour] }),
          () => db.enregistrerJourFerme(jour),
        );
      },
      rouvrirJour(date) {
        appliquer(
          (d) => ({ ...d, joursFermes: d.joursFermes.filter((j) => j.date !== date) }),
          () => db.supprimerJourFerme(date),
        );
      },
      majReglages(patch) {
        const reglages = { ...donnees.reglages, ...patch };
        appliquer(
          (d) => ({ ...d, reglages: { ...d.reglages, ...patch } }),
          () => db.enregistrerReglages(reglages),
        );
      },
      async restaurer(d) {
        await db.remplacerTout(d);
        setDonnees(d);
      },
      async toutEffacer() {
        await db.toutEffacer();
        setDonnees(VIDE);
      },
    };
  }, [donnees, persistant, erreur, appliquer]);

  if (!store) return <p className="chargement">Chargement…</p>;
  return <Contexte.Provider value={store}>{children}</Contexte.Provider>;
}
