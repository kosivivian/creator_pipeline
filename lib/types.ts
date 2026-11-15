export type Stage =
  | "found" | "qualified" | "ready" | "warming" | "dm_sent"
  | "followup_1" | "followup_2" | "replied" | "closed_no_reply" | "rejected";
export type ActionType = "follow_like" | "comment" | "story_reply" | "dm" | "followup_1" | "followup_2";
export type ActionStatus = "pending" | "done" | "skipped";

export type Niche = { id: string; name: string; hashtags: string[]; active: boolean };

export type Comment = { text: string; username?: string; post_url?: string };
export type Post = { url: string; caption?: string; comments?: number; likes?: number; posted_at?: string };

export type Creator = {
  id: string;
  platform: string;
  handle: string;
  full_name: string | null;
  profile_url: string | null;
  niche_id: string | null;
  followers: number | null;
  engagement_rate: number | null;
  bio: string | null;
  bio_link: string | null;
  link_type: string | null;
  contact_email: string | null;
  location_signal: string | null;
  audit: Record<string, boolean>;
  audit_passed: boolean | null;
  demand_score: number;
  evidence_summary: string | null;
  sample_comments: Comment[];
  recent_posts: Post[];
  top_question: string | null;
  est_launch_revenue: number | null;
  stage: Stage;
  stage_changed_at: string;
  reply_notes: string | null;
  created_at: string;
  niches?: { name: string } | null;
};

export type Action = {
  id: string;
  creator_id: string;
  type: ActionType;
  seq: number;
  due_date: string;
  status: ActionStatus;
  target_url: string | null;
  draft: string | null;
  guidance: string | null;
  done_at: string | null;
  creators?: Pick<Creator, "handle" | "full_name" | "stage" | "followers"> & { niches?: { name: string } | null };
};

export type ImageIdea = { placement?: string; caption?: string; gemini_prompt?: string; image_url?: string };
export type Chapter = { title: string; summary?: string };

export type Ebook = {
  id: string;
  creator_id: string;
  title: string;
  subtitle: string | null;
  audience: string | null;
  problem: string | null;
  promise: string | null;
  chapters: Chapter[];
  image_ideas: ImageIdea[];
  source_comments: Comment[];
  suggested_price: string | null;
  design_url: string | null;
  status: string;
  created_at: string;
  creators?: Pick<Creator, "handle" | "full_name"> | null;
};

export type AgentRun = {
  id: string;
  agent: "finder" | "ebook" | "outreach";
  started_at: string;
  finished_at: string | null;
  status: string;
  items_in: number | null;
  items_out: number | null;
  notes: string | null;
};
