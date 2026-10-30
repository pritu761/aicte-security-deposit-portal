/**
 * Rich, deterministic demo seed for the AICTE Security Deposit & FDR portal.
 *
 * Run: npm run db:setup   (schema first, on a fresh database)
 *      npm run db:seed
 *
 * All institutions, officers and financial instruments are illustrative demo
 * records dated relative to the day the seed is executed.
 */
import { mkdir, rm } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { sql } from "drizzle-orm";

import { db, closeDatabase } from "@/db";
import {
  auditLogs,
  fdrDocuments,
  fdrInstruments,
  institutions,
  releaseRequests,
  users,
  type AuditDetails,
  type FdrStatus,
  type ReleaseStatus,
  type UserRole,
  type VerificationStatus,
} from "@/db/schema";
import { dispatchReference } from "@/lib/fdr-status";
import { uploadToMockCloudStorage } from "@/lib/storage";
import { createBankConfirmationPdf, createDischargeVoucherPdf, createFdrCertificatePdf, type FdrPdfData } from "@/db/seed-documents";
import { DEMO_INSTITUTION_ID } from "@/lib/constants";

const UPLOAD_DIR = path.join(process.cwd(), ".data", "uploads");
const now = new Date();

function daysAgo(days: number, hour = 10, minute = 30): Date {
  const date = new Date(now.getTime() - days * 86_400_000);
  date.setUTCHours(hour - 5, minute - 30, 0, 0);
  return date;
}

function dateOffset(days: number): string {
  return new Date(now.getTime() + days * 86_400_000).toISOString().slice(0, 10);
}

function institutionId(index: number): string {
  if (index === 0) return DEMO_INSTITUTION_ID;
  // Keep every UUID group at its exact RFC length (12 hex chars in the last group).
  return `b2f5d4b8-3c4a-4f0e-9a6d-3d1f5e7a8d${String(index).padStart(2, "0")}`;
}

/* -------------------------------------------------------------------------- */
/* Institutions                                                               */
/* -------------------------------------------------------------------------- */

type InstitutionSeed = {
  id: string;
  aicteId: string;
  name: string;
  region: string;
  state: string;
  institutionType: string;
};

const institutionSeeds: InstitutionSeed[] = [
  {
    id: DEMO_INSTITUTION_ID,
    aicteId: "1-3324918231",
    name: "National Institute of Engineering & Technology",
    region: "South",
    state: "Karnataka",
    institutionType: "Engineering & Technology",
  },
  {
    id: institutionId(1),
    aicteId: "1-2840193722",
    name: "Sardar Vallabhbhai Patel Institute of Technology",
    region: "West",
    state: "Gujarat",
    institutionType: "Engineering & Technology",
  },
  {
    id: institutionId(2),
    aicteId: "1-4472018365",
    name: "Dr. D. Y. Patil Institute of Management & Research",
    region: "West",
    state: "Maharashtra",
    institutionType: "Management",
  },
  {
    id: institutionId(3),
    aicteId: "1-3918274650",
    name: "B. M. College of Pharmacy",
    region: "South",
    state: "Karnataka",
    institutionType: "Pharmacy",
  },
  {
    id: institutionId(4),
    aicteId: "1-5182937461",
    name: "Kalinga Institute of Architecture & Planning",
    region: "East",
    state: "Odisha",
    institutionType: "Architecture",
  },
  {
    id: institutionId(5),
    aicteId: "1-2093847562",
    name: "Rajasthan Technical Campus",
    region: "North",
    state: "Rajasthan",
    institutionType: "Engineering & Technology",
  },
  {
    id: institutionId(6),
    aicteId: "1-6352819473",
    name: "Tamil Nadu College of Engineering & Technology",
    region: "South",
    state: "Tamil Nadu",
    institutionType: "Engineering & Technology",
  },
  {
    id: institutionId(7),
    aicteId: "1-5728394018",
    name: "North East Institute of Technology",
    region: "North East",
    state: "Assam",
    institutionType: "Engineering & Technology",
  },
  {
    id: institutionId(8),
    aicteId: "1-3182947564",
    name: "Chhattisgarh Institute of Management",
    region: "Central",
    state: "Chhattisgarh",
    institutionType: "Management",
  },
  {
    id: institutionId(9),
    aicteId: "1-7462910385",
    name: "Doon Valley Institute of Technology",
    region: "North",
    state: "Uttarakhand",
    institutionType: "Engineering & Technology",
  },
  {
    id: institutionId(10),
    aicteId: "1-8293017466",
    name: "Malabar College of Engineering",
    region: "South",
    state: "Kerala",
    institutionType: "Engineering & Technology",
  },
  {
    id: institutionId(11),
    aicteId: "1-9301827467",
    name: "Delhi School of Applied Arts & Design",
    region: "North",
    state: "Delhi",
    institutionType: "Applied Arts & Design",
  },
];

/* -------------------------------------------------------------------------- */
/* Users                                                                      */
/* -------------------------------------------------------------------------- */

type UserSeed = {
  id: string;
  institutionId: string | null;
  name: string;
  email: string;
  role: UserRole;
  designation: string;
  phone: string;
};

const headUser: UserSeed = {
  id: randomUUID(),
  institutionId: null,
  name: "Dr. Rajeshwar S. Chauhan",
  email: "head@aicte.gov.in",
  role: "REGULATION_BUREAU_HEAD",
  designation: "Director, Regulation Bureau",
  phone: "+91 11 2613 1500",
};

const scrutinyOfficer: UserSeed = {
  id: randomUUID(),
  institutionId: null,
  name: "Arjun Mehta",
  email: "scrutiny@aicte.gov.in",
  role: "AICTE_SCRUTINY_OFFICER",
  designation: "Senior Scrutiny Officer",
  phone: "+91 11 2613 1512",
};

const secondScrutinyOfficer: UserSeed = {
  id: randomUUID(),
  institutionId: null,
  name: "Meera Iyer",
  email: "meera.iyer@aicte.gov.in",
  role: "AICTE_SCRUTINY_OFFICER",
  designation: "Scrutiny Officer",
  phone: "+91 11 2613 1518",
};

const adminNames = [
  ["Dr. Kavya Menon", "admin@niet.ac.in"],
  ["Prof. Harshad Desai", "admin@svit.ac.in"],
  ["Dr. Neha Kulkarni", "admin@dypims.ac.in"],
  ["Dr. Farhan Qureshi", "admin@bmcp.ac.in"],
  ["Prof. Ipsita Mohanty", "admin@kiap.ac.in"],
  ["Dr. Vikram Singh Rathore", "admin@rtc.ac.in"],
  ["Dr. Lakshmi Narayanan", "admin@tncet.ac.in"],
  ["Prof. Bikash Sharma", "admin@neit.ac.in"],
  ["Dr. Shalini Verma", "admin@cim.ac.in"],
  ["Prof. Ankit Rawat", "admin@dvit.ac.in"],
  ["Dr. Fathima Rahman", "admin@mce.ac.in"],
  ["Prof. Aditi Kapoor", "admin@dsad.ac.in"],
] as const;

const institutionAdmins: UserSeed[] = adminNames.map(([name, email], index) => ({
  id: randomUUID(),
  institutionId: institutionId(index),
  name,
  email,
  role: "INSTITUTION_ADMIN",
  designation: index === 0 ? "Registrar & Authorised Signatory" : "Registrar",
  phone: `+91 98${String(45000000 + index * 731).slice(0, 8)}`,
}));

const userSeeds: UserSeed[] = [headUser, scrutinyOfficer, secondScrutinyOfficer, ...institutionAdmins];

/* -------------------------------------------------------------------------- */
/* FDR instruments                                                            */
/* -------------------------------------------------------------------------- */

type FdrSeed = {
  key: string;
  institution: number;
  fdrNumber: string;
  bank: string;
  branch: string;
  ifsc: string;
  amount: number;
  issueOffset: number;
  maturityOffset: number;
  status: FdrStatus;
  verification: VerificationStatus;
  parentKey?: string;
  remarks?: string;
  interestRate?: number;
  verifiedOffset?: number;
};

const fdrSeeds: FdrSeed[] = [
  // 0 — National Institute of Engineering & Technology (demo institution)
  { key: "niet-sbi-active", institution: 0, fdrNumber: "FDR-2024-118", bank: "State Bank of India", branch: "Bengaluru Main", ifsc: "SBIN0001234", amount: 7_500_000, issueOffset: -260, maturityOffset: 420, status: "ACTIVE", verification: "BANK_CONFIRMED", verifiedOffset: 254 },
  { key: "niet-canara-expiring", institution: 0, fdrNumber: "FDR-2025-067", bank: "Canara Bank", branch: "MG Road", ifsc: "CNRB0002345", amount: 5_000_000, issueOffset: -240, maturityOffset: 18, status: "EXPIRING_SOON", verification: "BANK_CONFIRMED", verifiedOffset: 232 },
  { key: "niet-hdfc-released", institution: 0, fdrNumber: "FDR-2023-042", bank: "HDFC Bank", branch: "Koramangala", ifsc: "HDFC0000456", amount: 2_500_000, issueOffset: -700, maturityOffset: -60, status: "RELEASED", verification: "BANK_CONFIRMED", verifiedOffset: 690 },
  { key: "niet-sbi-old", institution: 0, fdrNumber: "FDR-2021-041", bank: "State Bank of India", branch: "Bengaluru Main", ifsc: "SBIN0001234", amount: 4_000_000, issueOffset: -1600, maturityOffset: -200, status: "MATURED", verification: "BANK_CONFIRMED", verifiedOffset: 1580, remarks: "Renewed through FDR-2024-119; successor instrument verified by the scrutiny desk." },
  { key: "niet-sbi-renewed", institution: 0, fdrNumber: "FDR-2024-119", bank: "State Bank of India", branch: "Bengaluru Main", ifsc: "SBIN0001234", amount: 4_000_000, issueOffset: -190, maturityOffset: 310, status: "ACTIVE", verification: "BANK_CONFIRMED", parentKey: "niet-sbi-old", verifiedOffset: 182 },
  { key: "niet-pnb-matured", institution: 0, fdrNumber: "FDR-2025-094", bank: "Punjab National Bank", branch: "Jayanagar", ifsc: "PUNB0003456", amount: 3_000_000, issueOffset: -260, maturityOffset: -25, status: "MATURED", verification: "BANK_CONFIRMED", verifiedOffset: 252 },
  { key: "niet-icici-disc", institution: 0, fdrNumber: "FDR-2025-102", bank: "ICICI Bank", branch: "Whitefield", ifsc: "ICIC0000567", amount: 4_000_000, issueOffset: -250, maturityOffset: 240, status: "DISCREPANCY_FLAGGED", verification: "DISCREPANCY_FOUND", remarks: "The deposit amount on the bank confirmation letter (Rs. 35,00,000) does not match the submitted FDR value of Rs. 40,00,000. Fresh bank confirmation required." },
  { key: "niet-union-release", institution: 0, fdrNumber: "FDR-2025-088", bank: "Union Bank of India", branch: "Malleshwaram", ifsc: "UBIN0006789", amount: 2_000_000, issueOffset: -240, maturityOffset: 55, status: "RELEASE_REQUESTED", verification: "BANK_CONFIRMED", verifiedOffset: 230 },

  // 1 — Sardar Vallabhbhai Patel Institute of Technology
  { key: "svit-sbi-expiring", institution: 1, fdrNumber: "FDR-2023-210", bank: "State Bank of India", branch: "Navrangpura", ifsc: "SBIN0002345", amount: 10_000_000, issueOffset: -600, maturityOffset: 12, status: "RELEASE_REQUESTED", verification: "BANK_CONFIRMED", verifiedOffset: 590 },
  { key: "svit-hdfc-submitted", institution: 1, fdrNumber: "FDR-2024-311", bank: "HDFC Bank", branch: "SG Highway", ifsc: "HDFC0000789", amount: 6_000_000, issueOffset: -450, maturityOffset: 180, status: "ACTIVE", verification: "INSTITUTION_SUBMITTED" },
  { key: "svit-bob-old", institution: 1, fdrNumber: "FDR-2022-155", bank: "Bank of Baroda", branch: "Alkapuri", ifsc: "BARB0ALKAPU", amount: 3_500_000, issueOffset: -1300, maturityOffset: -350, status: "RENEWAL_PENDING", verification: "BANK_CONFIRMED", verifiedOffset: 1280 },
  { key: "svit-bob-new", institution: 1, fdrNumber: "FDR-2025-010", bank: "Bank of Baroda", branch: "Alkapuri", ifsc: "BARB0ALKAPU", amount: 3_500_000, issueOffset: -150, maturityOffset: 550, status: "ACTIVE", verification: "INSTITUTION_SUBMITTED", parentKey: "svit-bob-old" },
  { key: "svit-sbi-matured", institution: 1, fdrNumber: "FDR-2021-007", bank: "State Bank of India", branch: "Navrangpura", ifsc: "SBIN0002345", amount: 2_500_000, issueOffset: -1800, maturityOffset: -400, status: "MATURED", verification: "BANK_CONFIRMED", verifiedOffset: 1780 },

  // 2 — Dr. D. Y. Patil Institute of Management & Research
  { key: "dypims-icici-expiring", institution: 2, fdrNumber: "FDR-2024-401", bank: "ICICI Bank", branch: "Shivajinagar", ifsc: "ICIC0000789", amount: 5_000_000, issueOffset: -500, maturityOffset: 60, status: "EXPIRING_SOON", verification: "BANK_CONFIRMED", verifiedOffset: 490 },
  { key: "dypims-axis-released", institution: 2, fdrNumber: "FDR-2023-298", bank: "Axis Bank", branch: "Kothrud", ifsc: "UTIB0000789", amount: 2_000_000, issueOffset: -900, maturityOffset: -120, status: "RELEASED", verification: "BANK_CONFIRMED", verifiedOffset: 880 },
  { key: "dypims-sbi-submitted", institution: 2, fdrNumber: "FDR-2025-145", bank: "State Bank of India", branch: "Deccan", ifsc: "SBIN0003456", amount: 3_000_000, issueOffset: -120, maturityOffset: 70, status: "EXPIRING_SOON", verification: "INSTITUTION_SUBMITTED" },
  { key: "dypims-canara-disc", institution: 2, fdrNumber: "FDR-2024-450", bank: "Canara Bank", branch: "Baner", ifsc: "CNRB0003456", amount: 1_500_000, issueOffset: -350, maturityOffset: 25, status: "DISCREPANCY_FLAGGED", verification: "DISCREPANCY_FOUND", remarks: "IFSC printed on the FDR certificate does not match the branch code recorded in the portal. Institution asked to upload a corrected bank confirmation." },

  // 3 — B. M. College of Pharmacy
  { key: "bmcp-canara-active", institution: 3, fdrNumber: "FDR-2024-512", bank: "Canara Bank", branch: "Jayanagar", ifsc: "CNRB0004567", amount: 2_500_000, issueOffset: -400, maturityOffset: 100, status: "ACTIVE", verification: "BANK_CONFIRMED", verifiedOffset: 390 },
  { key: "bmcp-sbi-submitted", institution: 3, fdrNumber: "FDR-2025-160", bank: "State Bank of India", branch: "Yelahanka", ifsc: "SBIN0004567", amount: 1_200_000, issueOffset: -90, maturityOffset: 160, status: "ACTIVE", verification: "INSTITUTION_SUBMITTED" },
  { key: "bmcp-axis-matured", institution: 3, fdrNumber: "FDR-2023-333", bank: "Axis Bank", branch: "Indiranagar", ifsc: "UTIB0000890", amount: 1_000_000, issueOffset: -1000, maturityOffset: -180, status: "MATURED", verification: "BANK_CONFIRMED", verifiedOffset: 980 },

  // 4 — Kalinga Institute of Architecture & Planning
  { key: "kiap-bob-expiring", institution: 4, fdrNumber: "FDR-2024-602", bank: "Bank of Baroda", branch: "Patia", ifsc: "BARB0PATIA0", amount: 3_000_000, issueOffset: -420, maturityOffset: 45, status: "EXPIRING_SOON", verification: "BANK_CONFIRMED", verifiedOffset: 410 },
  { key: "kiap-sbi-active", institution: 4, fdrNumber: "FDR-2025-171", bank: "State Bank of India", branch: "Chandrasekharpur", ifsc: "SBIN0005678", amount: 2_000_000, issueOffset: -100, maturityOffset: 500, status: "ACTIVE", verification: "INSTITUTION_SUBMITTED" },
  { key: "kiap-union-old", institution: 4, fdrNumber: "FDR-2022-099", bank: "Union Bank of India", branch: "Cuttack Road", ifsc: "UBIN0007890", amount: 1_500_000, issueOffset: -1500, maturityOffset: -500, status: "MATURED", verification: "BANK_CONFIRMED", verifiedOffset: 1480 },
  { key: "kiap-union-new", institution: 4, fdrNumber: "FDR-2025-111", bank: "Union Bank of India", branch: "Cuttack Road", ifsc: "UBIN0007890", amount: 1_500_000, issueOffset: -130, maturityOffset: 260, status: "ACTIVE", verification: "BANK_CONFIRMED", parentKey: "kiap-union-old", verifiedOffset: 120 },

  // 5 — Rajasthan Technical Campus
  { key: "rtc-pnb-expiring", institution: 5, fdrNumber: "FDR-2024-701", bank: "Punjab National Bank", branch: "MI Road", ifsc: "PUNB0004567", amount: 4_000_000, issueOffset: -380, maturityOffset: 85, status: "EXPIRING_SOON", verification: "BANK_CONFIRMED", verifiedOffset: 370 },
  { key: "rtc-sbi-active", institution: 5, fdrNumber: "FDR-2025-204", bank: "State Bank of India", branch: "Malviya Nagar", ifsc: "SBIN0006789", amount: 2_500_000, issueOffset: -80, maturityOffset: 330, status: "ACTIVE", verification: "BANK_CONFIRMED", verifiedOffset: 75 },
  { key: "rtc-hdfc-released", institution: 5, fdrNumber: "FDR-2023-555", bank: "HDFC Bank", branch: "Vaishali Nagar", ifsc: "HDFC0000890", amount: 2_000_000, issueOffset: -1100, maturityOffset: -300, status: "RELEASED", verification: "BANK_CONFIRMED", verifiedOffset: 1080 },

  // 6 — Tamil Nadu College of Engineering & Technology
  { key: "tncet-indian-expiring", institution: 6, fdrNumber: "FDR-2024-801", bank: "Indian Bank", branch: "RS Puram", ifsc: "IDIB0001234", amount: 6_000_000, issueOffset: -350, maturityOffset: 20, status: "EXPIRING_SOON", verification: "BANK_CONFIRMED", verifiedOffset: 340 },
  { key: "tncet-sbi-active", institution: 6, fdrNumber: "FDR-2025-220", bank: "State Bank of India", branch: "Peelamedu", ifsc: "SBIN0007890", amount: 3_000_000, issueOffset: -60, maturityOffset: 700, status: "ACTIVE", verification: "INSTITUTION_SUBMITTED" },
  { key: "tncet-canara-matured", institution: 6, fdrNumber: "FDR-2022-333", bank: "Canara Bank", branch: "Gandhipuram", ifsc: "CNRB0005678", amount: 2_000_000, issueOffset: -1400, maturityOffset: -400, status: "MATURED", verification: "BANK_CONFIRMED", verifiedOffset: 1380 },

  // 7 — North East Institute of Technology
  { key: "neit-sbi-active", institution: 7, fdrNumber: "FDR-2024-901", bank: "State Bank of India", branch: "GS Road", ifsc: "SBIN0008901", amount: 3_500_000, issueOffset: -300, maturityOffset: 120, status: "ACTIVE", verification: "BANK_CONFIRMED", verifiedOffset: 290 },
  { key: "neit-pnb-submitted", institution: 7, fdrNumber: "FDR-2025-250", bank: "Punjab National Bank", branch: "Zoo Road", ifsc: "PUNB0005678", amount: 1_800_000, issueOffset: -50, maturityOffset: 610, status: "ACTIVE", verification: "INSTITUTION_SUBMITTED" },
  { key: "neit-bob-matured", institution: 7, fdrNumber: "FDR-2023-044", bank: "Bank of Baroda", branch: "Fancy Bazar", ifsc: "BARB0FANCY1", amount: 2_500_000, issueOffset: -1000, maturityOffset: -110, status: "MATURED", verification: "BANK_CONFIRMED", verifiedOffset: 980 },

  // 8 — Chhattisgarh Institute of Management
  { key: "cim-icici-expiring", institution: 8, fdrNumber: "FDR-2024-1001", bank: "ICICI Bank", branch: "Raipur Main", ifsc: "ICIC0001901", amount: 2_500_000, issueOffset: -320, maturityOffset: 70, status: "EXPIRING_SOON", verification: "BANK_CONFIRMED", verifiedOffset: 310 },
  { key: "cim-sbi-active", institution: 8, fdrNumber: "FDR-2025-301", bank: "State Bank of India", branch: "Pandri", ifsc: "SBIN0009012", amount: 1_500_000, issueOffset: -45, maturityOffset: 540, status: "ACTIVE", verification: "INSTITUTION_SUBMITTED" },
  { key: "cim-axis-released", institution: 8, fdrNumber: "FDR-2023-777", bank: "Axis Bank", branch: "Shankar Nagar", ifsc: "UTIB0001901", amount: 1_000_000, issueOffset: -900, maturityOffset: -220, status: "RELEASED", verification: "BANK_CONFIRMED", verifiedOffset: 880 },

  // 9 — Doon Valley Institute of Technology
  { key: "dvit-sbi-expiring", institution: 9, fdrNumber: "FDR-2024-1101", bank: "State Bank of India", branch: "Rajpur Road", ifsc: "SBIN0010123", amount: 2_000_000, issueOffset: -280, maturityOffset: 35, status: "EXPIRING_SOON", verification: "BANK_CONFIRMED", verifiedOffset: 270 },
  { key: "dvit-hdfc-active", institution: 9, fdrNumber: "FDR-2025-330", bank: "HDFC Bank", branch: "Haridwar Road", ifsc: "HDFC0001901", amount: 1_500_000, issueOffset: -30, maturityOffset: 800, status: "ACTIVE", verification: "INSTITUTION_SUBMITTED" },
  { key: "dvit-pnb-disc", institution: 9, fdrNumber: "FDR-2023-888", bank: "Punjab National Bank", branch: "Clock Tower", ifsc: "PUNB0006789", amount: 1_000_000, issueOffset: -800, maturityOffset: -120, status: "DISCREPANCY_FLAGGED", verification: "DISCREPANCY_FOUND", remarks: "Maturity date on the uploaded FDR scan is not legible. Requested a fresh bank-issued certificate." },

  // 10 — Malabar College of Engineering
  { key: "mce-canara-active", institution: 10, fdrNumber: "FDR-2024-1201", bank: "Canara Bank", branch: "Mavoor Road", ifsc: "CNRB0006789", amount: 4_500_000, issueOffset: -360, maturityOffset: 150, status: "ACTIVE", verification: "BANK_CONFIRMED", verifiedOffset: 350 },
  { key: "mce-sbi-active", institution: 10, fdrNumber: "FDR-2025-360", bank: "State Bank of India", branch: "Kozhikode Main", ifsc: "SBIN0011234", amount: 2_000_000, issueOffset: -25, maturityOffset: 900, status: "ACTIVE", verification: "INSTITUTION_SUBMITTED" },

  // 11 — Delhi School of Applied Arts & Design
  { key: "dsad-hdfc-expiring", institution: 11, fdrNumber: "FDR-2024-1301", bank: "HDFC Bank", branch: "Connaught Place", ifsc: "HDFC0002345", amount: 1_500_000, issueOffset: -300, maturityOffset: 40, status: "EXPIRING_SOON", verification: "BANK_CONFIRMED", verifiedOffset: 290 },
  { key: "dsad-axis-active", institution: 11, fdrNumber: "FDR-2025-390", bank: "Axis Bank", branch: "Hauz Khas", ifsc: "UTIB0002345", amount: 800_000, issueOffset: -20, maturityOffset: 1000, status: "ACTIVE", verification: "INSTITUTION_SUBMITTED" },
];

/* -------------------------------------------------------------------------- */
/* Release requests                                                           */
/* -------------------------------------------------------------------------- */

type ReleaseSeed = {
  fdrKey: string;
  status: ReleaseStatus;
  reason: string;
  requestedDaysAgo: number;
  officerNotes?: string;
  scrutinizedDaysAgo?: number;
  approvedDaysAgo?: number;
  approvalNote?: string;
  rejectionReason?: string;
};

const releaseSeeds: ReleaseSeed[] = [
  {
    fdrKey: "niet-hdfc-released",
    status: "APPROVED_RELEASED",
    reason: "The FDR has matured and the security deposit is no longer required for the current approval cycle. The institution has requested release of the deposit with accrued interest.",
    requestedDaysAgo: 32,
    officerNotes: "Original FDR, bank confirmation and institution's request are in order. No open discrepancy. Recommended for release.",
    scrutinizedDaysAgo: 27,
    approvedDaysAgo: 21,
    approvalNote: "Approved. Release may be processed to the institution's designated bank account as per the Council's financial procedure.",
  },
  {
    fdrKey: "niet-union-release",
    status: "RECOMMENDED_BY_OFFICER",
    reason: "The instrument is approaching maturity and the institution has confirmed that the deposit may be released on maturity without renewal.",
    requestedDaysAgo: 12,
    officerNotes: "Eligibility verified against the FDR register and bank confirmation on record. The deposit amount and account holder details match. Recommended to the Competent Authority.",
    scrutinizedDaysAgo: 8,
  },
  {
    fdrKey: "svit-sbi-expiring",
    status: "PENDING_SCRUTINY",
    reason: "Release requested consequent to the closure of the approved programme for which the security deposit was furnished.",
    requestedDaysAgo: 4,
  },
  {
    fdrKey: "dypims-axis-released",
    status: "APPROVED_RELEASED",
    reason: "The underlying FDR matured and the institution has applied for refund of the security deposit.",
    requestedDaysAgo: 48,
    officerNotes: "Maturity and bank confirmation verified. No dues outstanding against the institution. Recommended.",
    scrutinizedDaysAgo: 42,
    approvedDaysAgo: 36,
    approvalNote: "Release approved subject to surrender of the original discharge voucher.",
  },
  {
    fdrKey: "bmcp-axis-matured",
    status: "REJECTED",
    reason: "Institution requested release of the matured deposit for working capital requirements.",
    requestedDaysAgo: 25,
    officerNotes: "Rejected at scrutiny: the request cites working capital requirements and does not satisfy the prescribed grounds for release under the applicable AICTE regulations.",
    scrutinizedDaysAgo: 21,
    rejectionReason: "The request does not establish an eligible ground for release. The institution may apply again with a valid closure or maturity-based justification.",
  },
  {
    fdrKey: "rtc-hdfc-released",
    status: "APPROVED_RELEASED",
    reason: "Matured FDR; the institution has requested release after completion of the approval period.",
    requestedDaysAgo: 56,
    officerNotes: "All records verified. Clear recommendation for release.",
    scrutinizedDaysAgo: 50,
    approvedDaysAgo: 44,
    approvalNote: "Approved by the Competent Authority. Dispatch reference recorded in the register.",
  },
  {
    fdrKey: "cim-axis-released",
    status: "APPROVED_RELEASED",
    reason: "Release of matured security deposit following withdrawal of the institution's approved programme.",
    requestedDaysAgo: 66,
    officerNotes: "Programme withdrawal order and bank confirmation verified. Recommended for release.",
    scrutinizedDaysAgo: 60,
    approvedDaysAgo: 52,
    approvalNote: "Approved. The release may be given effect after the original FDR is discharged.",
  },
  {
    fdrKey: "tncet-canara-matured",
    status: "PENDING_SCRUTINY",
    reason: "The FDR has matured. The institution requests refund of the deposit together with accrued interest.",
    requestedDaysAgo: 6,
  },
];

/* -------------------------------------------------------------------------- */
/* Main seed                                                                  */
/* -------------------------------------------------------------------------- */

async function seed() {
  console.log("Seeding AICTE FDR portal demo data…");
  await rm(UPLOAD_DIR, { recursive: true, force: true });
  await mkdir(UPLOAD_DIR, { recursive: true });

  await db.execute(sql`DROP TRIGGER IF EXISTS audit_logs_immutable ON audit_logs`);
  await db.execute(
    sql`TRUNCATE TABLE audit_logs, release_requests, fdr_documents, fdr_instruments, users, institutions CASCADE`,
  );

  const institutionRows = institutionSeeds.map((institution) => ({
    id: institution.id,
    aicteId: institution.aicteId,
    name: institution.name,
    region: institution.region,
    state: institution.state,
    institutionType: institution.institutionType,
    createdAt: daysAgo(900),
  }));

  const userRows = userSeeds.map((user) => ({
    id: user.id,
    institutionId: user.institutionId,
    name: user.name,
    email: user.email,
    role: user.role,
    designation: user.designation,
    phone: user.phone,
    isActive: true,
    createdAt: daysAgo(880),
  }));

  const adminByInstitution = new Map<number, UserSeed>();
  institutionAdmins.forEach((admin, index) => adminByInstitution.set(index, admin));

  const fdrIdByKey = new Map<string, string>();
  for (const seedRow of fdrSeeds) {
    fdrIdByKey.set(seedRow.key, randomUUID());
  }

  const releaseIds = new Map<string, string>();
  for (const release of releaseSeeds) {
    releaseIds.set(release.fdrKey, randomUUID());
  }

  const releaseByFdr = new Map<string, ReleaseSeed>();
  for (const release of releaseSeeds) releaseByFdr.set(release.fdrKey, release);

  const fdrRows: (typeof fdrInstruments.$inferInsert)[] = [];
  const documentRows: (typeof fdrDocuments.$inferInsert)[] = [];
  const auditEvents: {
    entityType: string;
    entityId: string;
    userId: string | null;
    action: string;
    details: AuditDetails;
    createdAt: Date;
  }[] = [];

  console.log("Generating encrypted demonstration documents…");

  for (const seedRow of fdrSeeds) {
    const id = fdrIdByKey.get(seedRow.key) as string;
    const institution = institutionSeeds[seedRow.institution];
    const admin = adminByInstitution.get(seedRow.institution) as UserSeed;
    const release = releaseByFdr.get(seedRow.key);
    const issueDate = dateOffset(seedRow.issueOffset);
    const maturityDate = dateOffset(seedRow.maturityOffset);
    const verifiedAt =
      seedRow.verification === "BANK_CONFIRMED"
        ? daysAgo(seedRow.verifiedOffset ?? 10, 11, 15)
        : null;
    const createdAt = daysAgo(Math.max(1, -seedRow.issueOffset - 2), 10, 20);
    const verifiedBy =
      seedRow.verification === "BANK_CONFIRMED"
        ? seedRow.institution % 2 === 0
          ? scrutinyOfficer.id
          : secondScrutinyOfficer.id
        : null;
    const confirmationRef = `BVS/${seedRow.bank.split(" ").map((word) => word[0]).join("")}/${2026}/${String(seedRow.institution + 1).padStart(2, "0")}${String(seedRow.fdrNumber.slice(-3))}`;
    const pdfData: FdrPdfData = {
      fdrNumber: seedRow.fdrNumber,
      bankName: seedRow.bank,
      branchName: seedRow.branch,
      ifscCode: seedRow.ifsc,
      amount: seedRow.amount,
      issueDate,
      maturityDate,
      holderName: institution.name,
      institutionName: institution.name,
      aicteId: institution.aicteId,
      jointHolder: "Regional Officer, AICTE",
    };

    const originalPdf = await createFdrCertificatePdf(pdfData);
    const original = await uploadToMockCloudStorage({
      fileName: `${seedRow.fdrNumber.replace(/[^A-Za-z0-9_-]/g, "_")}_FDR_Certificate.pdf`,
      mimeType: "application/pdf",
      buffer: originalPdf,
    });
    documentRows.push({
      id: original.storageKey,
      fdrId: id,
      docType: "ORIGINAL_FDR_SCAN",
      fileUrl: original.fileUrl,
      fileName: original.fileName,
      mimeType: original.mimeType,
      sizeBytes: original.sizeBytes,
      sha256: original.sha256,
      storageKey: original.storageKey,
      uploadedBy: admin.id,
      uploadedAt: createdAt,
    });

    if (seedRow.verification === "BANK_CONFIRMED" && verifiedAt) {
      const confirmationPdf = await createBankConfirmationPdf({
        ...pdfData,
        reference: confirmationRef,
        confirmationDate: verifiedAt.toISOString().slice(0, 10),
      });
      const confirmation = await uploadToMockCloudStorage({
        fileName: `${seedRow.fdrNumber.replace(/[^A-Za-z0-9_-]/g, "_")}_Bank_Confirmation.pdf`,
        mimeType: "application/pdf",
        buffer: confirmationPdf,
      });
      documentRows.push({
        id: confirmation.storageKey,
        fdrId: id,
        docType: "BANK_CONFIRMATION_LETTER",
        fileUrl: confirmation.fileUrl,
        fileName: confirmation.fileName,
        mimeType: confirmation.mimeType,
        sizeBytes: confirmation.sizeBytes,
        sha256: confirmation.sha256,
        storageKey: confirmation.storageKey,
        uploadedBy: verifiedBy,
        uploadedAt: verifiedAt,
      });
    }

    if (release?.status === "APPROVED_RELEASED") {
      const dischargePdf = await createDischargeVoucherPdf({
        ...pdfData,
        dispatchReference: dispatchReference(releaseIds.get(seedRow.key) as string, daysAgo(release.approvedDaysAgo ?? 20)),
        releaseDate: dateOffset(-(release.approvedDaysAgo ?? 20)),
      });
      const discharge = await uploadToMockCloudStorage({
        fileName: `${seedRow.fdrNumber.replace(/[^A-Za-z0-9_-]/g, "_")}_Discharge_Voucher.pdf`,
        mimeType: "application/pdf",
        buffer: dischargePdf,
      });
      documentRows.push({
        id: discharge.storageKey,
        fdrId: id,
        docType: "DISCHARGE_VOUCHER",
        fileUrl: discharge.fileUrl,
        fileName: discharge.fileName,
        mimeType: discharge.mimeType,
        sizeBytes: discharge.sizeBytes,
        sha256: discharge.sha256,
        storageKey: discharge.storageKey,
        uploadedBy: headUser.id,
        uploadedAt: daysAgo(release.approvedDaysAgo ?? 20, 12, 0),
      });
    }

    const parentId = seedRow.parentKey ? fdrIdByKey.get(seedRow.parentKey) : null;
    const status =
      release?.status === "APPROVED_RELEASED"
        ? "RELEASED"
        : release &&
            (release.status === "PENDING_SCRUTINY" ||
              release.status === "RECOMMENDED_BY_OFFICER")
          ? "RELEASE_REQUESTED"
          : seedRow.status;

    fdrRows.push({
      id,
      institutionId: institution.id,
      fdrNumber: seedRow.fdrNumber,
      issuingBank: seedRow.bank,
      branchName: seedRow.branch,
      ifscCode: seedRow.ifsc,
      depositAmount: seedRow.amount.toFixed(2),
      issueDate,
      maturityDate,
      jointAccountHolder: "Regional Officer, AICTE",
      status,
      verificationStatus: seedRow.verification,
      parentFdrId: parentId ?? null,
      scrutinyRemarks: seedRow.remarks ?? null,
      bankVerifiedData:
        seedRow.verification === "BANK_CONFIRMED" && verifiedAt
          ? {
              issuingBank: seedRow.bank,
              branchName: seedRow.branch,
              ifscCode: seedRow.ifsc,
              depositAmount: seedRow.amount.toFixed(2),
              issueDate,
              maturityDate,
              confirmationReference: confirmationRef,
              capturedAt: verifiedAt.toISOString(),
            }
          : null,
      bankConfirmationRef: seedRow.verification === "BANK_CONFIRMED" ? confirmationRef : null,
      submittedBy: admin.id,
      verifiedBy,
      verifiedAt,
      createdAt,
      updatedAt: release?.approvedDaysAgo
        ? daysAgo(release.approvedDaysAgo, 12, 0)
        : verifiedAt ?? createdAt,
    });

    auditEvents.push({
      entityType: "fdr",
      entityId: id,
      userId: admin.id,
      action: seedRow.parentKey ? "RENEWAL_SUBMITTED" : "SUBMITTED",
      details: {
        after: {
          fdrNumber: seedRow.fdrNumber,
          issuingBank: seedRow.bank,
          branchName: seedRow.branch,
          ifscCode: seedRow.ifsc,
          depositAmount: seedRow.amount,
          issueDate,
          maturityDate,
          status,
          verificationStatus: seedRow.verification,
          parentFdrId: parentId ?? null,
        },
        source: "Institution submission",
      },
      createdAt,
    });

    auditEvents.push({
      entityType: "fdr",
      entityId: id,
      userId: admin.id,
      action: "DOCUMENT_UPLOADED",
      details: {
        after: {
          docType: "ORIGINAL_FDR_SCAN",
          fileName: original.fileName,
          sha256: original.sha256,
          sizeBytes: original.sizeBytes,
        },
        source: "Institution submission",
      },
      createdAt: new Date(createdAt.getTime() + 20 * 60 * 1000),
    });

    if (seedRow.verification === "BANK_CONFIRMED" && verifiedAt && verifiedBy) {
      auditEvents.push({
        entityType: "fdr",
        entityId: id,
        userId: verifiedBy,
        action: "VERIFIED_BANK_CONFIRMED",
        details: {
          fdrNumber: seedRow.fdrNumber,
          before: { verificationStatus: "INSTITUTION_SUBMITTED", status: "ACTIVE" },
          after: {
            verificationStatus: "BANK_CONFIRMED",
            status,
            bankConfirmationRef: confirmationRef,
            bankLetterAttached: true,
          },
          remarks: "Particulars verified against the authorised bank confirmation on record.",
          source: "Authorised bank confirmation",
        },
        createdAt: verifiedAt,
      });
    }

    if (seedRow.verification === "DISCREPANCY_FOUND") {
      const flaggedAt = daysAgo(Math.max(2, Math.min(18, seedRow.institution + 4)), 15, 5);
      auditEvents.push({
        entityType: "fdr",
        entityId: id,
        userId: seedRow.institution % 2 === 0 ? scrutinyOfficer.id : secondScrutinyOfficer.id,
        action: "DISCREPANCY_FLAGGED",
        details: {
          fdrNumber: seedRow.fdrNumber,
          before: { verificationStatus: "INSTITUTION_SUBMITTED", status: "EXPIRING_SOON" },
          after: { verificationStatus: "DISCREPANCY_FOUND", status: "DISCREPANCY_FLAGGED" },
          remarks: seedRow.remarks,
        },
        createdAt: flaggedAt,
      });
    }
  }

  // Release requests and matching audit entries.
  const releaseRows: (typeof releaseRequests.$inferInsert)[] = [];
  for (const release of releaseSeeds) {
    const fdrId = fdrIdByKey.get(release.fdrKey) as string;
    const fdrSeed = fdrSeeds.find((row) => row.key === release.fdrKey) as FdrSeed;
    const admin = adminByInstitution.get(fdrSeed.institution) as UserSeed;
    const id = releaseIds.get(release.fdrKey) as string;
    const createdAt = daysAgo(release.requestedDaysAgo, 11, 30);
    const scrutinizedAt = release.scrutinizedDaysAgo
      ? daysAgo(release.scrutinizedDaysAgo, 14, 10)
      : null;
    const approvedAt = release.approvedDaysAgo
      ? daysAgo(release.approvedDaysAgo, 11, 0)
      : null;
    const dispatch =
      release.status === "APPROVED_RELEASED"
        ? dispatchReference(id, approvedAt ?? now)
        : null;

    releaseRows.push({
      id,
      fdrId,
      requestedBy: admin.id,
      reason: release.reason,
      status: release.status,
      officerNotes: release.officerNotes ?? null,
      scrutinizedBy: scrutinizedAt ? scrutinyOfficer.id : null,
      scrutinizedAt,
      approvedBy:
        release.status === "APPROVED_RELEASED" || release.status === "REJECTED"
          ? headUser.id
          : null,
      approvedAt: release.status === "APPROVED_RELEASED" ? approvedAt : null,
      approvalNote: release.approvalNote ?? null,
      rejectionReason: release.rejectionReason ?? null,
      dispatchReference: dispatch,
      createdAt,
      updatedAt: approvedAt ?? scrutinizedAt ?? createdAt,
    });

    auditEvents.push({
      entityType: "release",
      entityId: id,
      userId: admin.id,
      action: "RELEASE_REQUESTED",
      details: {
        fdrId,
        fdrNumber: fdrSeed.fdrNumber,
        amount: fdrSeed.amount,
        reason: release.reason,
        after: { status: "PENDING_SCRUTINY" },
      },
      createdAt,
    });

    if (scrutinizedAt) {
      auditEvents.push({
        entityType: "release",
        entityId: id,
        userId: scrutinyOfficer.id,
        action:
          release.status === "REJECTED" ? "RELEASE_REJECTED" : "RELEASE_RECOMMENDED",
        details: {
          fdrId,
          fdrNumber: fdrSeed.fdrNumber,
          before: { status: "PENDING_SCRUTINY" },
          after: {
            status: release.status === "REJECTED" ? "REJECTED" : "RECOMMENDED_BY_OFFICER",
          },
          reason: release.officerNotes,
        },
        createdAt: scrutinizedAt,
      });
    }

    if (release.status === "APPROVED_RELEASED" && approvedAt) {
      auditEvents.push({
        entityType: "release",
        entityId: id,
        userId: headUser.id,
        action: "RELEASE_APPROVED",
        details: {
          fdrId,
          fdrNumber: fdrSeed.fdrNumber,
          amount: fdrSeed.amount,
          before: { status: "RECOMMENDED_BY_OFFICER", fdrStatus: "RELEASE_REQUESTED" },
          after: { status: "APPROVED_RELEASED", fdrStatus: "RELEASED" },
          dispatchReference: dispatch,
          remarks: release.approvalNote,
          decidedBy: "REGULATION_BUREAU_HEAD",
        },
        createdAt: approvedAt,
      });
    }
  }

  // A couple of recent scrutiny observations so the activity feed feels live.
  const recentNoteTarget = fdrIdByKey.get("svit-hdfc-submitted") as string;
  auditEvents.push({
    entityType: "fdr",
    entityId: recentNoteTarget,
    userId: scrutinyOfficer.id,
    action: "SCRUTINY_REMARK_UPDATED",
    details: {
      fdrNumber: "FDR-2024-311",
      after: {
        scrutinyRemarks:
          "Initial review complete. Bank confirmation letter awaited before the record can be verified.",
      },
    },
    createdAt: daysAgo(1, 16, 20),
  });
  const recentDocTarget = fdrIdByKey.get("niet-canara-expiring") as string;
  auditEvents.push({
    entityType: "fdr",
    entityId: recentDocTarget,
    userId: adminByInstitution.get(0)?.id ?? null,
    action: "DOCUMENT_UPLOADED",
    details: {
      fdrNumber: "FDR-2025-067",
      after: {
        docType: "BANK_CONFIRMATION_LETTER",
        fileName: "FDR-2025-067_Canara_Confirmation.pdf",
      },
    },
    createdAt: daysAgo(2, 9, 45),
  });

  auditEvents.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

  await db.transaction(async (tx) => {
    await tx.insert(institutions).values(institutionRows);
    await tx.insert(users).values(userRows);
    await tx.insert(fdrInstruments).values(fdrRows);
    await tx.insert(fdrDocuments).values(documentRows);
    await tx.insert(releaseRequests).values(releaseRows);
    await tx.insert(auditLogs).values(
      auditEvents.map((event) => ({
        entityType: event.entityType,
        entityId: event.entityId,
        userId: event.userId,
        action: event.action,
        details: event.details,
        createdAt: event.createdAt,
      })),
    );
  });

  // Install the append-only guard after seeding.
  await db.execute(sql`
    CREATE OR REPLACE FUNCTION aicte_prevent_audit_mutation()
    RETURNS trigger AS $$
    BEGIN
      RAISE EXCEPTION 'audit_logs is append-only';
    END;
    $$ LANGUAGE plpgsql
  `);
  await db.execute(sql`DROP TRIGGER IF EXISTS audit_logs_immutable ON audit_logs`);
  await db.execute(sql`
    CREATE TRIGGER audit_logs_immutable
    BEFORE UPDATE OR DELETE ON audit_logs
    FOR EACH ROW EXECUTE FUNCTION aicte_prevent_audit_mutation()
  `);

  const totalValue = fdrRows
    .filter((row) => row.status !== "RELEASED")
    .reduce((sum, row) => sum + Number(row.depositAmount), 0);

  console.log("");
  console.log("Seed complete.");
  console.log(`  Institutions : ${institutionRows.length}`);
  console.log(`  Users        : ${userRows.length} (3 bureau roles + ${institutionAdmins.length} institution admins)`);
  console.log(`  FDRs         : ${fdrRows.length}`);
  console.log(`  Documents    : ${documentRows.length} (AES-256-GCM encrypted at rest)`);
  console.log(`  Releases     : ${releaseRows.length}`);
  console.log(`  Audit events : ${auditEvents.length}`);
  console.log(`  Live value   : Rs. ${(totalValue / 1_00_00_000).toFixed(2)} Cr`);
  console.log("");
  console.log("Open the portal at http://localhost:3000 and use the role switcher to evaluate all three roles.");
}

seed()
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await closeDatabase();
  });
