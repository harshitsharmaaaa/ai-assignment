import type { NextFunction, Request, Response } from "express";
import type { ZodType } from "zod";

type Schemas = {
  body?: ZodType;
  query?: ZodType;
  params?: ZodType;
};

export function validate(schemas: Schemas) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const details: Record<string, unknown> = {};

    if (schemas.body) {
      const parsed = schemas.body.safeParse(req.body);
      if (!parsed.success) {
        details["body"] = parsed.error.flatten();
      } else {
        req.body = parsed.data;
      }
    }
    if (schemas.query) {
      const parsed = schemas.query.safeParse(req.query);
      if (!parsed.success) {
        details["query"] = parsed.error.flatten();
      } else {
        req.query = parsed.data as typeof req.query;
      }
    }
    if (schemas.params) {
      const parsed = schemas.params.safeParse(req.params);
      if (!parsed.success) {
        details["params"] = parsed.error.flatten();
      } else {
        req.params = parsed.data as typeof req.params;
      }
    }

    if (Object.keys(details).length > 0) {
      next({
        statusCode: 400,
        code: "VALIDATION_ERROR",
        message: "Invalid request",
        details,
        isValidation: true,
      } as const);
      return;
    }
    next();
  };
}
