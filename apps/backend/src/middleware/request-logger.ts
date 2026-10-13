import type { NextFunction, Request, Response } from "express";

/** Tiny dev request logger: method, path, status, ms. No dependencies. */
export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const start = Date.now();
  res.on("finish", () => {
    const ms = Date.now() - start;
    console.log(`${req.method} ${req.path} ${res.statusCode} ${ms}ms`);
  });
  next();
}
