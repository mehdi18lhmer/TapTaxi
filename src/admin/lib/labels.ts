// French display labels for every enum in the admin model.
import type {
  AccountStatus,
  ApplicationStatus,
  DocStatus,
  DocType,
  TicketCategory,
  TicketPriority,
  TicketStatus,
  WithdrawalStatus,
} from "./types";

export const docTitle: Record<DocType, string> = {
  cin: "Carte nationale (CIN)",
  permit: "Permis de confiance",
  vehicle: "Carte grise du taxi",
  photo: "Photo de profil",
};

export const docStatusLabel: Record<DocStatus, string> = {
  pending: "À vérifier",
  approved: "Validé",
  rejected: "Refusé",
};

export const applicationLabel: Record<ApplicationStatus, string> = {
  pending: "À vérifier",
  changes_requested: "En attente du chauffeur",
  approved: "Validé",
  rejected: "Refusé",
};

export const accountLabel: Record<AccountStatus, string> = {
  onboarding: "Inscription",
  active: "Actif",
  suspended: "Suspendu",
  rejected: "Refusé",
};

export const categoryLabel: Record<TicketCategory, string> = {
  payment: "Paiement",
  withdrawal: "Retrait",
  account: "Compte",
  documents: "Documents",
  passenger: "Passager",
  other: "Autre",
};

export const priorityLabel: Record<TicketPriority, string> = {
  low: "Basse",
  normal: "Normale",
  high: "Haute",
  urgent: "Urgente",
};

export const ticketStatusLabel: Record<TicketStatus, string> = {
  open: "Ouvert",
  waiting: "En attente de réponse",
  resolved: "Résolu",
};

export const withdrawalStatusLabel: Record<WithdrawalStatus, string> = {
  pending: "À traiter",
  paid: "Versé",
  failed: "Échoué",
};

/** Reasons offered when refusing a document; the reviewer can also type their own. */
export const rejectionReasons = [
  "Document illisible ou flou",
  "Document expiré",
  "Le nom ne correspond pas au compte",
  "Recto ou verso manquant",
  "Le numéro de taxi ne correspond pas",
];
