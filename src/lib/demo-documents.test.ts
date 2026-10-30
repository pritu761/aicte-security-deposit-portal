import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { readDemoDocument } from "@/lib/demo-documents";

type Manifest = {
  documents: Record<string, { docType: string; sizeBytes: number; sha256: string }>;
};

async function manifest(): Promise<Manifest> {
  const raw = await readFile(path.join(process.cwd(), "demo-documents", "manifest.json"), "utf8");
  return JSON.parse(raw) as Manifest;
}

describe("demo document fallback", () => {
  it("serves a seeded PDF with matching integrity metadata", async () => {
    const fileName = "FDR-2021-007_FDR_Certificate.pdf";
    const buffer = await readDemoDocument(fileName);

    if (!buffer) throw new Error(`Expected ${fileName} to resolve.`);
    const entry = (await manifest()).documents[fileName];

    expect(buffer.subarray(0, 5).toString("latin1")).toBe("%PDF-");
    expect(buffer.byteLength).toBe(entry.sizeBytes);
    expect(createHash("sha256").update(buffer).digest("hex")).toBe(entry.sha256);
  });

  it("resolves every manifest entry to a valid PDF", async () => {
    const entries = Object.keys((await manifest()).documents);
    expect(entries.length).toBeGreaterThan(0);

    for (const fileName of entries) {
      const buffer = await readDemoDocument(fileName);
      expect(buffer?.subarray(0, 5).toString("latin1"), fileName).toBe("%PDF-");
    }
  });

  it("does not resolve unknown or traversal names", async () => {
    expect(await readDemoDocument("../../.env.local")).toBeNull();
    expect(await readDemoDocument("FDR-9999-999_FDR_Certificate.pdf")).toBeNull();
  });

  it("rejects a document whose database fingerprint does not match", async () => {
    expect(
      await readDemoDocument("FDR-2021-007_FDR_Certificate.pdf", "0".repeat(64)),
    ).toBeNull();
  });
});
