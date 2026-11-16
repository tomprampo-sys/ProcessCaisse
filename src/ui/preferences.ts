// Préférences d'interface propres à cet appareil (localStorage). Aucune donnée métier ici.

const CLES = {
  bienvenueVue: "caisse.bienvenueVue",
  comptePar: "caisse.comptePar",
  derniereSauvegarde: "caisse.derniereSauvegarde",
} as const;

type Cle = keyof typeof CLES;

export function lirePreference(cle: Cle): string | null {
  try {
    return window.localStorage.getItem(CLES[cle]);
  } catch {
    return null; // stockage indisponible (navigation privée stricte) : on fait sans
  }
}

export function ecrirePreference(cle: Cle, valeur: string | null): void {
  try {
    if (valeur == null || valeur === "") window.localStorage.removeItem(CLES[cle]);
    else window.localStorage.setItem(CLES[cle], valeur);
  } catch {
    // préférence non mémorisée : sans conséquence sur les données
  }
}

export const DELAI_RAPPEL_SAUVEGARDE_JOURS = 7;

/**
 * Faut-il rappeler de faire une sauvegarde ? Oui s'il y a des comptages sur l'appareil
 * et qu'aucune sauvegarde n'a été faite ici depuis plus de `delaiJours` jours.
 */
export function sauvegardeEnRetard(
  derniereSauvegarde: string | null,
  nbComptages: number,
  maintenant: Date,
  delaiJours: number = DELAI_RAPPEL_SAUVEGARDE_JOURS,
): boolean {
  if (nbComptages === 0) return false;
  if (!derniereSauvegarde) return true;
  const date = new Date(derniereSauvegarde).getTime();
  if (Number.isNaN(date)) return true;
  return maintenant.getTime() - date > delaiJours * 24 * 60 * 60 * 1000;
}
