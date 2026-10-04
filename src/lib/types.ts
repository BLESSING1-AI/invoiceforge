export type JobStatus =
  | "draft"
  | "extracted"
  | "pending_approval"
  | "approved"
  | "sent"
  | "viewed"
  | "partially_paid"
  | "paid"
  | "overdue"
  | "cancelled";

export interface LineItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
  type: "labour" | "material" | "callout" | "other";
}

export interface Customer {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  address?: string;
}

export interface Job {
  id: string;
  businessId: string;
  customer: Customer;
  status: JobStatus;
  rawInput: string;
  voiceNoteUrl?: string;
  photoUrls: string[];
  receiptUrls: string[];
  lineItems: LineItem[];
  notes?: string;
  subtotal: number;
  vatRate: number;
  vatAmount: number;
  total: number;
  invoiceNumber?: string;
  invoicePdfUrl?: string;
  paymentLink?: string;
  dueDate?: string;
  paidAt?: string;
  sentAt?: string;
  createdAt: string;
  updatedAt: string;
  extractionConfidence: number;
  missingFields: string[];
  auditLog: AuditEntry[];
}

export interface AuditEntry {
  timestamp: string;
  action: string;
  actor: string;
  details?: string;
}

export interface Business {
  id: string;
  userId: string;
  name: string;
  email: string;
  phone: string;
  address?: string;
  vatNumber?: string;
  isVatRegistered: boolean;
  bankName?: string;
  bankAccount?: string;
  bankBranch?: string;
  logoUrl?: string;
  invoicePrefix: string;
  nextInvoiceNumber: number;
  defaultPaymentTermsDays: number;
  priceBook: PriceBookEntry[];
  createdAt: string;
}

export interface PriceBookEntry {
  key: string;
  description: string;
  unitPrice: number;
  type: LineItem["type"];
  lastUsed: string;
  useCount: number;
}

export interface User {
  id: string;
  email: string;
  passwordHash: string;
  name: string;
  createdAt: string;
}

export interface Reminder {
  id: string;
  jobId: string;
  businessId: string;
  type: "before_due" | "on_due" | "overdue_1" | "overdue_7";
  scheduledFor: string;
  sentAt?: string;
  status: "pending" | "sent" | "cancelled";
  message: string;
}
