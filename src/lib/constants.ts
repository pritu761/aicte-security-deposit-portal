import type { FdrStatus, ReleaseStatus, UserRole, VerificationStatus, DocumentType } from "@/db/schema";

export const APP_NAME = "FDR Setu";
export const APP_SUBTITLE = "Security Deposit & FDR Management Portal";
export const ORGANISATION = "All India Council for Technical Education";
export const REGULATION_BUREAU = "Regulation Bureau, Ministry of Education, Government of India";

export const PRIMARY_INSTITUTION_ID = "b2f5d4b8-3c4a-4f0e-9a6d-3d1f5e7a8c91";

export const ROLE_LABELS: Record<UserRole, string> = {
  INSTITUTION_ADMIN: "Institution Administrator",
  AICTE_SCRUTINY_OFFICER: "AICTE Scrutiny Officer",
  REGULATION_BUREAU_HEAD: "Regulation Bureau Head",
};

export const ROLE_SHORT_LABELS: Record<UserRole, string> = {
  INSTITUTION_ADMIN: "Institution",
  AICTE_SCRUTINY_OFFICER: "Scrutiny",
  REGULATION_BUREAU_HEAD: "Bureau Head",
};

export const ROLE_DESCRIPTIONS: Record<UserRole, string> = {
  INSTITUTION_ADMIN:
    "Submit FDRs and documents, track validity, and raise renewal or release requests for your institution.",
  AICTE_SCRUTINY_OFFICER:
    "Scrutinise submissions, confirm bank verification, flag discrepancies, and recommend release cases.",
  REGULATION_BUREAU_HEAD:
    "Approve releases and refunds, monitor the bureau-wide portfolio, and review the immutable audit trail.",
};

export const FDR_STATUS_LABELS: Record<FdrStatus, string> = {
  ACTIVE: "Active",
  EXPIRING_SOON: "Expiring soon",
  MATURED: "Matured",
  RENEWAL_PENDING: "Renewal pending",
  RELEASE_REQUESTED: "Release requested",
  RELEASED: "Released",
  DISCREPANCY_FLAGGED: "Discrepancy flagged",
};

export const FDR_STATUS_DESCRIPTIONS: Record<FdrStatus, string> = {
  ACTIVE: "Instrument is valid and no immediate action is due.",
  EXPIRING_SOON: "Maturity falls within the 90-day monitoring window.",
  MATURED: "Maturity date has passed without renewal or release.",
  RENEWAL_PENDING: "A renewal or replacement instrument is being processed.",
  RELEASE_REQUESTED: "A release or refund request is under the approval workflow.",
  RELEASED: "Instrument has been released after competent-authority approval.",
  DISCREPANCY_FLAGGED: "A scrutiny discrepancy requires resolution.",
};

export const FDR_STATUS_STYLES: Record<FdrStatus, { badge: string; dot: string; chart: string }> = {
  ACTIVE: {
    badge: "border-emerald-200 bg-emerald-50 text-emerald-800",
    dot: "bg-emerald-500",
    chart: "#0f766e",
  },
  EXPIRING_SOON: {
    badge: "border-amber-200 bg-amber-50 text-amber-900",
    dot: "bg-amber-500",
    chart: "#d97706",
  },
  MATURED: {
    badge: "border-rose-200 bg-rose-50 text-rose-800",
    dot: "bg-rose-500",
    chart: "#e11d48",
  },
  RENEWAL_PENDING: {
    badge: "border-sky-200 bg-sky-50 text-sky-800",
    dot: "bg-sky-500",
    chart: "#0284c7",
  },
  RELEASE_REQUESTED: {
    badge: "border-violet-200 bg-violet-50 text-violet-800",
    dot: "bg-violet-500",
    chart: "#7c3aed",
  },
  RELEASED: {
    badge: "border-slate-200 bg-slate-100 text-slate-700",
    dot: "bg-slate-400",
    chart: "#64748b",
  },
  DISCREPANCY_FLAGGED: {
    badge: "border-red-200 bg-red-50 text-red-800",
    dot: "bg-red-500",
    chart: "#dc2626",
  },
};

export const VERIFICATION_LABELS: Record<VerificationStatus, string> = {
  INSTITUTION_SUBMITTED: "Submitted by institution",
  BANK_CONFIRMED: "Bank-confirmed",
  DISCREPANCY_FOUND: "Discrepancy found",
};

export const VERIFICATION_STYLES: Record<
  VerificationStatus,
  { badge: string; icon: "building" | "bank" | "alert" }
> = {
  INSTITUTION_SUBMITTED: {
    badge: "border-slate-200 bg-white text-slate-600",
    icon: "building",
  },
  BANK_CONFIRMED: {
    badge: "border-emerald-200 bg-emerald-50 text-emerald-800",
    icon: "bank",
  },
  DISCREPANCY_FOUND: {
    badge: "border-red-200 bg-red-50 text-red-800",
    icon: "alert",
  },
};

export const RELEASE_STATUS_LABELS: Record<ReleaseStatus, string> = {
  PENDING_SCRUTINY: "Pending scrutiny",
  RECOMMENDED_BY_OFFICER: "Recommended by officer",
  REJECTED: "Rejected",
  APPROVED_RELEASED: "Approved & released",
};

export const RELEASE_STATUS_STYLES: Record<ReleaseStatus, string> = {
  PENDING_SCRUTINY: "border-amber-200 bg-amber-50 text-amber-900",
  RECOMMENDED_BY_OFFICER: "border-sky-200 bg-sky-50 text-sky-800",
  REJECTED: "border-rose-200 bg-rose-50 text-rose-800",
  APPROVED_RELEASED: "border-emerald-200 bg-emerald-50 text-emerald-800",
};

export const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
  ORIGINAL_FDR_SCAN: "Original FDR scan",
  BANK_CONFIRMATION_LETTER: "Bank confirmation letter",
  DISCHARGE_VOUCHER: "Discharge voucher",
};

export const DOCUMENT_TYPE_SHORT: Record<DocumentType, string> = {
  ORIGINAL_FDR_SCAN: "FDR scan",
  BANK_CONFIRMATION_LETTER: "Bank letter",
  DISCHARGE_VOUCHER: "Discharge voucher",
};

export const RELEASE_STEPS = [
  { key: "submitted", label: "Eligibility check", description: "Institution raises a release request" },
  { key: "scrutiny", label: "Scrutiny recommendation", description: "Officer verifies documents and eligibility" },
  { key: "approval", label: "Bureau Head approval", description: "Competent authority authorises release" },
  { key: "receipt", label: "Authorization receipt", description: "Dispatch reference recorded" },
] as const;

export const INSTITUTION_TYPES = [
  "Engineering & Technology",
  "Management",
  "Pharmacy",
  "Architecture",
  "Hotel Management & Catering",
  "Applied Arts & Design",
] as const;

export const REGIONS = ["North", "South", "East", "West", "Central", "North East"] as const;

export const INDIAN_STATES = [
  "Andhra Pradesh",
  "Assam",
  "Bihar",
  "Chhattisgarh",
  "Delhi",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Madhya Pradesh",
  "Maharashtra",
  "Manipur",
  "Meghalaya",
  "Odisha",
  "Punjab",
  "Rajasthan",
  "Tamil Nadu",
  "Telangana",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal",
] as const;

export const BANKS = [
  "State Bank of India",
  "Punjab National Bank",
  "Canara Bank",
  "Bank of Baroda",
  "Union Bank of India",
  "Indian Bank",
  "HDFC Bank",
  "ICICI Bank",
  "Axis Bank",
  "Kotak Mahindra Bank",
] as const;

export const DOCUMENT_ACCEPT = ".pdf,.png,.jpg,.jpeg";
export const MAX_DOCUMENT_MB = 10;
export const EXPIRING_WINDOW_DAYS = 30;

export const AUDIT_ACTION_LABELS: Record<string, string> = {
  SUBMITTED: "FDR submitted",
  RENEWAL_SUBMITTED: "Renewal submitted",
  VERIFIED_BANK_CONFIRMED: "Verified as bank-confirmed",
  DISCREPANCY_FLAGGED: "Discrepancy flagged",
  SCRUTINY_REMARK_UPDATED: "Scrutiny remark updated",
  RELEASE_REQUESTED: "Release requested",
  RELEASE_RECOMMENDED: "Release recommended",
  RELEASE_APPROVED: "Release approved",
  RELEASE_REJECTED: "Release rejected",
  STATUS_REFRESHED: "Status refreshed",
  SESSION_STARTED: "Signed in to the portal",
  SESSION_ENDED: "Signed out of the portal",
  DOCUMENT_UPLOADED: "Document uploaded",
  REPORT_EXPORTED: "Report exported",
};
