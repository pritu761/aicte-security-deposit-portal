import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { db } from "@/db";
import { fdrDocuments, fdrInstruments } from "@/db/schema";
import { getCurrentUser } from "@/lib/session";
import { readStoredObject } from "@/lib/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) {
    return NextResponse.json({ error: "Document not found." }, { status: 404 });
  }

  const [row] = await db
    .select({
      document: fdrDocuments,
      institutionId: fdrInstruments.institutionId,
      fdrNumber: fdrInstruments.fdrNumber,
    })
    .from(fdrDocuments)
    .innerJoin(fdrInstruments, eq(fdrDocuments.fdrId, fdrInstruments.id))
    .where(eq(fdrDocuments.id, id))
    .limit(1);

  if (!row) {
    return NextResponse.json({ error: "Document not found." }, { status: 404 });
  }

  if (user.role === "INSTITUTION_ADMIN" && row.institutionId !== user.institutionId) {
    return NextResponse.json({ error: "You do not have access to this document." }, { status: 403 });
  }

  try {
    const buffer = await readStoredObject(row.document.storageKey, {
      fileName: row.document.fileName,
      sha256: row.document.sha256,
    });
    const safeName = row.document.fileName.replace(/["\\\r\n]/g, "_");
    const encoded = encodeURIComponent(row.document.fileName);

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": row.document.mimeType,
        "Content-Length": String(buffer.byteLength),
        "Content-Disposition": `inline; filename="${safeName}"; filename*=UTF-8''${encoded}`,
        "Cache-Control": "private, no-store, max-age=0",
        "X-Content-Type-Options": "nosniff",
        "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'",
      },
    });
  } catch (error) {
    console.error("[documents] Failed to read stored document", {
      documentId: id,
      fdrNumber: row.fdrNumber,
      error,
    });
    return NextResponse.json(
      { error: "The document could not be retrieved from secure storage." },
      { status: 500 },
    );
  }
}
