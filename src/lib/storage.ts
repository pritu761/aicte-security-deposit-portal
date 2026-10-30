import { createCipheriv, createDecipheriv, createHash, randomBytes, randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { MAX_UPLOAD_BYTES } from "@/lib/validation";

/**
 * Encrypted local document vault.
 *
 * Files are validated, SHA-256 hashed and AES-256-GCM encrypted at rest. The
 * returned URL is the stable portal document URL. Replacing this module with
 * S3/Vercel Blob + KMS is the only change needed for managed object storage.
 */

const UPLOAD_DIR = path.join(process.cwd(), ".data", "uploads");
const MAGIC = Buffer.from("AICTE1");
const ALGORITHM = "aes-256-gcm";

function encryptionKey(): Buffer {
  const raw = process.env.DOCUMENT_ENCRYPTION_KEY;
  if (!raw) throw new Error("DOCUMENT_ENCRYPTION_KEY is not configured.");
  const key = Buffer.from(raw, "base64");
  if (key.length !== 32) {
    throw new Error("DOCUMENT_ENCRYPTION_KEY must be a base64 encoded 32-byte key.");
  }
  return key;
}

function sanitizeFileName(name: string): string {
  const base = path.basename(name || "document");
  return base.replace(/[^\w.\- ()]/g, "_").slice(0, 180) || "document";
}

function sanitizeStorageKey(key: string): string {
  if (!/^[0-9a-f-]{36}$/i.test(key)) throw new Error("Invalid storage key.");
  return key;
}

function sniff(buffer: Buffer): string | null {
  if (buffer.subarray(0, 5).toString("latin1") === "%PDF-") return "application/pdf";
  if (buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
    return "image/png";
  }
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return "image/jpeg";
  return null;
}

function encrypt(buffer: Buffer): Buffer {
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGORITHM, encryptionKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(buffer), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([MAGIC, iv, tag, ciphertext]);
}

function decrypt(payload: Buffer): Buffer {
  if (!payload.subarray(0, MAGIC.length).equals(MAGIC)) {
    throw new Error("Unrecognised document envelope.");
  }
  const iv = payload.subarray(MAGIC.length, MAGIC.length + 12);
  const tag = payload.subarray(MAGIC.length + 12, MAGIC.length + 28);
  const ciphertext = payload.subarray(MAGIC.length + 28);
  const decipher = createDecipheriv(ALGORITHM, encryptionKey(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
}

export type StoredObject = {
  storageKey: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  sha256: string;
  fileUrl: string;
};

export type UploadInput = {
  fileName: string;
  mimeType: string;
  buffer: Buffer;
};

export async function storeDocument(input: UploadInput): Promise<StoredObject> {
  if (!input.buffer.length) throw new Error("The uploaded document is empty.");
  if (input.buffer.length > MAX_UPLOAD_BYTES) throw new Error("Each document must be 10 MB or smaller.");
  const detected = sniff(input.buffer);
  const declared = input.mimeType === "image/jpg" ? "image/jpeg" : input.mimeType;
  if (!detected || detected !== declared) {
    throw new Error("The file contents do not match a valid PDF, PNG or JPEG document.");
  }

  const id = randomUUID();
  const storageKey = sanitizeStorageKey(id);
  const encrypted = encrypt(input.buffer);
  await mkdir(UPLOAD_DIR, { recursive: true });
  await writeFile(path.join(UPLOAD_DIR, `${storageKey}.bin`), encrypted, { mode: 0o600 });

  return {
    storageKey,
    fileName: sanitizeFileName(input.fileName),
    mimeType: detected,
    sizeBytes: input.buffer.length,
    sha256: createHash("sha256").update(input.buffer).digest("hex"),
    fileUrl: `/api/documents/${storageKey}`,
  };
}

export async function storeUploadedFile(file: File): Promise<StoredObject> {
  const buffer = Buffer.from(await file.arrayBuffer());
  return storeDocument({
    fileName: file.name,
    mimeType: file.type,
    buffer,
  });
}

export async function readStoredObject(storageKey: string): Promise<Buffer> {
  const safeKey = sanitizeStorageKey(storageKey);
  const encrypted = await readFile(path.join(UPLOAD_DIR, `${safeKey}.bin`));
  return decrypt(encrypted);
}

export async function storeSeedDocument(
  fileName: string,
  mimeType: string,
  buffer: Buffer,
): Promise<StoredObject> {
  return storeDocument({ fileName, mimeType, buffer });
}
