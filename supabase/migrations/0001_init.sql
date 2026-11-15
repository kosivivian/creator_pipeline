-- Creator Pipeline: core schema
create type creator_stage as enum (
  'found',          -- Finder saw them, not yet audited
  'qualified',      -- passed audit, has evidence; waiting for ebook + drafts
  'ready',          -- ebook outline + drafts done; ready to start warm-up
  'warming',        -- follow / comments / story reply in progress
  'dm_sent',
  'followup_1',
  'followup_2',
  'replied',        -- handed off to Kosi
  'closed_no_reply',
  'rejected'        -- failed audit or manually dropped
);

create type action_type as enum (
  'follow_like', 'comment', 'story_reply', 'dm', 'followup_1', 'followup_2'
);

create type action_status as enum ('pending', 'done', 'skipped');

create table niches (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  hashtags text[] not null default '{}',
  demand_keywords text[] not null default '{}',
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table creators (
  id uuid primary key default gen_random_uuid(),
  platform text not null default 'instagram',
  handle text not null,
  full_name text,
  profile_url text,
  niche_id uuid references niches(id),
  followers integer,
  avg_likes numeric,
  avg_comments numeric,
  engagement_rate numeric,           -- percent, e.g. 4.2
  bio text,
  bio_link text,
  link_type text,                    -- none | linkinbio | website | store
  contact_email text,
  location_signal text,              -- why we think they're Nigerian
  audit jsonb not null default '{}', -- 8 workbook checks: {followers_in_range: true, ...}
  audit_passed boolean,
  demand_score integer not null default 0,   -- distinct commenters asking to learn
  evidence_summary text,             -- why this person is a lead
  sample_comments jsonb not null default '[]', -- [{text, username, post_url}]
  recent_posts jsonb not null default '[]',    -- [{url, caption, comments, likes, posted_at}]
  top_question text,                 -- most-asked question -> ebook topic
  outreach_drafts jsonb not null default '{}', -- {comments:[3], story_angle, dm, followup_1, followup_2}
  est_launch_revenue numeric,        -- workbook calculator, USD
  stage creator_stage not null default 'found',
  stage_changed_at timestamptz not null default now(),
  reply_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (platform, handle)
);
create index creators_stage_idx on creators(stage);
create index creators_niche_idx on creators(niche_id);

create table ebooks (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references creators(id) on delete cascade,
  title text not null,
  subtitle text,
  audience text,          -- who it's for
  problem text,           -- the one problem
  promise text,           -- the one promise
  chapters jsonb not null default '[]',   -- [{title, summary}]
  image_ideas jsonb not null default '[]',
  source_comments jsonb not null default '[]',
  suggested_price text,
  design_url text,        -- Canva link once designed
  status text not null default 'draft',   -- draft | approved | designed
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index ebooks_creator_idx on ebooks(creator_id);

create table actions (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references creators(id) on delete cascade,
  type action_type not null,
  seq integer not null default 1,     -- comment 1/2/3
  due_date date not null,
  status action_status not null default 'pending',
  target_url text,                    -- post to comment on / profile
  draft text,                         -- comment / DM / follow-up text
  guidance text,                      -- e.g. story reply angle
  done_at timestamptz,
  created_at timestamptz not null default now()
);
create index actions_due_idx on actions(status, due_date);
create index actions_creator_idx on actions(creator_id);

create table agent_runs (
  id uuid primary key default gen_random_uuid(),
  agent text not null check (agent in ('finder','ebook','outreach')),
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  status text not null default 'running',  -- running | success | error
  items_in integer default 0,
  items_out integer default 0,
  cost_usd numeric,
  notes text
);
create index agent_runs_agent_idx on agent_runs(agent, started_at desc);

-- updated_at triggers
create or replace function touch_updated_at() returns trigger
language plpgsql set search_path = public as $$
begin new.updated_at = now(); return new; end $$;
create trigger creators_touch before update on creators for each row execute function touch_updated_at();
create trigger ebooks_touch before update on ebooks for each row execute function touch_updated_at();

create or replace function track_stage_change() returns trigger
language plpgsql set search_path = public as $$
begin
  if new.stage is distinct from old.stage then new.stage_changed_at = now(); end if;
  return new;
end $$;
create trigger creators_stage before update on creators for each row execute function track_stage_change();
