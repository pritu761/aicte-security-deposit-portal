import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

import type { FdrStatus } from "@/db/schema";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const IST = "Asia/Kolkata";
const dateOnlyPattern = /^\d{4}-\d{2}-\d{2}$/;

export function todayISO(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: IST,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export function toDateOnly(value: string | Date): string {
  if (typeof value === "string" && dateOnlyPattern.test(value.slice(0, 10))) {
    return value.slice(0, 10);
  }
  const date = typeof value === "string" ? new Date(value) : value;
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: IST,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function daysUntil(dateISO: string, fromISO: string = todayISO()): number {
  const [y1, m1, d1] = fromISO.slice(0, 10).split("-").map(Number);
  const [y2, m2, d2] = dateISO.slice(0, 10).split("-").map(Number);
  const a = Date.UTC(y1, m1 - 1, d1);
  const b = Date.UTC(y2, m2 - 1, d2);
  return Math.round((b - a) / 86_400_000);
}

export function formatDate(value: string | Date | null | undefined): string {
  if (!value) return "—";
  if (typeof value === "string" && dateOnlyPattern.test(value.slice(0, 10))) {
    const [year, month, day] = value.slice(0, 10).split("-").map(Number);
    return `${String(day).padStart(2, "0")} ${MONTHS[month - 1]} ${year}`;
  }
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: IST,
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(typeof value === "string" ? new Date(value) : value);
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function formatDateTime(value: string | Date | null | undefined): string {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: IST,
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).format(typeof value === "string" ? new Date(value) : value);
}

export function formatTime(value: string | Date): string {
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: IST,
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).format(typeof value === "string" ? new Date(value) : value);
}

export function toNumber(value: string | number | null | undefined): number {
  if (value === null || value === undefined || value === "") return 0;
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function formatINR(
  value: string | number | null | undefined,
  options: { compact?: boolean; decimals?: number } = {},
): string {
  const amount = toNumber(value);
  if (options.compact) {
    if (Math.abs(amount) >= 1_00_00_000) {
      return `₹${(amount / 1_00_00_000).toLocaleString("en-IN", {
        maximumFractionDigits: 2,
        minimumFractionDigits: 0,
      })} Cr`;
    }
    if (Math.abs(amount) >= 1_00_000) {
      return `₹${(amount / 1_00_000).toLocaleString("en-IN", {
        maximumFractionDigits: 2,
        minimumFractionDigits: 0,
      })} L`;
    }
    if (Math.abs(amount) >= 1_000) {
      return `₹${(amount / 1_000).toLocaleString("en-IN", {
        maximumFractionDigits: 1,
        minimumFractionDigits: 0,
      })} K`;
    }
  }
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: options.decimals ?? 0,
    minimumFractionDigits: 0,
  }).format(amount);
}

export function formatFileSize(bytes: number): string {
  if (!bytes) return "0 KB";
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function initials(name: string): string {
  return (
    name
      .replace(/\b(Dr|Prof|Mr|Mrs|Ms|Shri|Smt)\.?\s/gi, "")
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "AI"
  );
}

export function getEffectiveFdrStatus(fdr: {
  status: FdrStatus;
  maturityDate: string;
}): FdrStatus {
  if (
    fdr.status === "RELEASED" ||
    fdr.status === "DISCREPANCY_FLAGGED" ||
    fdr.status === "RELEASE_REQUESTED" ||
    fdr.status === "RENEWAL_PENDING"
  ) {
    return fdr.status;
  }
  const days = daysUntil(fdr.maturityDate);
  if (days < 0) return "MATURED";
  if (days <= 90) return "EXPIRING_SOON";
  return "ACTIVE";
}

export function maturityLabel(maturityDate: string): {
  label: string;
  days: number;
  tone: "danger" | "warning" | "neutral";
} {
  const days = daysUntil(maturityDate);
  if (days < 0) {
    return {
      label: `Matured ${Math.abs(days)} day${Math.abs(days) === 1 ? "" : "s"} ago`,
      days,
      tone: "danger",
    };
  }
  if (days === 0) return { label: "Matures today", days, tone: "warning" };
  if (days <= 30) return { label: `${days} day${days === 1 ? "" : "s"} left`, days, tone: "warning" };
  return { label: `${days.toLocaleString("en-IN")} days left`, days, tone: "neutral" };
}

export function compactNumber(value: number): string {
  return new Intl.NumberFormat("en-IN", { notation: "compact", maximumFractionDigits: 1 }).format(value);
}

export function csvEscape(value: unknown): string {
  const text =
    value === null || value === undefined
      ? ""
      : typeof value === "object"
        ? JSON.stringify(value)
        : String(value);
  if (/[",\n\r]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

export function toCsv(
  rows: Record<string, unknown>[],
  columns?: { key: string; header: string }[],
): string {
  const cols =
    columns ??
    (rows[0]
      ? Object.keys(rows[0]).map((key) => ({ key, header: titleCase(key) }))
      : []);
  const header = cols.map((column) => csvEscape(column.header)).join(",");
  const body = rows.map((row) => cols.map((column) => csvEscape(row[column.key])).join(","));
  return [header, ...body].join("\r\n");
}

export function titleCase(value: string): string {
  return value
    .replace(/[_-]+/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export function truncate(value: string, max = 80): string {
  return value.length > max ? `${value.slice(0, max - 1)}…` : value;
}

export function pluralize(count: number, singular: string, plural = `${singular}s`): string {
  return `${count.toLocaleString("en-IN")} ${count === 1 ? singular : plural}`;
}

export function addDaysToISO(iso: string, days: number): string {
  const [year, month, day] = iso.slice(0, 10).split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function monthKey(dateISO: string): string {
  return dateISO.slice(0, 7);
}

export function formatMonth(key: string): string {
  const [year, month] = key.split("-").map(Number);
  return `${MONTHS[month - 1]} ${String(year).slice(2)}`;
}

export function isDateOnly(value: string): boolean {
  return dateOnlyPattern.test(value);
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function getInitialsFromEmail(email: string): string {
  return email.slice(0, 2).toUpperCase();
}
