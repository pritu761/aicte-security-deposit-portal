import { redirect } from "next/navigation";

import { PortalShell } from "@/components/navigation/portal-shell";
import { getRecentAudit } from "@/lib/queries";
import { getCurrentUser } from "@/lib/session";

export default async function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const notifications = await getRecentAudit(user, 9);

  return (
    <PortalShell user={user} notifications={notifications}>
      {children}
    </PortalShell>
  );
}
