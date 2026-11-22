// Data model for the TapTaxi admin back office.
// Money is always integer centimes, like the driver app (src/lib/model.ts).
import type { PayoutMethod } from "../../lib/model";

export type DocType = "cin" | "permit" | "vehicle" | "photo";
export type DocStatus = "pending" | "approved" | "rejected";

export interface DriverDocument {
  type: DocType;
  status: DocStatus;
  uploadedAt: number;
  /** Data read from the document, shown next to the preview for comparison. */
  fields: Record<string, string>;
  expiresAt?: number;
  reviewedAt?: number;
  reviewer?: string;
  rejectionReason?: string;
}

/** Where the driver's onboarding file stands in the review process. */
export type ApplicationStatus =
  "pending" | "changes_requested" | "approved" | "rejected";
/** Whether the driver can currently collect payments. */
export type AccountStatus = "onboarding" | "active" | "suspended" | "rejected";

export interface Note {
  id: string;
  author: string;
  body: string;
  at: number;
}

export interface Driver {
  id: string;
  name: string;
  phone: string;
  city: string;
  taxiNumber: string;
  plate: string;
  permitNumber: string;
  submittedAt: number;
  application: ApplicationStatus;
  account: AccountStatus;
  documents: DriverDocument[];
  notes: Note[];
  payout: PayoutMethod;
  rating: number;
  /** Average payments per active day; drives the generated demo activity. */
  activity: number;
}

export interface Payment {
  id: string;
  driverId: string;
  fare: number;
  tip: number;
  method: "card" | "wallet";
  at: number;
}

export type WithdrawalStatus = "pending" | "paid" | "failed";
export interface Withdrawal {
  id: string;
  driverId: string;
  amount: number;
  method: PayoutMethod;
  at: number;
  status: WithdrawalStatus;
}

export type TicketCategory =
  "payment" | "withdrawal" | "account" | "documents" | "passenger" | "other";
export type TicketPriority = "low" | "normal" | "high" | "urgent";
export type TicketStatus = "open" | "waiting" | "resolved";

export interface TicketMessage {
  id: string;
  from: "requester" | "agent";
  author: string;
  body: string;
  at: number;
  /** Internal notes are visible to the support team only. */
  internal?: boolean;
}

export interface Ticket {
  id: string;
  subject: string;
  category: TicketCategory;
  priority: TicketPriority;
  status: TicketStatus;
  requester: { name: string; role: "driver" | "passenger"; phone: string };
  driverId?: string;
  assignee?: string;
  createdAt: number;
  updatedAt: number;
  messages: TicketMessage[];
}

export interface AuditEntry {
  id: string;
  at: number;
  actor: string;
  action: string;
  /** Route to the affected record, e.g. "/drivers/D07". */
  link?: string;
}

/** Everything the admin can change. Payments are generated, not stored. */
export interface AdminState {
  version: 1;
  drivers: Driver[];
  withdrawals: Withdrawal[];
  tickets: Ticket[];
  audit: AuditEntry[];
}
