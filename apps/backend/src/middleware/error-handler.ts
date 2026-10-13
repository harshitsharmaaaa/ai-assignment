import type { NextFunction, Request, Response } from "express";
import { Prisma } from "@leadflow/db";
import { ZodError } from "zod";
import { AppError } from "../lib/app-error.js";

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
      error: { code: "VALIDATION_ERROR", message: "Invalid request", details: err.flatten() },
    });
    return;
  }

  // validate() forwards a plain object (not AppError) for aggregated failures
  if (err?.isValidation === true) {
    send(res, 400, {
      error: {
        code: err.code ?? "VALIDATION_ERROR",
        message: err.message ?? "Invalid request",
        details: err.details,
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
