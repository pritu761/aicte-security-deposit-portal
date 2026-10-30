import { and, inArray, ne, notInArray } from "drizzle-orm";
import { NextResponse } from "next/server";

import { db } from "@/db";
import { fdrInstruments, type FdrStatus } from "@/db/schema";
import { logAudit } from "@/lib/audit";
import { statusFromMaturity } from "@/lib/fdr-status";
import { todayISO } from "@/lib/utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const LOCKED: FdrStatus[] = [
  "RELEASED",
  "RELEASE_REQUESTED",
  "RENEWAL_PENDING",
  "DISCREPANCY_FLAGGED",
];

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: "CRON_SECRET is not configured on this deployment." },
      { status: 503 },
    );
  }
  const authorization = request.headers.get("authorization") ?? "";
  if (authorization !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorised." }, { status: 401 });
  }

  const rows = await db
    .select({
      id: fdrInstruments.id,
      fdrNumber: fdrInstruments.fdrNumber,
      status: fdrInstruments.status,
      maturityDate: fdrInstruments.maturityDate,
    })
    .from(fdrInstruments)
    .where(notInArray(fdrInstruments.status, LOCKED));

  const changes: {
    id: string;
    fdrNumber: string;
    from: FdrStatus;
    to: FdrStatus;
  }[] = [];

  for (const row of rows) {
    const next = statusFromMaturity(row.maturityDate);
    if (next !== row.status) {
      changes.push({ id: row.id, fdrNumber: row.fdrNumber, from: row.status, to: next });
    }
  }

  if (!changes.length) {
    return NextResponse.json({
      status: "ok",
      checked: rows.length,
      updated: 0,
      today: todayISO(),
    });
  }

  const now = new Date();
  await db.transaction(async (tx) => {
    for (const change of changes) {
      await tx
        .update(fdrInstruments)
        .set({ status: change.to, updatedAt: now })
        .where(
          and(
            inArray(fdrInstruments.id, [change.id]),
            ne(fdrInstruments.status, change.to),
          ),
        );
      await logAudit(tx, {
        entityType: "fdr",
        entityId: change.id,
        userId: null,
        action: "STATUS_REFRESHED",
        details: {
          before: { status: change.from },
          after: { status: change.to, maturityDate: rows.find((row) => row.id === change.id)?.maturityDate },
          source: "scheduled maturity refresh",
        },
      });
    }
  });

  return NextResponse.json({
    status: "ok",
    checked: rows.length,
    updated: changes.length,
    today: todayISO(),
    changes,
  });
}
