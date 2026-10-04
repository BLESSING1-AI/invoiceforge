/**
 * Store facade.
 *
 * If DATABASE_URL is set → Postgres (production-ready, multi-instance safe).
 * Otherwise → hybrid filesystem / in-memory (local dev fallback).
 *
 * All API routes and business logic import only from this module.
 */

import { isDatabaseConfigured } from "./db";
import type {
  Business,
  Job,
  User,
  Reminder,
  EmailEvent,
} from "./types";

import * as memory from "./store-memory";
import * as postgres from "./store-postgres";

const usePostgres = () => isDatabaseConfigured();

function backend() {
  return usePostgres() ? postgres : memory;
}

export async function getUsers(): Promise<User[]> {
  return backend().getUsers();
}
export async function saveUsers(users: User[]): Promise<void> {
  return backend().saveUsers(users);
}
export async function findUserByEmail(email: string): Promise<User | undefined> {
  return backend().findUserByEmail(email);
}
export async function createUser(user: User): Promise<User> {
  return backend().createUser(user);
}

export async function getBusinesses(): Promise<Business[]> {
  return backend().getBusinesses();
}
export async function saveBusinesses(businesses: Business[]): Promise<void> {
  return backend().saveBusinesses(businesses);
}
export async function findBusinessByUserId(
  userId: string
): Promise<Business | undefined> {
  return backend().findBusinessByUserId(userId);
}
export async function createBusiness(business: Business): Promise<Business> {
  return backend().createBusiness(business);
}
export async function updateBusiness(
  id: string,
  updates: Partial<Business>
): Promise<Business | null> {
  return backend().updateBusiness(id, updates);
}

export async function getJobs(): Promise<Job[]> {
  return backend().getJobs();
}
export async function saveJobs(jobs: Job[]): Promise<void> {
  return backend().saveJobs(jobs);
}
export async function findJobsByBusinessId(
  businessId: string
): Promise<Job[]> {
  return backend().findJobsByBusinessId(businessId);
}
export async function findJobById(id: string): Promise<Job | undefined> {
  return backend().findJobById(id);
}
export async function createJob(job: Job): Promise<Job> {
  return backend().createJob(job);
}
export async function updateJob(
  id: string,
  updates: Partial<Job>
): Promise<Job | null> {
  return backend().updateJob(id, updates);
}

export async function getReminders(): Promise<Reminder[]> {
  return backend().getReminders();
}
export async function saveReminders(reminders: Reminder[]): Promise<void> {
  return backend().saveReminders(reminders);
}
export async function createReminder(reminder: Reminder): Promise<Reminder> {
  return backend().createReminder(reminder);
}

export async function getEmailEvents(): Promise<EmailEvent[]> {
  return backend().getEmailEvents();
}
export async function saveEmailEvents(events: EmailEvent[]): Promise<void> {
  return backend().saveEmailEvents(events);
}
export async function createEmailEvent(
  event: EmailEvent
): Promise<EmailEvent> {
  return backend().createEmailEvent(event);
}
export async function findEmailEventsByJobId(
  jobId: string
): Promise<EmailEvent[]> {
  return backend().findEmailEventsByJobId(jobId);
}

export function getStorageMode(): "postgres" | "memory" {
  return usePostgres() ? "postgres" : "memory";
}
