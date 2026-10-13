import type { NextFunction, Request, Response } from "express";
import { Prisma } from "@leadflow/db";
import { ZodError } from "zod";
import { AppError } from "../lib/app-error.js";
import { formatZodIssues } from "../lib/validation.js";

type ErrorBody = {
  error: { code: string; message: string; details?: unknown };
};

function send(res: Response, status: number, body: ErrorBody): void {
  res.status(status).json(body);
}

export function errorHandler(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  err: any,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction,
): void {
  const isProd = process.env.NODE_ENV === "production";

  if (err instanceof ZodError) {
    send(res, 400, {
      error: {
        code: "VALIDATION_ERROR",
        message: "Invalid request",
        details: formatZodIssues(err),
      },
    });
    return;
  }

  if (err instanceof AppError) {
    const body: ErrorBody = { error: { code: err.code, message: err.message } };
    if (err.details !== undefined) body.error.details = err.details;
    send(res, err.statusCode, body);
    return;
  }

  // Malformed JSON body (thrown by express.json before routing).
  if (err?.type === "entity.parse.failed") {
    send(res, 400, { error: { code: "INVALID_JSON", message: "Malformed JSON body" } });
    return;
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === "P2025") {
      send(res, 404, { error: { code: "NOT_FOUND", message: "Record not found" } });
      return;
    }
    if (err.code === "P2002") {
      send(res, 409, {
        error: { code: "CONFLICT", message: "Record already exists", details: err.meta },
      });
      return;
    }
  }

  if (!isProd) {
    console.error(`[${req.method} ${req.path}]`, err);
  }
  send(res, 500, { error: { code: "INTERNAL_ERROR", message: "Internal server error" } });
}
