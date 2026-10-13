import { LeadStatus, prisma } from "@leadflow/db";

/**
 * Trivial typed import check so `bun run typecheck` proves the
 * apps/backend -> @leadflow/db wiring (no DB call at runtime).
 */
export const _dbWiringCheck: LeadStatus = LeadStatus.NEW;

void prisma;
