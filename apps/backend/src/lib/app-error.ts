export class AppError extends Error {
  readonly statusCode: number;
  readonly code: string;
  readonly details?: unknown;

  constructor(args: { statusCode: number; code: string; message: string; details?: unknown }) {
    super(args.message);
    this.name = "AppError";
    this.statusCode = args.statusCode;
    this.code = args.code;
    this.details = args.details;
  }
}
