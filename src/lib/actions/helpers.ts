import { ActionError, type ActionState } from "@/lib/validation";

export function failure(message: string, fieldErrors?: Record<string, string[]>): ActionState {
  return { status: "error", message, fieldErrors };
}

export function success(message: string, data?: Record<string, unknown>): ActionState {
  return { status: "success", message, data };
}

export function isUniqueViolation(error: unknown): boolean {
  return Boolean(
    error &&
      typeof error === "object" &&
      "code" in error &&
      (error as { code?: string }).code === "23505",
  );
}

export function toActionError(error: unknown, context: string): ActionState {
  if (error instanceof ActionError) {
    return failure(error.message, error.fieldErrors);
  }
  if (isUniqueViolation(error)) {
    const detail = String((error as { detail?: string }).detail ?? "");
    if (detail.includes("fdr_number_bank_unique")) {
      return failure("This FDR number is already recorded for the selected bank.", {
        fdrNumber: ["An FDR with this number and bank already exists."],
      });
    }
    if (detail.includes("release_active_fdr_unique")) {
      return failure("An active release request already exists for this FDR.");
    }
    return failure("This record conflicts with an existing entry. Refresh and try again.");
  }
  console.error(`[action:${context}]`, error);
  return failure("Something went wrong while processing the request. Please try again.");
}

export function appendRemark(existing: string | null, addition: string): string {
  const clean = addition.trim();
  if (!clean) return existing ?? "";
  const combined = existing?.trim() ? `${existing.trim()}\n\n${clean}` : clean;
  return combined.slice(0, 6000);
}

export function fieldString(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

export function optionalFile(formData: FormData, name: string): File | null {
  const value = formData.get(name);
  return value instanceof File && value.size > 0 ? value : null;
}
