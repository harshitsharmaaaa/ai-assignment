import { ZodError } from "zod";

export type ValidationIssue = { path: string; message: string };

/** Flatten a ZodError into the API `details` shape: a list of `{ path, message }`. */
export function formatZodIssues(error: ZodError, prefix?: string): ValidationIssue[] {
  return error.issues.map((issue) => {
    const parts = [...(prefix ? [prefix] : []), ...issue.path.map(String)];
    return { path: parts.join(".") || "(root)", message: issue.message };
  });
}
