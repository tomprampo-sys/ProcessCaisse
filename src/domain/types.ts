/** Montant en centimes entiers. Usage interne uniquement : jamais affiché tel quel. */
export type Cents = number;

export type TypeMouvement = "depense" | "remboursement" | "retrait_pochette" | "apport";

export interface Mouvement {
  id: string;
  type: TypeMouvement;
  /** Toujours > 0, le sens dépend du type. */
  montant: Cents;
  libelle: string;
  /** Jour auquel se rapporte le mouvement (dans la période), ISO YYYY-MM-DD. */
  date: string;
  creeLe: string;
}

export interface Titre {
  id: string;
  montant: Cents;
}

export type MotifReinitialisation = "periode_trop_longue" | "premier_comptage" | "erreur" | "autre";

export interface Comptage {
  /** Date ISO "YYYY-MM-DD" : un comptage par jour. */
  id: string;
  date: string;
  statut: "brouillon" | "cloture";
  /** « cumulé » n'est pas stocké : il se déduit de la période. */
  type: "normal" | "reinitialisation";
  motifReinitialisation?: MotifReinitialisation;
  commentaireReinitialisation?: string;
  montantPieces: Cents;
  /** Valeur du billet en euros -> nombre. */
  billets: Record<number, number>;
  titresRestaurant: Titre[];
  chequesVacances: Titre[];
  mouvements: Mouvement[];
  /** Un montant espèces SumUp par jour de la période. */
  sumUp: { date: string; montant: Cents }[];
  /** Renseigné si l'utilisateur saisit directement un total pour la période. */
  sumUpTotalSaisi?: Cents;
  /** Billets laissés en caisse après pochette. */
  billetsGardes: Record<number, number>;
  /** Monnaie mise en pochette à la clôture (par défaut, toutes les pièces restent en caisse). */
  monnaiePochette?: Cents;
  /** L'utilisateur a ajusté lui-même les billets gardés : la proposition n'est plus recalculée. */
  fondManuel?: boolean;
  /** « Pas de pochette aujourd'hui » : tout reste en caisse. */
  pasDePochette?: boolean;
  commentaire?: string;
  comptePar?: string;
  creeLe: string;
  modifieLe: string;
  clotureLe?: string;
}

export interface JourFerme {
  date: string;
  motif?: string;
}

export interface PeriodeFermeture {
  debut: string;
  fin: string;
  motif?: string;
}

export interface Reglages {
  schemaVersion: number;
  nomEtablissement: string;
  /** 0 = dimanche … 6 = samedi */
  joursOuverture: number[];
  periodesFermeture: PeriodeFermeture[];
  fondCible: Cents;
  compositionCibleBillets: Record<number, number>;
  toleranceEcart: Cents;
  afficherBillet500: boolean;
  /** Nombre de jours d'ouverture au-delà duquel la réinitialisation est recommandée. */
  seuilReinitialisationJours: number;
  seuilAlerteMonnaie: Cents;
  seuilAlerteTitre: Cents;
  seuilAlerteEcart: Cents;
  commentaireObligatoireSiEcart: boolean;
  formatImpression: "a4" | "ticket80";
}

/** Ce qu'il faut connaître du calendrier pour savoir si un jour est ouvert. */
export interface Calendrier {
  joursOuverture: number[];
  periodesFermeture: { debut: string; fin: string }[];
  joursFermes: string[];
}

export type TypeEffectif = "normal" | "cumule" | "reinitialisation";

export interface Analyse {
  type: TypeEffectif;
  /** Aucun comptage clôturé avant celui-ci : réinitialisation d'office. */
  premier: boolean;
  comptageReference: Comptage | null;
  /** Fond laissé en caisse à la clôture du comptage de référence. */
  reference: Cents | null;
  /** Jours couverts par le comptage, dans l'ordre, date du comptage incluse. */
  periode: string[];
  /** Jours d'ouverture de la période sans comptage (hors date du comptage). */
  joursManques: string[];
  reinitRecommandee: boolean;
}

export const SCHEMA_VERSION = 1;

export const REGLAGES_PAR_DEFAUT: Reglages = {
  schemaVersion: SCHEMA_VERSION,
  nomEtablissement: "",
  joursOuverture: [0, 2, 3, 4, 5, 6],
  periodesFermeture: [],
  fondCible: 30000,
  compositionCibleBillets: { 5: 6, 10: 8, 20: 5 },
  toleranceEcart: 0,
  afficherBillet500: false,
  seuilReinitialisationJours: 7,
  seuilAlerteMonnaie: 30000,
  seuilAlerteTitre: 5000,
  seuilAlerteEcart: 2000,
  commentaireObligatoireSiEcart: true,
  formatImpression: "a4",
};
