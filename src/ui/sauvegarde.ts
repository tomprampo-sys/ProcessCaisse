import { aujourdHui } from "../domain/calendrier";
import { telecharger } from "../export/csv";
import { creerSauvegarde, lireSauvegarde, type Donnees } from "../storage/backup";
import { ecrirePreference } from "./preferences";

/** Télécharge la sauvegarde JSON et note la date : le rappel de l'accueil se tait pour quelques jours. */
export function telechargerSauvegarde(donnees: Donnees): void {
  const { reglages, comptages, joursFermes } = donnees;
  telecharger("sauvegarde_caisse_" + aujourdHui() + ".json", creerSauvegarde({ reglages, comptages, joursFermes }), "application/json");
  ecrirePreference("derniereSauvegarde", new Date().toISOString());
}

/** Lit et valide un fichier de sauvegarde choisi par l'utilisateur. Lève une erreur en français s'il est inutilisable. */
export async function lireFichierSauvegarde(fichier: File): Promise<Donnees> {
  return lireSauvegarde(await fichier.text());
}
