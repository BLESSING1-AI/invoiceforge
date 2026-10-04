import { randomUUID } from "crypto";
import { query } from "./db";
import {
  Business,
  Job,
  User,
  Reminder,
  EmailEvent,
  LineItem,
  PriceBookEntry,
  Customer,
  AuditEntry,
} from "./types";

export async function getUsers(): Promise<User[]> {
  const { rows } = await query<{ id: string; email: string; password_hash: string; name: string; created_at: Date }>(
    "SELECT id, email, password_hash, name, created_at FROM users"
  );
  return rows.map((r) => ({
    id: r.id,
    email: r.email,
    passwordHash: r.password_hash,
    name: r.name,
    createdAt: r.created_at.toISOString(),
  }));
}

export async function saveUsers(_users: User[]): Promise<void> {}

export async function findUserByEmail(email: string): Promise<User | undefined> {
  const { rows } = await query<{ id: string; email: string; password_hash: string; name: string; created_at: Date }>(
    "SELECT id, email, password_hash, name, created_at FROM users WHERE lower(email) = lower($1) LIMIT 1",
    [email]
  );
  if (!rows[0]) return undefined;
  const r = rows[0];
  return { id: r.id, email: r.email, passwordHash: r.password_hash, name: r.name, createdAt: r.created_at.toISOString() };
}

export async function createUser(user: User): Promise<User> {
  await query(
    `INSERT INTO users (id, email, password_hash, name, created_at) VALUES ($1, $2, $3, $4, $5)`,
    [user.id, user.email, user.passwordHash, user.name, user.createdAt]
  );
  return user;
}

function mapBusiness(r: Record<string, unknown>, priceBook: PriceBookEntry[]): Business {
  return {
    id: r.id as string,
    userId: r.user_id as string,
    name: r.name as string,
    email: r.email as string,
    phone: (r.phone as string) || "",
    address: (r.address as string) || undefined,
    vatNumber: (r.vat_number as string) || undefined,
    isVatRegistered: Boolean(r.is_vat_registered),
    bankName: (r.bank_name as string) || undefined,
    bankAccount: (r.bank_account as string) || undefined,
    bankBranch: (r.bank_branch as string) || undefined,
    logoUrl: (r.logo_url as string) || undefined,
    invoicePrefix: (r.invoice_prefix as string) || "INV",
    nextInvoiceNumber: Number(r.next_invoice_number) || 1,
    defaultPaymentTermsDays: Number(r.default_payment_terms_days) || 7,
    priceBook,
    createdAt: new Date(r.created_at as string | Date).toISOString(),
  };
}

async function loadPriceBook(businessId: string): Promise<PriceBookEntry[]> {
  const { rows } = await query<{ key: string; description: string; unit_price: string; item_type: string; last_used: Date; use_count: number }>(
    `SELECT key, description, unit_price, item_type, last_used, use_count FROM price_memory WHERE business_id = $1 ORDER BY use_count DESC`,
    [businessId]
  );
  return rows.map((r) => ({
    key: r.key,
    description: r.description,
    unitPrice: Number(r.unit_price),
    type: r.item_type as LineItem["type"],
    lastUsed: r.last_used.toISOString(),
    useCount: r.use_count,
  }));
}

export async function getBusinesses(): Promise<Business[]> {
  const { rows } = await query("SELECT * FROM businesses");
  const result: Business[] = [];
  for (const r of rows) result.push(mapBusiness(r, await loadPriceBook(r.id as string)));
  return result;
}

export async function saveBusinesses(_b: Business[]): Promise<void> {}

export async function findBusinessByUserId(userId: string): Promise<Business | undefined> {
  const { rows } = await query("SELECT * FROM businesses WHERE user_id = $1 LIMIT 1", [userId]);
  if (!rows[0]) return undefined;
  return mapBusiness(rows[0], await loadPriceBook(rows[0].id as string));
}

export async function createBusiness(business: Business): Promise<Business> {
  await query(
    `INSERT INTO businesses (
      id, user_id, name, email, phone, address, vat_number, is_vat_registered,
      bank_name, bank_account, bank_branch, logo_url, invoice_prefix,
      next_invoice_number, default_payment_terms_days, created_at
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)`,
    [
      business.id, business.userId, business.name, business.email, business.phone || "",
      business.address || null, business.vatNumber || null, business.isVatRegistered,
      business.bankName || null, business.bankAccount || null, business.bankBranch || null,
      business.logoUrl || null, business.invoicePrefix, business.nextInvoiceNumber,
      business.defaultPaymentTermsDays, business.createdAt,
    ]
  );
  return business;
}

export async function updateBusiness(id: string, updates: Partial<Business>): Promise<Business | null> {
  const existing = await query("SELECT * FROM businesses WHERE id = $1", [id]);
  if (!existing.rows[0]) return null;
  const merged = mapBusiness(existing.rows[0], await loadPriceBook(id));
  const b = { ...merged, ...updates };
  await query(
    `UPDATE businesses SET
      name=$2, email=$3, phone=$4, address=$5, vat_number=$6, is_vat_registered=$7,
      bank_name=$8, bank_account=$9, bank_branch=$10, logo_url=$11, invoice_prefix=$12,
      next_invoice_number=$13, default_payment_terms_days=$14
     WHERE id=$1`,
    [
      id, b.name, b.email, b.phone || "", b.address || null, b.vatNumber || null, b.isVatRegistered,
      b.bankName || null, b.bankAccount || null, b.bankBranch || null, b.logoUrl || null,
      b.invoicePrefix, b.nextInvoiceNumber, b.defaultPaymentTermsDays,
    ]
  );
  if (updates.priceBook) {
    for (const entry of updates.priceBook) {
      await query(
        `INSERT INTO price_memory (business_id, key, description, unit_price, item_type, use_count, last_used)
         VALUES ($1,$2,$3,$4,$5,$6,$7)
         ON CONFLICT (business_id, key) DO UPDATE SET
           description=EXCLUDED.description, unit_price=EXCLUDED.unit_price,
           item_type=EXCLUDED.item_type, use_count=EXCLUDED.use_count, last_used=EXCLUDED.last_used`,
        [id, entry.key, entry.description, entry.unitPrice, entry.type, entry.useCount, entry.lastUsed]
      );
    }
  }
  return findBusinessByUserId(b.userId);
}

async function loadJobItems(jobId: string): Promise<LineItem[]> {
  const { rows } = await query<{ id: string; description: string; quantity: string; unit_price: string; total: string; item_type: string }>(
    `SELECT id, description, quantity, unit_price, total, item_type FROM job_items WHERE job_id=$1 ORDER BY sort_order, id`,
    [jobId]
  );
  return rows.map((r) => ({
    id: r.id, description: r.description, quantity: Number(r.quantity),
    unitPrice: Number(r.unit_price), total: Number(r.total), type: r.item_type as LineItem["type"],
  }));
}

async function loadAuditForJob(jobId: string): Promise<AuditEntry[]> {
  const { rows } = await query<{ created_at: Date; event_type: string; actor: string; details: string | null }>(
    `SELECT created_at, event_type, actor, details FROM audit_events WHERE job_id=$1 ORDER BY created_at ASC`,
    [jobId]
  );
  return rows.map((r) => ({
    timestamp: r.created_at.toISOString(), action: r.event_type, actor: r.actor, details: r.details || undefined,
  }));
}

async function mapJob(row: Record<string, unknown>): Promise<Job> {
  const customer: Customer = {
    id: (row.customer_id as string) || (row.customer_uuid as string) || "",
    name: (row.customer_name as string) || "Unknown",
    email: (row.customer_email as string) || undefined,
    phone: (row.customer_phone as string) || undefined,
    address: (row.customer_address as string) || undefined,
  };
  let missingFields: string[] = [];
  try {
    missingFields = Array.isArray(row.missing_fields)
      ? (row.missing_fields as string[])
      : JSON.parse(String(row.missing_fields || "[]"));
  } catch { missingFields = []; }
  return {
    id: row.id as string,
    businessId: row.business_id as string,
    customer,
    status: row.status as Job["status"],
    rawInput: (row.raw_input as string) || "",
    photoUrls: Array.isArray(row.photo_urls) ? (row.photo_urls as string[]) : [],
    receiptUrls: Array.isArray(row.receipt_urls) ? (row.receipt_urls as string[]) : [],
    lineItems: await loadJobItems(row.id as string),
    notes: (row.notes as string) || undefined,
    subtotal: Number(row.subtotal) || 0,
    vatRate: Number(row.vat_rate) || 0,
    vatAmount: Number(row.vat_amount) || 0,
    total: Number(row.total) || 0,
    invoiceNumber: (row.invoice_number as string) || undefined,
    dueDate: row.due_date ? new Date(row.due_date as string | Date).toISOString() : undefined,
    paidAt: row.paid_at ? new Date(row.paid_at as string | Date).toISOString() : undefined,
    sentAt: row.sent_at ? new Date(row.sent_at as string | Date).toISOString() : undefined,
    emailDeliveryStatus: (row.email_delivery_status as Job["emailDeliveryStatus"]) || undefined,
    lastEmailAt: row.last_email_at ? new Date(row.last_email_at as string | Date).toISOString() : undefined,
    lastEmailTo: (row.last_email_to as string) || undefined,
    createdAt: new Date(row.created_at as string | Date).toISOString(),
    updatedAt: new Date(row.updated_at as string | Date).toISOString(),
    extractionConfidence: Number(row.extraction_confidence) || 0,
    missingFields,
    auditLog: await loadAuditForJob(row.id as string),
  };
}

const jobSelect = `
  SELECT j.*,
    c.id AS customer_uuid, c.name AS customer_name, c.email AS customer_email,
    c.phone AS customer_phone, c.address AS customer_address
  FROM jobs j LEFT JOIN customers c ON c.id = j.customer_id
`;

export async function getJobs(): Promise<Job[]> {
  const { rows } = await query(`${jobSelect} ORDER BY j.created_at DESC`);
  const jobs: Job[] = [];
  for (const r of rows) jobs.push(await mapJob(r));
  return jobs;
}

export async function saveJobs(_jobs: Job[]): Promise<void> {}

export async function findJobsByBusinessId(businessId: string): Promise<Job[]> {
  const { rows } = await query(`${jobSelect} WHERE j.business_id = $1 ORDER BY j.created_at DESC`, [businessId]);
  const jobs: Job[] = [];
  for (const r of rows) jobs.push(await mapJob(r));
  return jobs;
}

export async function findJobById(id: string): Promise<Job | undefined> {
  const { rows } = await query(`${jobSelect} WHERE j.id = $1 LIMIT 1`, [id]);
  if (!rows[0]) return undefined;
  return mapJob(rows[0]);
}

async function upsertCustomer(businessId: string, customer: Customer): Promise<string> {
  if (customer.id) {
    const existing = await query("SELECT id FROM customers WHERE id=$1 AND business_id=$2", [customer.id, businessId]);
    if (existing.rows[0]) {
      await query(
        `UPDATE customers SET name=$3, email=$4, phone=$5, address=$6, updated_at=now() WHERE id=$1 AND business_id=$2`,
        [customer.id, businessId, customer.name, customer.email || null, customer.phone || null, customer.address || null]
      );
      return customer.id;
    }
  }
  const id = customer.id || randomUUID();
  await query(
    `INSERT INTO customers (id, business_id, name, email, phone, address) VALUES ($1,$2,$3,$4,$5,$6)`,
    [id, businessId, customer.name, customer.email || null, customer.phone || null, customer.address || null]
  );
  return id;
}

async function replaceJobItems(jobId: string, businessId: string, items: LineItem[]) {
  await query("DELETE FROM job_items WHERE job_id=$1", [jobId]);
  let order = 0;
  for (const item of items) {
    await query(
      `INSERT INTO job_items (id, job_id, business_id, description, quantity, unit_price, total, item_type, sort_order)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      [item.id, jobId, businessId, item.description, item.quantity, item.unitPrice, item.total, item.type, order++]
    );
  }
}

async function syncAuditEvents(jobId: string, businessId: string, auditLog: AuditEntry[]) {
  const existing = await loadAuditForJob(jobId);
  const existingKeys = new Set(existing.map((e) => `${e.timestamp}|${e.action}`));
  for (const entry of auditLog) {
    if (existingKeys.has(`${entry.timestamp}|${entry.action}`)) continue;
    await query(
      `INSERT INTO audit_events (business_id, job_id, event_type, actor, details, created_at) VALUES ($1,$2,$3,$4,$5,$6)`,
      [businessId, jobId, entry.action, entry.actor, entry.details || null, entry.timestamp]
    );
  }
}

export async function createJob(job: Job): Promise<Job> {
  const customerId = await upsertCustomer(job.businessId, job.customer);
  await query(
    `INSERT INTO jobs (
      id, business_id, customer_id, status, raw_input, notes,
      subtotal, vat_rate, vat_amount, total, invoice_number,
      due_date, paid_at, sent_at, email_delivery_status, last_email_at, last_email_to,
      extraction_confidence, missing_fields, photo_urls, receipt_urls, created_at, updated_at
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23)`,
    [
      job.id, job.businessId, customerId, job.status, job.rawInput, job.notes || null,
      job.subtotal, job.vatRate, job.vatAmount, job.total, job.invoiceNumber || null,
      job.dueDate || null, job.paidAt || null, job.sentAt || null,
      job.emailDeliveryStatus || null, job.lastEmailAt || null, job.lastEmailTo || null,
      job.extractionConfidence, JSON.stringify(job.missingFields || []),
      JSON.stringify(job.photoUrls || []), JSON.stringify(job.receiptUrls || []),
      job.createdAt, job.updatedAt,
    ]
  );
  await replaceJobItems(job.id, job.businessId, job.lineItems);
  await syncAuditEvents(job.id, job.businessId, job.auditLog || []);
  return (await findJobById(job.id))!;
}

export async function updateJob(id: string, updates: Partial<Job>): Promise<Job | null> {
  const current = await findJobById(id);
  if (!current) return null;
  const job = { ...current, ...updates, updatedAt: new Date().toISOString() };
  let customerId = current.customer.id;
  if (updates.customer) {
    customerId = await upsertCustomer(job.businessId, { ...current.customer, ...updates.customer });
  }
  await query(
    `UPDATE jobs SET
      customer_id=$2, status=$3, raw_input=$4, notes=$5,
      subtotal=$6, vat_rate=$7, vat_amount=$8, total=$9,
      invoice_number=$10, due_date=$11, paid_at=$12, sent_at=$13,
      email_delivery_status=$14, last_email_at=$15, last_email_to=$16,
      extraction_confidence=$17, missing_fields=$18, photo_urls=$19, receipt_urls=$20,
      updated_at=$21
     WHERE id=$1 AND business_id=$22`,
    [
      id, customerId || null, job.status, job.rawInput, job.notes || null,
      job.subtotal, job.vatRate, job.vatAmount, job.total,
      job.invoiceNumber || null, job.dueDate || null, job.paidAt || null, job.sentAt || null,
      job.emailDeliveryStatus || null, job.lastEmailAt || null, job.lastEmailTo || null,
      job.extractionConfidence, JSON.stringify(job.missingFields || []),
      JSON.stringify(job.photoUrls || []), JSON.stringify(job.receiptUrls || []),
      job.updatedAt, job.businessId,
    ]
  );
  if (updates.lineItems) await replaceJobItems(id, job.businessId, job.lineItems);
  if (updates.auditLog) await syncAuditEvents(id, job.businessId, job.auditLog);
  return findJobById(id);
}

export async function getReminders(): Promise<Reminder[]> { return []; }
export async function saveReminders(_r: Reminder[]): Promise<void> {}
export async function createReminder(reminder: Reminder): Promise<Reminder> { return reminder; }

export async function getEmailEvents(): Promise<EmailEvent[]> {
  const { rows } = await query(
    `SELECT id, job_id, business_id, recipient, provider, provider_message_id, success, error, created_at FROM email_events ORDER BY created_at DESC`
  );
  return rows.map((r) => ({
    id: r.id as string, jobId: r.job_id as string, businessId: r.business_id as string,
    recipientEmail: r.recipient as string,
    timestamp: new Date(r.created_at as string | Date).toISOString(),
    provider: r.provider as string, success: Boolean(r.success),
    messageId: (r.provider_message_id as string) || undefined,
    error: (r.error as string) || undefined,
  }));
}

export async function saveEmailEvents(_e: EmailEvent[]): Promise<void> {}

export async function createEmailEvent(event: EmailEvent): Promise<EmailEvent> {
  await query(
    `INSERT INTO email_events (id, business_id, job_id, recipient, provider, provider_message_id, success, error, created_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
    [event.id, event.businessId, event.jobId, event.recipientEmail, event.provider, event.messageId || null, event.success, event.error || null, event.timestamp]
  );
  return event;
}

export async function findEmailEventsByJobId(jobId: string): Promise<EmailEvent[]> {
  const { rows } = await query(
    `SELECT id, job_id, business_id, recipient, provider, provider_message_id, success, error, created_at FROM email_events WHERE job_id=$1 ORDER BY created_at DESC`,
    [jobId]
  );
  return rows.map((r) => ({
    id: r.id as string, jobId: r.job_id as string, businessId: r.business_id as string,
    recipientEmail: r.recipient as string,
    timestamp: new Date(r.created_at as string | Date).toISOString(),
    provider: r.provider as string, success: Boolean(r.success),
    messageId: (r.provider_message_id as string) || undefined,
    error: (r.error as string) || undefined,
  }));
}
