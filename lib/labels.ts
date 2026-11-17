import type { ActionType, Stage } from "./types";

// The outreach sequence, in order. Closed/rejected sit outside it.
export const FLOW: { stage: Stage; label: string }[] = [
  { stage: "found", label: "Found" },
  { stage: "qualified", label: "Qualified" },
  { stage: "ready", label: "Ready" },
  { stage: "warming", label: "Warming up" },
  { stage: "dm_sent", label: "DM sent" },
  { stage: "followup_1", label: "Followed up" },
  { stage: "replied", label: "Replied" },
];

export const STAGE_LABEL: Record<Stage, string> = {
  found: "Found",
  needs_review: "Needs review",
  qualified: "Qualified",
  ready: "Ready to warm up",
  warming: "Warming up",
  dm_sent: "DM sent",
  followup_1: "Follow-up 1 sent",
  followup_2: "Follow-up 2 sent",
  replied: "Replied",
  closed_no_reply: "Closed, no reply",
  rejected: "Rejected",
};

export function actionLabel(type: ActionType, seq: number) {
  switch (type) {
    case "follow_like": return "Follow and like 2 posts";
    case "comment": return `Comment ${seq} of 3`;
    case "story_reply": return "Reply to their story";
    case "dm": return "Send the first DM";
    case "followup_1": return "Send follow-up 1";
    case "followup_2": return "Send the last follow-up";
  }
}

export function actionButton(type: ActionType) {
  switch (type) {
    case "follow_like": return "Open profile";
    case "comment": return "Copy and open post";
    case "story_reply": return "Open stories";
    default: return "Copy and open profile";
  }
}

export const AUDIT_LABELS: Record<string, string> = {
  followers_in_range: "10k to 100k followers",
  real_engagement: "Comments are thoughtful, not just emojis",
  contact_email: "Contact email in bio",
  business_links: "Linktree or website with contact links",
  no_digital_product: "No existing digital product",
  niche_fit: "Niche matches what we target",
  buying_power: "Audience looks able to buy",
  posts_consistently: "Posts consistently",
};

export const AGENT_LABEL = { finder: "Finder", ebook: "E-book builder", outreach: "Outreach writer" } as const;

export const fmt = {
  num: (n: number | null | undefined) =>
    n == null ? "–" : n >= 1000 ? `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k` : String(n),
  usd: (n: number | null | undefined) =>
    n == null ? "–" : `$${Math.round(n).toLocaleString("en-US")}`,
  date: (s: string) =>
    new Date(s).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "Africa/Lagos" }),
  ago: (s: string | null) => {
    if (!s) return "never";
    const mins = Math.round((Date.now() - new Date(s).getTime()) / 60000);
    if (mins < 60) return `${mins}m ago`;
    const h = Math.round(mins / 60);
    if (h < 48) return `${h}h ago`;
    return `${Math.round(h / 24)}d ago`;
  },
};

// Today's date in Lagos, as YYYY-MM-DD
export function lagosToday() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Lagos" }).format(new Date());
}
