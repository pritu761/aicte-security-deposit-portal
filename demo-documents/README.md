# Demo evidence documents

These PDFs are a tracked fallback for the seeded register. The encrypted vault
is written to `.data/uploads`, which is excluded from Git, so a fresh clone or
deployment would otherwise have document rows but no retrievable blobs.

`manifest.json` is the allow-list used by `src/lib/demo-documents.ts`. A file is
served only when its exact `fdr_documents.file_name` appears in the manifest and
its size and SHA-256 still match. Previews continue to go through the
authenticated `/api/documents/[id]` route; these files are never exposed as
static assets.

Regenerate after changing the seed or re-seeding a database:

```bash
npm run db:export-demo
```

The command reads the current `.data/uploads` vault and rewrites this folder.
Do not edit the PDFs or manifest by hand.
