import { DatabaseZap } from "lucide-react";

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
    return (
      <div className="flex min-h-dvh items-center justify-center px-6 py-12">
        <div className="w-full max-w-xl rounded-2xl border border-border bg-card p-8 shadow-lift">
          <span className="inline-flex rounded-xl border border-amber-200 bg-amber-50 p-3 text-amber-700">
            <DatabaseZap className="h-6 w-6" aria-hidden />
          </span>
          <p className="eyebrow mt-5">Portal not initialised</p>
          <h1 className="font-display mt-1 text-2xl font-semibold text-navy-900">
            Connect and seed the database
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            The demo identity resolver could not find a seeded user. Start PostgreSQL, apply the
            Drizzle schema, and run the demo seed.
          </p>
          <pre className="mt-4 overflow-x-auto rounded-lg bg-navy-950 p-4 text-[11.5px] leading-relaxed text-white/85">
            <code>{`docker start aicte-fdr-postgres
npm run db:push
npm run db:seed
npm run dev`}</code>
          </pre>
          <p className="mt-3 text-[11px] text-muted-foreground">
            Configure <code className="rounded bg-muted px-1 py-0.5">DATABASE_URL</code> in{" "}
            <code className="rounded bg-muted px-1 py-0.5">.env.local</code>. For Neon, paste the
            pooled connection string and set <code>DATABASE_SSL=true</code> if required.
          </p>
        </div>
      </div>
    );
  }

  const notifications = await getRecentAudit(user, 9);

  return (
    <PortalShell user={user} notifications={notifications}>
      {children}
    </PortalShell>
  );
}
