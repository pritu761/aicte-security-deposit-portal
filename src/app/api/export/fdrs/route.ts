import { NextResponse } from "next/server";

import { logAuditOutsideTransaction } from "@/lib/audit";
import { FDR_STATUS_LABELS, VERIFICATION_LABELS } from "@/lib/constants";
import { getRepositoryExportRows } from "@/lib/queries";
import { getCurrentUser } from "@/lib/session";
import { getEffectiveFdrStatus, toCsv, todayISO } from "@/lib/utils";
import { repositoryFilterSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

function safeCell(value: unknown): string {
  const text = value === null || value === undefined ? "" : String(value);
  // Mitigate spreadsheet formula injection in exports.
  return /^[=+\-@\t\r]/.test(text) ? `'${text}` : text;
}

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const url = new URL(request.url);
  const parsed = repositoryFilterSchema.safeParse({
    q: url.searchParams.get("q") ?? "",
    status: url.searchParams.get("status") ?? "",
    verification: url.searchParams.get("verification") ?? "",
    state: url.searchParams.get("state") ?? "",
    region: url.searchParams.get("region") ?? "",
    page: "1",
  });
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid export filters." }, { status: 400 });
  }
  const filters = parsed.data;
  const format = (url.searchParams.get("format") ?? "csv").toLowerCase();
  if (format !== "csv" && format !== "json") {
    return NextResponse.json({ error: "Unsupported export format." }, { status: 400 });
  }

  const rows = await getRepositoryExportRows(user, filters);
  const generatedAt = new Date().toISOString();
  const today = todayISO();

  const prepared = rows.map((fdr) => {
    const status = fdr.hasSuccessor
      ? "Renewed"
      : FDR_STATUS_LABELS[getEffectiveFdrStatus(fdr)];
    return {
      fdrNumber: fdr.fdrNumber,
      institution: fdr.institutionName,
      aicteId: fdr.institutionAicteId,
      state: fdr.institutionState,
      region: fdr.institutionRegion,
      institutionType: fdr.institutionType,
      issuingBank: fdr.issuingBank,
      branch: fdr.branchName ?? "",
      ifsc: fdr.ifscCode,
      depositAmount: Number(fdr.depositAmount).toFixed(2),
      issueDate: fdr.issueDate,
      maturityDate: fdr.maturityDate,
      jointAccountHolder: fdr.jointAccountHolder,
      status,
      verification: VERIFICATION_LABELS[fdr.verificationStatus],
      bankConfirmationRef: fdr.bankConfirmationRef ?? "",
      scrutinyRemarks: fdr.scrutinyRemarks ?? "",
    };
  });

  let body: string;
  let contentType: string;
  let fileName: string;

  if (format === "json") {
    body = JSON.stringify(
      {
        meta: {
          title: "AICTE Security Deposit & FDR Register",
          generatedAt,
          generatedBy: user.name,
          generatedByRole: user.role,
          scope:
            user.role === "INSTITUTION_ADMIN"
              ? user.institutionName ?? "Institution"
              : "Bureau-wide",
          recordCount: prepared.length,
          filters,
          disclaimer:
            "Generated from the live AICTE Suraksha register. Verify instrument particulars against the source documents before external use.",
        },
        records: prepared,
      },
      null,
      2,
    );
    contentType = "application/json; charset=utf-8";
    fileName = `aicte-fdr-register-${today}.json`;
  } else {
    const csvRows = prepared.map((row) => ({
      ...Object.fromEntries(Object.entries(row).map(([key, value]) => [key, safeCell(value)])),
    }));
    body = `\uFEFF${toCsv(csvRows, [
      { key: "fdrNumber", header: "FDR Number" },
      { key: "institution", header: "Institution" },
      { key: "aicteId", header: "AICTE ID" },
      { key: "state", header: "State" },
      { key: "region", header: "Region" },
      { key: "institutionType", header: "Institution Type" },
      { key: "issuingBank", header: "Issuing Bank" },
      { key: "branch", header: "Branch" },
      { key: "ifsc", header: "IFSC" },
      { key: "depositAmount", header: "Deposit Amount (INR)" },
      { key: "issueDate", header: "Issue Date" },
      { key: "maturityDate", header: "Maturity Date" },
      { key: "jointAccountHolder", header: "Joint Account Holder" },
      { key: "status", header: "Status" },
      { key: "verification", header: "Verification" },
      { key: "bankConfirmationRef", header: "Bank Confirmation Ref" },
      { key: "scrutinyRemarks", header: "Scrutiny Remarks" },
    ])}`;
    contentType = "text/csv; charset=utf-8";
    fileName = `aicte-fdr-register-${today}.csv`;
  }

  await logAuditOutsideTransaction({
    entityType: "report",
    entityId: user.id,
    userId: user.id,
    action: "REPORT_EXPORTED",
    details: {
      format,
      filters,
      rowCount: prepared.length,
      scope: user.role,
    },
  });

  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": contentType,
      "Content-Disposition": `attachment; filename="${fileName}"`,
      "Cache-Control": "no-store, max-age=0",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
