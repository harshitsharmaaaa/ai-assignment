import type {
  CreateDiscussionInput,
  CreateLeadInput,
  DiscussionItem,
  LeadListItem,
  LeadResponse,
  ListLeadsQuery,
  UpdateLeadInput,
} from "@leadflow/shared";
import { prisma } from "@leadflow/db";
import type { Discussion, Lead } from "@leadflow/db";
import { AppError } from "../lib/app-error.js";

type LeadWithRecentDiscussions = Lead & { discussions: Discussion[] };

const lastDiscussionInclude = {
  discussions: { orderBy: { createdAt: "desc" as const }, take: 1 },
} as const;

const iso = (d: Date): string => d.toISOString();

function toLeadResponse(lead: Lead): LeadResponse {
  return {
    id: lead.id,
    name: lead.name,
    company: lead.company,
    phone: lead.phone,
    status: lead.status,
    nextFollowUpAt: lead.nextFollowUpAt ? iso(lead.nextFollowUpAt) : null,
    createdAt: iso(lead.createdAt),
    updatedAt: iso(lead.updatedAt),
  };
}

/** Single mapper from a Prisma lead (with the latest discussion included) to the API shape. */
export function toLeadListItem(lead: LeadWithRecentDiscussions): LeadListItem {
  const [last] = lead.discussions;
  return {
    ...toLeadResponse(lead),
    lastDiscussion: last ? { note: last.note, createdAt: iso(last.createdAt) } : null,
  };
}

function toDiscussionItem(discussion: Discussion): DiscussionItem {
  return {
    id: discussion.id,
    leadId: discussion.leadId,
    note: discussion.note,
    createdAt: iso(discussion.createdAt),
  };
}

/** Most recent activity first: last discussion time, falling back to lead creation. */
function byActivityDesc(a: LeadListItem, b: LeadListItem): number {
  const at = (l: LeadListItem): string => l.lastDiscussion?.createdAt ?? l.createdAt;
  if (at(a) !== at(b)) return at(b) < at(a) ? -1 : 1;
  return a.id < b.id ? -1 : 1;
}

function notFound(): AppError {
  return new AppError({ statusCode: 404, code: "NOT_FOUND", message: "Lead not found" });
}

export async function listLeads(query: ListLeadsQuery): Promise<LeadListItem[]> {
  const leads = await prisma.lead.findMany({
    where: {
      ...(query.status ? { status: query.status } : {}),
      ...(query.search
        ? {
            OR: [
              { name: { contains: query.search, mode: "insensitive" } },
              { company: { contains: query.search, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    include: lastDiscussionInclude,
  });
  return leads.map(toLeadListItem).sort(byActivityDesc);
}

export async function createLead(input: CreateLeadInput): Promise<LeadResponse> {
  const lead = await prisma.lead.create({
    data: {
      name: input.name,
      company: input.company ?? null,
      phone: input.phone ?? null,
    },
  });
  return toLeadResponse(lead);
}

export async function getLead(id: string): Promise<LeadResponse> {
  const lead = await prisma.lead.findUnique({ where: { id } });
  if (!lead) throw notFound();
  return toLeadResponse(lead);
}

export async function updateLead(id: string, input: UpdateLeadInput): Promise<LeadListItem> {
  const existing = await prisma.lead.findUnique({ where: { id } });
  if (!existing) throw notFound();
  const lead = await prisma.lead.update({
    where: { id },
    data: {
      ...(input.status !== undefined ? { status: input.status } : {}),
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.company !== undefined ? { company: input.company } : {}),
      ...(input.phone !== undefined ? { phone: input.phone } : {}),
      ...(input.nextFollowUpAt !== undefined
        ? { nextFollowUpAt: input.nextFollowUpAt ? new Date(input.nextFollowUpAt) : null }
        : {}),
    },
    include: lastDiscussionInclude,
  });
  return toLeadListItem(lead);
}

export async function listDiscussions(leadId: string): Promise<DiscussionItem[]> {
  const lead = await prisma.lead.findUnique({ where: { id: leadId }, select: { id: true } });
  if (!lead) throw notFound();
  const discussions = await prisma.discussion.findMany({
    where: { leadId },
    orderBy: { createdAt: "desc" },
  });
  return discussions.map(toDiscussionItem);
}

export async function addDiscussion(
  leadId: string,
  input: CreateDiscussionInput,
): Promise<{ discussion: DiscussionItem; lead: LeadListItem }> {
  const result = await prisma.$transaction(async (tx) => {
    const lead = await tx.lead.findUnique({ where: { id: leadId } });
    if (!lead) throw notFound();

    const discussion = await tx.discussion.create({
      data: { leadId, note: input.note },
    });

    // Follow-up rule (spec 4.2): an explicit followUpAt wins; otherwise a
    // due/overdue follow-up that was just acted on is cleared.
    let nextFollowUpAt: Date | null = lead.nextFollowUpAt;
    if (input.followUpAt) {
      nextFollowUpAt = new Date(input.followUpAt);
    } else if (lead.nextFollowUpAt && lead.nextFollowUpAt <= new Date()) {
      nextFollowUpAt = null;
    }

    const updated = await tx.lead.update({
      where: { id: leadId },
      data: { nextFollowUpAt },
      include: lastDiscussionInclude,
    });
    return { discussion, lead: updated };
  });

  return { discussion: toDiscussionItem(result.discussion), lead: toLeadListItem(result.lead) };
}
