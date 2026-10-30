"use server";

import { sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { db } from "@/db";
import { users } from "@/db/schema";
import { logAuditOutsideTransaction } from "@/lib/audit";
import { DUMMY_PASSWORD_HASH, verifyPassword } from "@/lib/password";
import {
  encodeSession,
  getCurrentUser,
  SESSION_COOKIE,
  sessionCookieOptions,
} from "@/lib/session";
import { loginSchema } from "@/lib/validation";

export type LoginState = {
  error?: string;
  email?: string;
};

const GENERIC_ERROR = "The email address or password is incorrect.";

export async function loginAction(
  _previousState: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return {
      error: "Enter your official email address and password to continue.",
      email: typeof formData.get("email") === "string" ? String(formData.get("email")) : "",
    };
  }

  const { email, password } = parsed.data;

  const [account] = await db
    .select({
      id: users.id,
      name: users.name,
      role: users.role,
      isActive: users.isActive,
      passwordHash: users.passwordHash,
    })
    .from(users)
    .where(sql`lower(${users.email}) = ${email}`)
    .limit(1);

  // Always perform a scrypt comparison so an unknown address is not
  // distinguishable from a wrong password by response timing.
  const validPassword = await verifyPassword(
    password,
    account?.passwordHash ?? DUMMY_PASSWORD_HASH,
  );

  if (!account || !account.isActive || !validPassword) {
    return { error: GENERIC_ERROR, email };
  }

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, encodeSession(account.id), sessionCookieOptions());

  try {
    await logAuditOutsideTransaction({
      entityType: "session",
      entityId: account.id,
      userId: account.id,
      action: "SESSION_STARTED",
      details: {
        email,
        role: account.role,
        source: "password",
      },
    });
  } catch (error) {
    console.error("[auth] Could not write the sign-in audit event", error);
  }

  revalidatePath("/", "layout");
  redirect("/dashboard");
}

export async function logoutAction(): Promise<void> {
  const user = await getCurrentUser();
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, "", { ...sessionCookieOptions(), maxAge: 0 });

  if (user) {
    try {
      await logAuditOutsideTransaction({
        entityType: "session",
        entityId: user.id,
        userId: user.id,
        action: "SESSION_ENDED",
        details: {
          email: user.email,
          role: user.role,
          source: "sign-out",
        },
      });
    } catch (error) {
      console.error("[auth] Could not write the sign-out audit event", error);
    }
  }

  revalidatePath("/", "layout");
  redirect("/login");
}
