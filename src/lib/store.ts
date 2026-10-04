import { promises as fs } from "fs";
import path from "path";
import { Business, Job, User, Reminder, EmailEvent } from "./types";

/**
 * Persistence layer.
 *
 * Current: hybrid filesystem (local) / in-memory (serverless).
 * Production target: Postgres via Supabase (DATABASE_URL).
 *
 * All business logic depends only on the exported functions below —
 * swap the implementation of readJson/writeJson for Supabase without
 * changing call sites.
 *
 * Env for future Supabase:
 *   DATABASE_URL=postgresql://...
 *   NEXT_PUBLIC_SUPABASE_URL=...
 *   SUPABASE_SERVICE_ROLE_KEY=...
 */

const DATA_DIR = path.join(process.cwd(), ".data");
const isServerless = process.env.VERCEL === "1" || process.env.AWS_LAMBDA_FUNCTION_NAME;

const memory: Record<string, any> = {
  users: [],
  businesses: [],
  jobs: [],
  reminders: [],
  email_events: [],
};

async function ensureDir() {
  if (isServerless) return;
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
  } catch {}
}

async function readJson<T>(filename: string, fallback: T): Promise<T> {
  const key = filename.replace(".json", "");
  if (isServerless) {
    return (memory[key] as T) ?? fallback;
  }
  await ensureDir();
  const file = path.join(DATA_DIR, filename);
  try {
    const raw = await fs.readFile(file, "utf-8");
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

async function writeJson<T>(filename: string, data: T): Promise<void> {
  const key = filename.replace(".json", "");
  if (isServerless) {
    memory[key] = data;
    return;
  }
  await ensureDir();
  const file = path.join(DATA_DIR, filename);
  await fs.writeFile(file, JSON.stringify(data, null, 2), "utf-8");
}

export async function getUsers(): Promise<User[]> {
  return readJson<User[]>("users.json", []);
}

export async function saveUsers(users: User[]): Promise<void> {
  await writeJson("users.json", users);
}

export async function findUserByEmail(email: string): Promise<User | undefined> {
  const users = await getUsers();
  return users.find((u) => u.email.toLowerCase() === email.toLowerCase());
}

export async function createUser(user: User): Promise<User> {
  const users = await getUsers();
  users.push(user);
  await saveUsers(users);
  return user;
}

export async function getBusinesses(): Promise<Business[]> {
  return readJson<Business[]>("businesses.json", []);
}

export async function saveBusinesses(businesses: Business[]): Promise<void> {
  await writeJson("businesses.json", businesses);
}

export async function findBusinessByUserId(userId: string): Promise<Business | undefined> {
  const businesses = await getBusinesses();
  return businesses.find((b) => b.userId === userId);
}

export async function createBusiness(business: Business): Promise<Business> {
  const businesses = await getBusinesses();
  businesses.push(business);
  await saveBusinesses(businesses);
  return business;
}

export async function updateBusiness(id: string, updates: Partial<Business>): Promise<Business | null> {
  const businesses = await getBusinesses();
  const idx = businesses.findIndex((b) => b.id === id);
  if (idx === -1) return null;
  businesses[idx] = { ...businesses[idx], ...updates };
  await saveBusinesses(businesses);
  return businesses[idx];
}

export async function getJobs(): Promise<Job[]> {
  return readJson<Job[]>("jobs.json", []);
}

export async function saveJobs(jobs: Job[]): Promise<void> {
  await writeJson("jobs.json", jobs);
}

export async function findJobsByBusinessId(businessId: string): Promise<Job[]> {
  const jobs = await getJobs();
  return jobs
    .filter((j) => j.businessId === businessId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export async function findJobById(id: string): Promise<Job | undefined> {
  const jobs = await getJobs();
  return jobs.find((j) => j.id === id);
}

export async function createJob(job: Job): Promise<Job> {
  const jobs = await getJobs();
  jobs.push(job);
  await saveJobs(jobs);
  return job;
}

export async function updateJob(id: string, updates: Partial<Job>): Promise<Job | null> {
  const jobs = await getJobs();
  const idx = jobs.findIndex((j) => j.id === id);
  if (idx === -1) return null;
  jobs[idx] = { ...jobs[idx], ...updates, updatedAt: new Date().toISOString() };
  await saveJobs(jobs);
  return jobs[idx];
}

export async function getReminders(): Promise<Reminder[]> {
  return readJson<Reminder[]>("reminders.json", []);
}

export async function saveReminders(reminders: Reminder[]): Promise<void> {
  await writeJson("reminders.json", reminders);
}

export async function createReminder(reminder: Reminder): Promise<Reminder> {
  const reminders = await getReminders();
  reminders.push(reminder);
  await saveReminders(reminders);
  return reminder;
}

export async function getEmailEvents(): Promise<EmailEvent[]> {
  return readJson<EmailEvent[]>("email_events.json", []);
}

export async function saveEmailEvents(events: EmailEvent[]): Promise<void> {
  await writeJson("email_events.json", events);
}

export async function createEmailEvent(event: EmailEvent): Promise<EmailEvent> {
  const events = await getEmailEvents();
  events.push(event);
  await saveEmailEvents(events);
  return event;
}

export async function findEmailEventsByJobId(jobId: string): Promise<EmailEvent[]> {
  const events = await getEmailEvents();
  return events
    .filter((e) => e.jobId === jobId)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}
