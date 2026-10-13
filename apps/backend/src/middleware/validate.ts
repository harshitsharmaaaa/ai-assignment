import type { NextFunction, Request, Response } from "express";
import type { ZodType } from "zod";
import { AppError } from "../lib/app-error.js";
import { formatZodIssues } from "../lib/validation.js";

type Schemas = {
  body?: ZodType;
  query?: ZodType;
  params?: ZodType;
};

/**
 * Express 5 exposes `req.query` as a getter-only property, so plain
 * assignment throws in ESM strict mode. Assign directly where possible and
 * fall back to an own-property definition.
 */
function assignSafely(req: Request, key: "body" | "query" | "params", value: unknown): void {
  try {
    (req as unknown as Record<string, unknown>)[key] = value;
  } catch {
    Object.defineProperty(req, key, { value, writable: true, configurable: true });
  }
}

export function validate(schemas: Schemas) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const details: { path: string; message: string }[] = [];

    if (schemas.body) {
      const parsed = schemas.body.safeParse(req.body);
      if (!parsed.success) {
        details.push(...formatZodIssues(parsed.error, "body"));
      } else {
        assignSafely(req, "body", parsed.data);
      }
    }
    if (schemas.query) {
      const parsed = schemas.query.safeParse(req.query);
      if (!parsed.success) {
        details.push(...formatZodIssues(parsed.error, "query"));
      } else {
        assignSafely(req, "query", parsed.data);
      }
    }
    if (schemas.params) {
      const parsed = schemas.params.safeParse(req.params);
      if (!parsed.success) {
        details.push(...formatZodIssues(parsed.error, "params"));
      } else {
        assignSafely(req, "params", parsed.data);
      }
    }

    if (details.length > 0) {
      next(
        new AppError({
          statusCode: 400,
          code: "VALIDATION_ERROR",
          message: "Invalid request",
          details,
        }),
      );
      return;
    }
    next();
  };
}
