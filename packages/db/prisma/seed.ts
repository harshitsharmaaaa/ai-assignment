import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { LeadStatus, prisma } from "../src/index.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// `prisma db seed` runs with CWD = packages/db; the root .env is the source of truth.
dotenv.config({ path: path.resolve(__dirname, "../../.env") });
dotenv.config();

const HOUR = 3_600_000;
const DAY = 24 * HOUR;

function hoursFromNow(h: number, base: number): Date {
  return new Date(base + h * HOUR);
}

type SeedDiscussion = { note: string; createdAt: Date };
type SeedLead = {
  name: string;
  company: string | null;
  phone: string | null;
  status: LeadStatus;
  nextFollowUpAt: Date | null;
  purpose: string;
  discussions: SeedDiscussion[];
};

function buildLeads(now: number): SeedLead[] {
  return [
    {
      name: "Aarav Mehta",
      company: "Northwind Traders",
      phone: "+91 98200 12345",
      status: LeadStatus.CONTACTED,
      nextFollowUpAt: hoursFromNow(3, now),
      purpose: "pinned (due later today)",
      discussions: [
        {
          note: "Cold call answered. Aarav asked for a callback after his standup; interested in the reporting module.",
          createdAt: hoursFromNow(-50, now),
        },
        {
          note: "Sent the one-pager and pricing link over email. He confirmed receipt.",
          createdAt: hoursFromNow(-26, now),
        },
        {
          note: "Quick check-in: he wants a 20-min demo for his team tomorrow. Promised to call back this afternoon.",
          createdAt: hoursFromNow(-4, now),
        },
      ],
    },
    {
      name: "Sofia Almeida",
      company: "Acme Retail Group",
      phone: "+1 (415) 555-0132",
      status: LeadStatus.QUALIFIED,
      nextFollowUpAt: hoursFromNow(-2, now),
      purpose: "pinned AND overdue (due earlier today)",
      discussions: [
        {
          note: "Discovery call done. 40 stores, currently on spreadsheets. Budget approved for Q4.",
          createdAt: hoursFromNow(-96, now),
        },
        {
          note: "Shared the integration checklist with their ops lead. Waiting on their POS vendor name.",
          createdAt: hoursFromNow(-30, now),
        },
        {
          note: "Sofia missed our morning call — phone went to voicemail. Trying again this afternoon.",
          createdAt: hoursFromNow(-3, now),
        },
      ],
    },
    {
      name: "Ravi Chandran",
      company: "Harbor Logistics",
      phone: "+91 98410 77881",
      status: LeadStatus.PROPOSAL_SENT,
      nextFollowUpAt: hoursFromNow(-72, now),
      purpose: "overdue in the main list (red)",
      discussions: [
        {
          note: "Site visit at the warehouse. Mapped their dispatch workflow end to end.",
          createdAt: hoursFromNow(-140, now),
        },
        {
          note: "Proposal v1 sent: 3-year plan with onboarding. Ravi said the commercials look workable.",
          createdAt: hoursFromNow(-100, now),
        },
        {
          note: "Followed up twice; procurement is slow. Ravi asked for one week to get sign-off.",
          createdAt: hoursFromNow(-75, now),
        },
        {
          note: "Still no sign-off. Escalated to his director over email.",
          createdAt: hoursFromNow(-50, now),
        },
      ],
    },
    {
      name: "Elena Petrova",
      company: "Brightline Studios",
      phone: "+44 20 7946 0812",
      status: LeadStatus.NEW,
      nextFollowUpAt: hoursFromNow(26, now),
      purpose: "future follow-up, not pinned",
      discussions: [
        {
          note: "Inbound demo request from the website. Left a voicemail and sent an intro email.",
          createdAt: hoursFromNow(-20, now),
        },
        {
          note: "Elena replied — wants to talk tomorrow about team seats and billing.",
          createdAt: hoursFromNow(-6, now),
        },
      ],
    },
    {
      name: "Daniel Okafor",
      company: "Savanna Foods",
      phone: "+234 803 555 0192",
      status: LeadStatus.WON,
      nextFollowUpAt: null,
      purpose: "closed won",
      discussions: [
        {
          note: "Intro call with Daniel and their CFO. Strong fit for the inventory module.",
          createdAt: hoursFromNow(-200, now),
        },
        {
          note: "Pilot with two outlets went smoothly — stock-outs down in week one.",
          createdAt: hoursFromNow(-150, now),
        },
        {
          note: "Contract signed for all 12 outlets. Handed over to onboarding.",
          createdAt: hoursFromNow(-120, now),
        },
        {
          note: "Welcome call done. Daniel is happy; asked about the loyalty add-on for next quarter.",
          createdAt: hoursFromNow(-100, now),
        },
        {
          note: "Quarterly check-in scheduled. Reference-customer paperwork sent.",
          createdAt: hoursFromNow(-60, now),
        },
      ],
    },
    {
      name: "Mei Lin",
      company: "Copperline Manufacturing",
      phone: "+65 8123 4567",
      status: LeadStatus.LOST,
      nextFollowUpAt: hoursFromNow(-240, now),
      purpose: "old follow-up on a closed lead: never pins, never red",
      discussions: [
        {
          note: "Factory tour and requirements gathering with Mei and plant head.",
          createdAt: hoursFromNow(-300, now),
        },
        {
          note: "Quote sent. They are comparing us against their incumbent vendor.",
          createdAt: hoursFromNow(-260, now),
        },
        {
          note: "Lost: renewed with incumbent for two years. Asked us to reconnect at renewal time.",
          createdAt: hoursFromNow(-245, now),
        },
      ],
    },
    {
      name: "Jonas Weber",
      company: null,
      phone: null,
      status: LeadStatus.NEW,
      nextFollowUpAt: null,
      purpose: "zero discussions (empty timeline state)",
      discussions: [],
    },
  ];
}

async function main(): Promise<void> {
  const now = Date.now();

  // Idempotent: wipe first, then insert.
  await prisma.discussion.deleteMany();
  await prisma.lead.deleteMany();

  const leads = buildLeads(now);
  for (const lead of leads) {
    await prisma.lead.create({
      data: {
        name: lead.name,
        company: lead.company,
        phone: lead.phone,
        status: lead.status,
        nextFollowUpAt: lead.nextFollowUpAt,
        discussions: {
          create: lead.discussions.map((d) => ({ note: d.note, createdAt: d.createdAt })),
        },
      },
    });
  }

  const discussionCount = leads.reduce((n, l) => n + l.discussions.length, 0);
  console.log(`Seeded ${leads.length} leads with ${discussionCount} discussions:`);
  for (const lead of leads) {
    console.log(
      ` - ${lead.name} [${lead.status}] followUp=${lead.nextFollowUpAt?.toISOString() ?? "none"} notes=${lead.discussions.length} (${lead.purpose})`,
    );
  }
}

void main()
  .catch((e: unknown) => {
    console.error("Seed failed:", e);
    process.exitCode = 1;
  })
  .finally(() => void prisma.$disconnect());
