export type ApiErrorShape = {
  error: { code: string; message: string; details?: unknown };
};

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: unknown;

  constructor(args: { status: number; code: string; message: string; details?: unknown }) {
    super(args.message);
    this.name = "ApiError";
    this.status = args.status;
    this.code = args.code;
    this.details = args.details;
  }
}

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

async function parseBody(res: Response): Promise<unknown> {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: { "content-type": "application/json", ...(init?.headers ?? {}) },
  });
  const body = await parseBody(res);
  if (!res.ok) {
    const shaped = body as Partial<ApiErrorShape>;
    throw new ApiError({
      status: res.status,
      code: shaped?.error?.code ?? "API_ERROR",
      message: shaped?.error?.message ?? `Request failed (${res.status})`,
      details: shaped?.error?.details,
    });
  }
  return body as T;
}
