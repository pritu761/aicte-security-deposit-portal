"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { getCurrentUser, getDemoUserForRole, SESSION_COOKIE, sessionCookieOptions, encodeSession } from "@/lib/session";
import { logAuditOutsideTransaction } from "@/lib/audit";
import { roleSwitchSchema } from "@/lib/validation";

export async function switchRoleAction(role: string): Promise<void> {
  const parsed = roleSwitchSchema.safeParse({ role });
  if (!parsed.success) {
    throw new Error("Invalid role selected.");
  }

  const current = await getCurrentUser();
  const target = await getDemoUserForRole(parsed.data.role);
  if (!target) {
    throw new Error("No demo user is configured for this role. Run the seed script.");
  }

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, encodeSession(target.id), sessionCookieOptions());

  await logAuditOutsideTransaction({
    entityType: "user",
    entityId: target.id,
    userId: target.id,
    action: "ROLE_SWITCHED",
    details: {
      fromRole: current?.role ?? null,
      toRole: target.role,
      fromUser: current?.email ?? null,
      toUser: target.email,
      source: "demo-role-switcher",
    },
  });

  revalidatePath("/", "layout");
  redirect("/dashboard");
}
