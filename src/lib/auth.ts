import { cookies } from "next/headers";
import { randomUUID } from "crypto";
import { createUser, findUserByEmail, findBusinessByUserId, createBusiness } from "./store";
import { User, Business } from "./types";
import { createHash } from "crypto";

const SESSION_COOKIE = "if_session";

function hashPassword(password: string): string {
  return createHash("sha256").update(password + "invoiceforge-salt").digest("hex");
}

export async function signUp(
  email: string,
  password: string,
  name: string,
  businessName: string
): Promise<{ user: User; business: Business } | { error: string }> {
  const existing = await findUserByEmail(email);
  if (existing) return { error: "Email already registered" };

  const user: User = {
    id: randomUUID(),
    email: email.toLowerCase(),
    passwordHash: hashPassword(password),
    name,
    createdAt: new Date().toISOString(),
  };
  await createUser(user);

  const business: Business = {
    id: randomUUID(),
    userId: user.id,
    name: businessName,
    email: email.toLowerCase(),
    phone: "",
    isVatRegistered: false,
    invoicePrefix: "INV",
    nextInvoiceNumber: 1,
    defaultPaymentTermsDays: 7,
    priceBook: [],
    createdAt: new Date().toISOString(),
  };
  await createBusiness(business);

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, user.id, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });

  return { user, business };
}

export async function signIn(
  email: string,
  password: string
): Promise<{ user: User } | { error: string }> {
  const user = await findUserByEmail(email);
  if (!user || user.passwordHash !== hashPassword(password)) {
    return { error: "Invalid email or password" };
  }

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, user.id, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });

  return { user };
}

export async function signOut() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}

export async function getCurrentUserId(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(SESSION_COOKIE)?.value ?? null;
}

export async function getSession(): Promise<{
  userId: string;
  business: Business;
} | null> {
  const userId = await getCurrentUserId();
  if (!userId) return null;
  const business = await findBusinessByUserId(userId);
  if (!business) return null;
  return { userId, business };
}
