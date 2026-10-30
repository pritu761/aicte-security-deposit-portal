import { relations, sql } from "drizzle-orm";
import {
  boolean,
  check,
  date,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";

/* -------------------------------------------------------------------------- */
/* Enums                                                                      */
/* -------------------------------------------------------------------------- */

export const userRoleEnum = pgEnum("user_role", [
  "INSTITUTION_ADMIN",
  "AICTE_SCRUTINY_OFFICER",
  "REGULATION_BUREAU_HEAD",
]);

export const fdrStatusEnum = pgEnum("fdr_status", [
  "ACTIVE",
  "EXPIRING_SOON",
  "MATURED",
  "RENEWAL_PENDING",
  "RELEASE_REQUESTED",
  "RELEASED",
  "DISCREPANCY_FLAGGED",
]);

export const verificationStatusEnum = pgEnum("verification_status", [
  "INSTITUTION_SUBMITTED",
  "BANK_CONFIRMED",
  "DISCREPANCY_FOUND",
]);

export const documentTypeEnum = pgEnum("document_type", [
  "ORIGINAL_FDR_SCAN",
  "BANK_CONFIRMATION_LETTER",
  "DISCHARGE_VOUCHER",
]);

export const releaseStatusEnum = pgEnum("release_status", [
  "PENDING_SCRUTINY",
  "RECOMMENDED_BY_OFFICER",
  "REJECTED",
  "APPROVED_RELEASED",
]);

/* -------------------------------------------------------------------------- */
/* Shared JSON types                                                          */
/* -------------------------------------------------------------------------- */

export type BankVerifiedSnapshot = {
  issuingBank?: string;
  branchName?: string;
  ifscCode?: string;
  depositAmount?: string;
  issueDate?: string;
  maturityDate?: string;
  confirmationReference?: string;
  capturedAt?: string;
};

export type AuditDetails = {
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
  remarks?: string | null;
  reason?: string | null;
  dispatchReference?: string | null;
  source?: string | null;
  [key: string]: unknown;
};

/* -------------------------------------------------------------------------- */
/* Institutions                                                               */
/* -------------------------------------------------------------------------- */

export const institutions = pgTable(
  "institutions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    aicteId: varchar("aicte_id", { length: 32 }).notNull(),
    name: varchar("name", { length: 240 }).notNull(),
    region: varchar("region", { length: 80 }).notNull(),
    state: varchar("state", { length: 80 }).notNull(),
    institutionType: varchar("institution_type", { length: 80 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("institutions_aicte_id_unique").on(table.aicteId),
    index("institutions_state_idx").on(table.state),
    index("institutions_region_idx").on(table.region),
  ],
);

/* -------------------------------------------------------------------------- */
/* Users                                                                      */
/* -------------------------------------------------------------------------- */

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    institutionId: uuid("institution_id").references(() => institutions.id, {
      onDelete: "set null",
    }),
    name: varchar("name", { length: 160 }).notNull(),
    email: varchar("email", { length: 200 }).notNull(),
    role: userRoleEnum("role").notNull(),
    designation: varchar("designation", { length: 160 }),
    phone: varchar("phone", { length: 24 }),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("users_email_unique").on(sql`lower(${table.email})`),
    index("users_institution_idx").on(table.institutionId),
    index("users_role_idx").on(table.role),
  ],
);

/* -------------------------------------------------------------------------- */
/* FDR Instruments                                                            */
/* -------------------------------------------------------------------------- */

export const fdrInstruments = pgTable(
  "fdr_instruments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    institutionId: uuid("institution_id")
      .notNull()
      .references(() => institutions.id, { onDelete: "restrict" }),
    fdrNumber: varchar("fdr_number", { length: 80 }).notNull(),
    issuingBank: varchar("issuing_bank", { length: 160 }).notNull(),
    branchName: varchar("branch_name", { length: 160 }),
    ifscCode: varchar("ifsc_code", { length: 11 }).notNull(),
    depositAmount: numeric("deposit_amount", { precision: 15, scale: 2 }).notNull(),
    issueDate: date("issue_date").notNull(),
    maturityDate: date("maturity_date").notNull(),
    jointAccountHolder: varchar("joint_account_holder", { length: 160 })
      .notNull()
      .default("Regional Officer, AICTE"),
    status: fdrStatusEnum("status").notNull().default("ACTIVE"),
    verificationStatus: verificationStatusEnum("verification_status")
      .notNull()
      .default("INSTITUTION_SUBMITTED"),
    parentFdrId: uuid("parent_fdr_id").references(
      (): AnyPgColumn => fdrInstruments.id,
      { onDelete: "set null" },
    ),
    scrutinyRemarks: text("scrutiny_remarks"),
    bankVerifiedData: jsonb("bank_verified_data").$type<BankVerifiedSnapshot>(),
    bankConfirmationRef: varchar("bank_confirmation_ref", { length: 120 }),
    submittedBy: uuid("submitted_by").references(() => users.id, { onDelete: "set null" }),
    verifiedBy: uuid("verified_by").references(() => users.id, { onDelete: "set null" }),
    verifiedAt: timestamp("verified_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("fdr_number_bank_unique").on(
      sql`upper(${table.fdrNumber})`,
      sql`upper(${table.issuingBank})`,
    ),
    index("fdr_institution_idx").on(table.institutionId),
    index("fdr_status_idx").on(table.status),
    index("fdr_maturity_idx").on(table.maturityDate),
    index("fdr_parent_idx").on(table.parentFdrId),
    check("fdr_deposit_positive", sql`${table.depositAmount} > 0`),
  ],
);

/* -------------------------------------------------------------------------- */
/* Documents                                                                  */
/* -------------------------------------------------------------------------- */

export const fdrDocuments = pgTable(
  "fdr_documents",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    fdrId: uuid("fdr_id")
      .notNull()
      .references(() => fdrInstruments.id, { onDelete: "cascade" }),
    docType: documentTypeEnum("doc_type").notNull(),
    fileUrl: text("file_url").notNull(),
    fileName: text("file_name").notNull(),
    mimeType: varchar("mime_type", { length: 100 }).notNull(),
    sizeBytes: integer("size_bytes").notNull(),
    sha256: varchar("sha256", { length: 64 }).notNull(),
    storageKey: text("storage_key").notNull(),
    uploadedBy: uuid("uploaded_by").references(() => users.id, { onDelete: "set null" }),
    uploadedAt: timestamp("uploaded_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("fdr_documents_fdr_idx").on(table.fdrId),
    index("fdr_documents_type_idx").on(table.docType),
  ],
);

/* -------------------------------------------------------------------------- */
/* Release requests                                                           */
/* -------------------------------------------------------------------------- */

export const releaseRequests = pgTable(
  "release_requests",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    fdrId: uuid("fdr_id")
      .notNull()
      .references(() => fdrInstruments.id, { onDelete: "restrict" }),
    requestedBy: uuid("requested_by")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    reason: text("reason").notNull(),
    status: releaseStatusEnum("status").notNull().default("PENDING_SCRUTINY"),
    officerNotes: text("officer_notes"),
    scrutinizedBy: uuid("scrutinized_by").references(() => users.id, {
      onDelete: "set null",
    }),
    scrutinizedAt: timestamp("scrutinized_at", { withTimezone: true }),
    approvedBy: uuid("approved_by").references(() => users.id, { onDelete: "set null" }),
    approvedAt: timestamp("approved_at", { withTimezone: true }),
    approvalNote: text("approval_note"),
    rejectionReason: text("rejection_reason"),
    dispatchReference: varchar("dispatch_reference", { length: 80 }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("release_fdr_idx").on(table.fdrId),
    index("release_status_idx").on(table.status),
    index("release_requested_by_idx").on(table.requestedBy),
    uniqueIndex("release_active_fdr_unique")
      .on(table.fdrId)
      .where(sql`${table.status} in ('PENDING_SCRUTINY', 'RECOMMENDED_BY_OFFICER')`),
    uniqueIndex("release_dispatch_ref_unique").on(table.dispatchReference),
  ],
);

/* -------------------------------------------------------------------------- */
/* Audit logs (append-only; a DB trigger is installed during setup/seed)       */
/* -------------------------------------------------------------------------- */

export const auditLogs = pgTable(
  "audit_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    entityType: varchar("entity_type", { length: 60 }).notNull(),
    entityId: uuid("entity_id").notNull(),
    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
    action: varchar("action", { length: 80 }).notNull(),
    details: jsonb("details").$type<AuditDetails>().notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("audit_entity_idx").on(table.entityType, table.entityId),
    index("audit_user_idx").on(table.userId),
    index("audit_created_idx").on(table.createdAt),
    index("audit_action_idx").on(table.action),
  ],
);

/* -------------------------------------------------------------------------- */
/* Relations                                                                  */
/* -------------------------------------------------------------------------- */

export const institutionsRelations = relations(institutions, ({ many }) => ({
  users: many(users),
  fdrInstruments: many(fdrInstruments),
}));

export const usersRelations = relations(users, ({ one, many }) => ({
  institution: one(institutions, {
    fields: [users.institutionId],
    references: [institutions.id],
  }),
  auditLogs: many(auditLogs),
}));

export const fdrInstrumentsRelations = relations(fdrInstruments, ({ one, many }) => ({
  institution: one(institutions, {
    fields: [fdrInstruments.institutionId],
    references: [institutions.id],
  }),
  parent: one(fdrInstruments, {
    fields: [fdrInstruments.parentFdrId],
    references: [fdrInstruments.id],
    relationName: "renewalChain",
  }),
  renewals: many(fdrInstruments, { relationName: "renewalChain" }),
  documents: many(fdrDocuments),
  releaseRequests: many(releaseRequests),
}));

export const fdrDocumentsRelations = relations(fdrDocuments, ({ one }) => ({
  fdr: one(fdrInstruments, {
    fields: [fdrDocuments.fdrId],
    references: [fdrInstruments.id],
  }),
  uploadedByUser: one(users, {
    fields: [fdrDocuments.uploadedBy],
    references: [users.id],
  }),
}));

export const releaseRequestsRelations = relations(releaseRequests, ({ one }) => ({
  fdr: one(fdrInstruments, {
    fields: [releaseRequests.fdrId],
    references: [fdrInstruments.id],
  }),
  requestedByUser: one(users, {
    fields: [releaseRequests.requestedBy],
    references: [users.id],
    relationName: "releaseRequester",
  }),
  approvedByUser: one(users, {
    fields: [releaseRequests.approvedBy],
    references: [users.id],
    relationName: "releaseApprover",
  }),
}));

export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
  user: one(users, {
    fields: [auditLogs.userId],
    references: [users.id],
  }),
}));

/* -------------------------------------------------------------------------- */
/* Inferred types                                                             */
/* -------------------------------------------------------------------------- */

export type Institution = typeof institutions.$inferSelect;
export type NewInstitution = typeof institutions.$inferInsert;
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type FdrInstrument = typeof fdrInstruments.$inferSelect;
export type NewFdrInstrument = typeof fdrInstruments.$inferInsert;
export type FdrDocument = typeof fdrDocuments.$inferSelect;
export type NewFdrDocument = typeof fdrDocuments.$inferInsert;
export type ReleaseRequest = typeof releaseRequests.$inferSelect;
export type NewReleaseRequest = typeof releaseRequests.$inferInsert;
export type AuditLog = typeof auditLogs.$inferSelect;
export type UserRole = (typeof userRoleEnum.enumValues)[number];
export type FdrStatus = (typeof fdrStatusEnum.enumValues)[number];
export type VerificationStatus = (typeof verificationStatusEnum.enumValues)[number];
export type DocumentType = (typeof documentTypeEnum.enumValues)[number];
export type ReleaseStatus = (typeof releaseStatusEnum.enumValues)[number];
