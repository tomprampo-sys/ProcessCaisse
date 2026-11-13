import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import { REGLAGES_PAR_DEFAUT, SCHEMA_VERSION, type Comptage, type JourFerme, type Reglages } from "../domain/types";
import type { Donnees } from "./backup";

interface Schema extends DBSchema {
  comptages: { key: string; value: Comptage };
  joursFermes: { key: string; value: JourFerme };
  reglages: { key: string; value: Reglages };
}

const NOM = "process-caisse";
const CLE_REGLAGES = "reglages";
let connexion: Promise<IDBPDatabase<Schema>> | null = null;

function db(): Promise<IDBPDatabase<Schema>> {
  connexion ??= openDB<Schema>(NOM, 1, {
    upgrade(base, ancienneVersion) {
      // Migrations : ajouter un bloc par version de schéma.
      if (ancienneVersion < 1) {
        base.createObjectStore("comptages", { keyPath: "id" });
        base.createObjectStore("joursFermes", { keyPath: "date" });
        base.createObjectStore("reglages");
      }
    },
  });
  return connexion;
}

export async function chargerTout(): Promise<Donnees> {
  const base = await db();
  const [comptages, joursFermes, reglages] = await Promise.all([
    base.getAll("comptages"),
    base.getAll("joursFermes"),
    base.get("reglages", CLE_REGLAGES),
  ]);
  return {
    comptages,
    joursFermes,
    reglages: { ...REGLAGES_PAR_DEFAUT, ...reglages, schemaVersion: SCHEMA_VERSION },
  };
}

export async function enregistrerComptage(c: Comptage): Promise<void> {
  await (await db()).put("comptages", c);
}

export async function supprimerComptage(id: string): Promise<void> {
  await (await db()).delete("comptages", id);
}

export async function enregistrerJourFerme(j: JourFerme): Promise<void> {
  await (await db()).put("joursFermes", j);
}

export async function supprimerJourFerme(date: string): Promise<void> {
  await (await db()).delete("joursFermes", date);
}

export async function enregistrerReglages(r: Reglages): Promise<void> {
  await (await db()).put("reglages", r, CLE_REGLAGES);
}

/** Remplace toutes les données (restauration d'une sauvegarde) en une seule transaction. */
export async function remplacerTout(d: Donnees): Promise<void> {
  const tx = (await db()).transaction(["comptages", "joursFermes", "reglages"], "readwrite");
  const comptages = tx.objectStore("comptages");
  const joursFermes = tx.objectStore("joursFermes");
  const reglages = tx.objectStore("reglages");
  await Promise.all([comptages.clear(), joursFermes.clear(), reglages.clear()]);
  await Promise.all([
    ...d.comptages.map((c) => comptages.put(c)),
    ...d.joursFermes.map((j) => joursFermes.put(j)),
    reglages.put(d.reglages, CLE_REGLAGES),
  ]);
  await tx.done;
}

export async function toutEffacer(): Promise<void> {
  await remplacerTout({ comptages: [], joursFermes: [], reglages: REGLAGES_PAR_DEFAUT });
}
