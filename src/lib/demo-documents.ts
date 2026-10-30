import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";

/**
 * Tracked demo evidence for seeded records.
 *
 * The encrypted vault lives in `.data/uploads`, which is intentionally ignored
 * by Git. A fresh clone or deployment therefore has database rows but no local
 * blobs. These PDFs are generated from the seed (and matched by file name) so
 * the authorised document route can still render seeded evidence.
 */

const DEMO_DIR = path.join(process.cwd(), "demo-documents");
const MANIFEST_PATH = path.join(DEMO_DIR, "manifest.json");

type DemoDocumentEntry = {
  docType: string;
  sizeBytes: number;
  sha256: string;
};

type DemoDocumentManifest = {
  documents?: Record<string, DemoDocumentEntry>;
};

let cachedDocuments: Record<string, DemoDocumentEntry> | undefined;

async function loadManifest(): Promise<Record<string, DemoDocumentEntry> | null> {
  if (cachedDocuments) return cachedDocuments;

  try {
    const raw = await readFile(MANIFEST_PATH, "utf8");
    const parsed = JSON.parse(raw) as DemoDocumentManifest;
    cachedDocuments = parsed.documents ?? {};
    return cachedDocuments;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  }
}

/**
 * Returns a committed demo PDF only when the exact seeded file name is listed
 * in the manifest and, when supplied, the database fingerprint matches.
 * Unknown names, including user uploads, never resolve here.
 */
export async function readDemoDocument(
  fileName: string,
  expectedSha256?: string,
): Promise<Buffer | null> {
  const safeName = path.basename(fileName);
  if (safeName !== fileName) return null;

  const documents = await loadManifest();
  const entry = documents?.[safeName];
  if (!entry) return null;
  if (expectedSha256 && entry.sha256 !== expectedSha256) return null;

  const buffer = await readFile(path.join(DEMO_DIR, safeName));
  const sha256 = createHash("sha256").update(buffer).digest("hex");

  if (buffer.byteLength !== entry.sizeBytes || sha256 !== entry.sha256) {
    throw new Error(`Demo document integrity check failed for ${safeName}.`);
  }
  if (buffer.subarray(0, 5).toString("latin1") !== "%PDF-") {
    throw new Error(`Demo document ${safeName} is not a PDF.`);
  }

  return buffer;
}
