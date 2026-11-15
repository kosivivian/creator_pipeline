# Creator Pipeline

Dashboard for Kosi's growth-partner outreach: find Nigerian Instagram creators with no digital
product, draft a one-promise e-book outline from their audience's questions, warm up, then pitch.

- **Today**: the daily tap list. Copy the draft, do it on Instagram, mark it done.
- **Pipeline**: creators per stage, agent health, who's ready to warm up, who replied.
- **Leads**: every creator with evidence, audit, audience comments, e-book and outreach history.
- **E-books**: outlines, plus Gemini image prompts and image uploads.

Stack: Next.js 16 on Vercel, Supabase (Postgres, auth, storage).

## Deploy

1. Import this repo in Vercel.
2. Add the two variables from `.env.example` in Vercel → Settings → Environment Variables.
3. In Supabase → Authentication → Users, **add your user** (email + password, auto-confirm).
4. In Supabase → Authentication → Sign In / Providers, **turn off "Allow new users to sign up"** so
   nobody else can create an account.

## The outreach sequence

| Day | Action | Created by |
|---|---|---|
| 0 | Follow + like 2 posts | `start_warmup()` |
| 1, 2, 3 | Comment 1, 2, 3 on the creator's 3 most recent posts | `start_warmup()` |
| 4 | Story reply (postponed a day at a time if they have no story) | `start_warmup()` |
| 5 | First DM | `start_warmup()` |
| DM + 3 | Follow-up 1 | `complete_action()` on the DM |
| F1 + 4 | Follow-up 2, then the creator is closed | `complete_action()` on follow-up 1 |

"They replied" (`mark_replied()`) stops everything and moves the creator to **Replied**.

## Data contract for the agents

All agents write to Supabase. n8n uses the **service-role key** (never put it in this app);
the Claude agent uses SQL through the Supabase connector. Both bypass row-level security.

**Finder (n8n + Apify)**: upserts into `creators` on `(platform, handle)`:
`full_name, profile_url, niche_id, followers, engagement_rate, bio, bio_link, link_type
(none|linkinbio|website|store), contact_email, location_signal, audit (8 booleans, keys below),
audit_passed, demand_score (distinct commenters asking to learn), evidence_summary,
sample_comments [{text, username, post_url}], recent_posts [{url, caption, comments, likes}],
top_question, est_launch_revenue` and `stage = 'qualified'` (or `'rejected'`).
Audit keys: `followers_in_range, real_engagement, contact_email, business_links,
no_digital_product, niche_fit, buying_power, posts_consistently`.
Logs each run in `agent_runs (agent='finder', status, items_in, items_out, notes)`.

**E-book builder (Claude)**: for each `qualified` creator with no ebook, inserts into `ebooks`:
`title, subtitle, audience, problem, promise, chapters [{title, summary}],
image_ideas [{placement, caption, gemini_prompt}], source_comments, suggested_price`.

**Outreach writer (Claude)**: fills `creators.outreach_drafts`
`{comments: [3], story_angle, dm, followup_1, followup_2}` (DM follows the 4-part framework:
hook, observation, opportunity, easy yes), then sets `stage = 'ready'`.

Kosi presses **Start warm-up**, which schedules the actions above with the drafts attached.

## Migrations

`supabase/migrations/` holds the schema, cadence functions, row-level security and storage
bucket. They're already applied to the `creator-pipeline` Supabase project.
