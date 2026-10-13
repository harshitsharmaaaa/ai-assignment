import type {
  CreateDiscussionInput,
  CreateLeadInput,
  DiscussionItem,
  LeadListItem,
  LeadResponse,
  LeadStatus,
  UpdateLeadInput,
} from "@leadflow/shared";

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

export type ListLeadsParams = { status?: LeadStatus; search?: string };

export async function listLeads(params: ListLeadsParams): Promise<LeadListItem[]> {
  const q = new URLSearchParams();
  if (params.status) q.set("status", params.status);
  if (params.search) q.set("search", params.search);
  const qs = q.toString();
  const res = await apiFetch<{ data: LeadListItem[] }>(`/api/leads${qs ? `?${qs}` : ""}`);
  return res.data;
}

export async function createLead(input: CreateLeadInput): Promise<LeadResponse> {
  const res = await apiFetch<{ data: LeadResponse }>("/api/leads", {
    method: "POST",
    body: JSON.stringify(input),
  });
  return res.data;
}

export async function updateLead(id: string, input: UpdateLeadInput): Promise<LeadListItem> {
  const res = await apiFetch<{ data: LeadListItem }>(`/api/leads/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
  return res.data;
}

export async function listDiscussions(leadId: string): Promise<DiscussionItem[]> {
  const res = await apiFetch<{ data: DiscussionItem[] }>(`/api/leads/${leadId}/discussions`);
  return res.data;
}

export async function addDiscussion(
  leadId: string,
  input: CreateDiscussionInput,
): Promise<{ discussion: DiscussionItem; lead: LeadListItem }> {
  const res = await apiFetch<{ data: { discussion: DiscussionItem; lead: LeadListItem } }>(
    `/api/leads/${leadId}/discussions`,
    { method: "POST", body: JSON.stringify(input) },
  );
  return res.data;
}

/** Human message for toasts; falls back to a generic message. */
export function apiErrorMessage(err: unknown, fallback: string): string {
  return err instanceof ApiError ? err.message : fallback;
}
