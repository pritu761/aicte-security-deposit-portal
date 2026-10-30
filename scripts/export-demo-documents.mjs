import { createHash, createDecipheriv } from "node:crypto";
import { mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";

import { Client } from "pg";

/**
 * Exports the seeded encrypted vault into the tracked demo-document fallback.
 *
 * Usage: npm run db:export-demo
 * Requires DATABASE_URL and DOCUMENT_ENCRYPTION_KEY in .env.local.
 */

const OUTPUT_DIR = path.join(process.cwd(), "demo-documents");
const UPLOAD_DIR = path.join(process.cwd(), ".data", "uploads");
const MANIFEST_PATH = path.join(OUTPUT_DIR, "manifest.json");
const MAGIC = Buffer.from("AICTE1");

function encryptionKey() {
  const raw = process.env.DOCUMENT_ENCRYPTION_KEY;
  if (!raw) throw new Error("DOCUMENT_ENCRYPTION_KEY is not configured.");
  const key = Buffer.from(raw, "base64");
  if (key.length !== 32) {
    throw new Error("DOCUMENT_ENCRYPTION_KEY must be a base64 encoded 32-byte key.");
  }
  return key;
}

function decrypt(payload) {
  if (!payload.subarray(0, MAGIC.length).equals(MAGIC)) {
    throw new Error("Unrecognised document envelope.");
  }
  const iv = payload.subarray(MAGIC.length, MAGIC.length + 12);
  const tag = payload.subarray(MAGIC.length + 12, MAGIC.length + 28);
  const ciphertext = payload.subarray(MAGIC.length + 28);
  const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
}

async function main() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: /sslmode=require/i.test(process.env.DATABASE_URL ?? "")
      ? { rejectUnauthorized: false }
      : undefined,
  });

  await client.connect();
  const { rows } = await client.query(
    "select file_name, doc_type, storage_key from fdr_documents order by file_name",
  );
  await client.end();

  await mkdir(OUTPUT_DIR, { recursive: true });
  for (const entry of await readdir(OUTPUT_DIR)) {
    if (entry.endsWith(".pdf")) await rm(path.join(OUTPUT_DIR, entry));
  }

  const seen = new Set();
  const documents = {};

  for (const row of rows) {
    const fileName = row.file_name;
    if (!/^[A-Za-z0-9._-]+\.pdf$/.test(fileName)) {
      throw new Error(`Unsafe demo file name: ${fileName}`);
    }
    if (seen.has(fileName)) throw new Error(`Duplicate demo file name: ${fileName}`);
    seen.add(fileName);

    const encrypted = await readFile(path.join(UPLOAD_DIR, `${row.storage_key}.bin`));
    const pdf = decrypt(encrypted);
    if (pdf.subarray(0, 5).toString("latin1") !== "%PDF-") {
      throw new Error(`Decrypted payload is not a PDF: ${fileName}`);
    }

    await writeFile(path.join(OUTPUT_DIR, fileName), pdf);
    documents[fileName] = {
      docType: row.doc_type,
      sizeBytes: pdf.length,
      sha256: createHash("sha256").update(pdf).digest("hex"),
    };
  }

  await writeFile(
    MANIFEST_PATH,
    `${JSON.stringify({ documents }, null, 2)}\n`,
  );

  const bytes = Object.values(documents).reduce((total, entry) => total + entry.sizeBytes, 0);
  console.log(`Exported ${seen.size} demo PDFs (${bytes} bytes) to ${OUTPUT_DIR}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
