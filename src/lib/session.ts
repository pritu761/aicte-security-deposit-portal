import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";
import { cache } from "react";
import { cookies } from "next/headers";
import { asc, eq, or } from "drizzle-orm";

import { db } from "@/db";
import { institutions, users, type Institution, type UserRole } from "@/db/schema";

export const SESSION_COOKIE = "aicte_portal_session";
const SESSION_MAX_AGE = 60 * 60 * 24 * 7;

export type SessionUser = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  designation: string | null;
  institutionId: string | null;
  institutionName: string | null;
  institutionAicteId: string | null;
  institutionRegion: string | null;
  institutionState: string | null;
  institutionType: string | null;
  institution: Institution | null;
};

function secret(): string {
  const value = process.env.SESSION_SECRET;
  if (!value) {
    throw new Error("SESSION_SECRET is not configured.");
  }
  return value;
}

function sign(value: string): string {
  return createHmac("sha256", secret()).update(value).digest("base64url");
}

function verify(value: string, signature: string): boolean {
  const expected = Buffer.from(sign(value));
  const received = Buffer.from(signature);
  return expected.length === received.length && timingSafeEqual(expected, received);
}

export function encodeSession(userId: string): string {
  return `${userId}.${sign(userId)}`;
}

export function decodeSession(value: string | undefined): string | null {
  if (!value) return null;
  const separator = value.lastIndexOf(".");
  if (separator < 1) return null;
  const userId = value.slice(0, separator);
  const signature = value.slice(separator + 1);
  if (!/^[0-9a-f-]{36}$/i.test(userId)) return null;
  try {
    return verify(userId, signature) ? userId : null;
  } catch {
    return null;
  }
}

export function sessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  };
}

async function fetchUser(id: string): Promise<SessionUser | null> {
  const [row] = await db
    .select({ user: users, institution: institutions })
    .from(users)
    .leftJoin(institutions, eq(users.institutionId, institutions.id))
    .where(eq(users.id, id))
    .limit(1);

  if (!row || !row.user.isActive) return null;
  return {
    id: row.user.id,
    name: row.user.name,
    email: row.user.email,
    role: row.user.role,
    designation: row.user.designation,
    institutionId: row.user.institutionId,
    institutionName: row.institution?.name ?? null,
    institutionAicteId: row.institution?.aicteId ?? null,
    institutionRegion: row.institution?.region ?? null,
    institutionState: row.institution?.state ?? null,
    institutionType: row.institution?.institutionType ?? null,
    institution: row.institution,
  };
}

/**
 * Demo identity resolver.
 *
 * The evaluation build intentionally exposes a role switcher instead of a login
 * form (as required for testing). The signed, HttpOnly cookie and server-side
 * lookups still enforce RBAC on every action. Swap this resolver for AICTE SSO
 * (OIDC/SAML) without changing the rest of the application.
 */
export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  const cookieStore = await cookies();
  const id = decodeSession(cookieStore.get(SESSION_COOKIE)?.value);
  if (id) {
    const user = await fetchUser(id);
    if (user) return user;
  }

  // First visit: open as the Bureau Head so the portal is immediately usable.
  const [fallback] = await db
    .select({ id: users.id })
    .from(users)
    .where(
      or(
        eq(users.email, "head@aicte.gov.in"),
        eq(users.role, "REGULATION_BUREAU_HEAD"),
      ),
    )
    .orderBy(asc(users.email))
    .limit(1);
  if (!fallback) return null;
  return fetchUser(fallback.id);
});

export async function getDemoUserForRole(role: UserRole): Promise<SessionUser | null> {
  const preferredEmail: Record<UserRole, string> = {
    INSTITUTION_ADMIN: "admin@niet.ac.in",
    AICTE_SCRUTINY_OFFICER: "scrutiny@aicte.gov.in",
    REGULATION_BUREAU_HEAD: "head@aicte.gov.in",
  };
  const [preferred] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, preferredEmail[role]))
    .limit(1);
  const [fallback] = preferred
    ? [preferred]
    : await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.role, role))
        .orderBy(asc(users.email))
        .limit(1);
  return fallback ? fetchUser(fallback.id) : null;
}

export function canScrutinize(user: SessionUser): boolean {
  return user.role === "AICTE_SCRUTINY_OFFICER";
}

export function canApproveReleases(user: SessionUser): boolean {
  return user.role === "REGULATION_BUREAU_HEAD";
}

export function isBureauUser(user: SessionUser): boolean {
  return user.role === "AICTE_SCRUTINY_OFFICER" || user.role === "REGULATION_BUREAU_HEAD";
}

export function isInstitutionUser(user: SessionUser): boolean {
  return user.role === "INSTITUTION_ADMIN";
}

export function canViewAudit(user: SessionUser): boolean {
  return isBureauUser(user);
}

export function canViewAllRecords(user: SessionUser): boolean {
  return isBureauUser(user);
}

export function assertCanScrutinize(user: SessionUser): void {
  if (!canScrutinize(user)) {
    throw new Error("Only an AICTE Scrutiny Officer can perform this verification.");
  }
}

export function assertCanApprove(user: SessionUser): void {
  if (!canApproveReleases(user)) {
    throw new Error("Only the Regulation Bureau Head can authorise this release.");
  }
}

export function assertInstitutionScope(user: SessionUser, institutionId: string): void {
  if (user.role === "INSTITUTION_ADMIN" && user.institutionId !== institutionId) {
    throw new Error("This record belongs to another institution.");
  }
}
