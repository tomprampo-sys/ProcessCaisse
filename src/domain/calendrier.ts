import type { Calendrier } from "./types";

const JOURS = ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"];
export const JOURS_SEMAINE = JOURS;

function versDate(iso: string): Date {
  return new Date(`${iso}T00:00:00Z`);
}

export function estDateIso(texte: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(texte) && !Number.isNaN(versDate(texte).getTime());
}

export function ajouterJours(iso: string, n: number): string {
  const d = versDate(iso);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** 0 = dimanche … 6 = samedi */
export function jourSemaine(iso: string): number {
  return versDate(iso).getUTCDay();
}

/** Date locale du jour, au format ISO. */
export function aujourdHui(maintenant: Date = new Date()): string {
  const a = maintenant.getFullYear();
  const m = String(maintenant.getMonth() + 1).padStart(2, "0");
  const j = String(maintenant.getDate()).padStart(2, "0");
  return `${a}-${m}-${j}`;
}

/** "2025-12-13" -> "13/12/2025" */
export function formatDate(iso: string): string {
  const [a, m, j] = iso.split("-");
  return `${j}/${m}/${a}`;
}

/** "2025-12-13" -> "13/12" */
export function formatDateCourte(iso: string): string {
  const [, m, j] = iso.split("-");
  return `${j}/${m}`;
}

/** "2025-12-13" -> "samedi 13/12" */
export function formatJour(iso: string): string {
  return `${JOURS[jourSemaine(iso)]} ${formatDateCourte(iso)}`;
}

/** "2025-12-13" -> "samedi 13/12/2025" */
export function formatJourComplet(iso: string): string {
  return `${JOURS[jourSemaine(iso)]} ${formatDate(iso)}`;
}

/** Un jour est ouvert s'il fait partie des jours d'ouverture et n'est ni dans une période de fermeture ni marqué fermé. */
export function estOuvert(date: string, cal: Calendrier): boolean {
  if (!cal.joursOuverture.includes(jourSemaine(date))) return false;
  if (cal.joursFermes.includes(date)) return false;
  return !cal.periodesFermeture.some((p) => p.debut <= date && date <= p.fin);
}

/** Jour d'ouverture qui précède strictement `date`, ou null s'il n'y en a pas dans la limite. */
export function jourOuverturePrecedent(date: string, cal: Calendrier, limiteJours = 800): string | null {
  let d = date;
  for (let i = 0; i < limiteJours; i++) {
    d = ajouterJours(d, -1);
    if (estOuvert(d, cal)) return d;
  }
  return null;
}

/** Jours d'ouverture strictement après `apres` et jusqu'à `jusqua` inclus, dans l'ordre. */
export function joursOuvertureEntre(apres: string, jusqua: string, cal: Calendrier): string[] {
  const jours: string[] = [];
  for (let d = ajouterJours(apres, 1); d <= jusqua; d = ajouterJours(d, 1)) {
    if (estOuvert(d, cal)) jours.push(d);
  }
  return jours;
}

/** Tous les jours du calendrier de `debut` à `fin` inclus. */
export function joursEntre(debut: string, fin: string): string[] {
  const jours: string[] = [];
  for (let d = debut; d <= fin; d = ajouterJours(d, 1)) jours.push(d);
  return jours;
}
