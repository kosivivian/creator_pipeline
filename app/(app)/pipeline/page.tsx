import Link from "next/link";
import { supabaseServer } from "@/lib/supabase-server";
import { AGENT_LABEL, FLOW, fmt } from "@/lib/labels";
import type { AgentRun, Creator, Stage } from "@/lib/types";
import { StartWarmupButton } from "@/components/StartWarmupButton";
import { ReviewButtons } from "@/components/ReviewButtons";

export const dynamic = "force-dynamic";

const AGENT_JOB = {
  finder: "Searches the niche hashtags, audits each creator and records the evidence.",
  ebook: "Turns each qualified creator's most-asked question into a one-promise e-book outline.",
  outreach: "Writes the 3 comments, story angle, DM and follow-ups for each creator.",
} as const;

export default async function Pipeline() {
  const supabase = await supabaseServer();
  const [{ data: counts }, { data: runs }, { data: ready }, { data: replied }, { data: review }] = await Promise.all([
    supabase.from("pipeline_counts").select("*"),
    supabase.from("agent_runs").select("*").order("started_at", { ascending: false }).limit(30),
    supabase.from("creators").select("*, niches(name)").eq("stage", "ready").order("demand_score", { ascending: false }).limit(20),
    supabase.from("creators").select("*, niches(name)").eq("stage", "replied").order("stage_changed_at", { ascending: false }).limit(10),
    supabase.from("creators").select("*, niches(name)").eq("stage", "needs_review").order("demand_score", { ascending: false }).limit(20),
  ]);

  const n = (s: Stage) => counts?.find((c) => c.stage === s)?.n ?? 0;
  const followed = n("followup_1") + n("followup_2");
  const latest = (agent: AgentRun["agent"]) => (runs as AgentRun[] | null)?.find((r) => r.agent === agent);

  return (
    <div className="space-y-10">
      <header>
        <h1>Pipeline</h1>
        <p className="text-muted mt-1">
          Every creator moves left to right. {n("closed_no_reply")} closed without a reply, {n("rejected")} rejected.
        </p>
      </header>

      <section aria-label="Creators at each stage">
        <ol className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-px bg-line border border-line rounded-2xl overflow-hidden">
          {FLOW.map((f, i) => {
            const v = f.stage === "followup_1" ? followed : n(f.stage);
            return (
              <li key={f.stage} className="bg-surface px-4 py-4 last:col-span-2 sm:last:col-span-2 lg:last:col-span-1">
                <Link href={`/leads?stage=${f.stage}`} className="block group">
                  <span className="text-muted text-sm">{i + 1}. {f.label}</span>
                  <span className={`block font-display text-[2rem] font-semibold tnum leading-none mt-2 ${f.stage === "replied" && v > 0 ? "text-green" : ""}`}>
                    {v}
                  </span>
                </Link>
              </li>
            );
          })}
        </ol>
      </section>

      <section>
        <h2 className="mb-3">Agents</h2>
        <ul className="divide-y divide-line border-y border-line">
          {(["finder", "ebook", "outreach"] as const).map((agent) => {
            const r = latest(agent);
            const tone = !r ? "text-muted" : r.status === "error" ? "text-red" : r.status === "running" ? "text-amber" : "text-green";
            return (
              <li key={agent} className="grid gap-1 py-4 sm:grid-cols-[180px_1fr_auto] sm:items-baseline sm:gap-6">
                <h3>{AGENT_LABEL[agent]}</h3>
                <p className="text-muted text-sm">
                  {r?.notes ? r.notes : AGENT_JOB[agent]}
                </p>
                <p className={`text-sm font-semibold ${tone}`}>
                  {!r ? "Hasn't run yet" : r.status === "error" ? `Failed ${fmt.ago(r.started_at)}` : r.status === "running" ? "Running now" : `${r.items_out ?? 0} out, ${fmt.ago(r.finished_at ?? r.started_at)}`}
                </p>
              </li>
            );
          })}
        </ul>
      </section>

      {(review ?? []).length > 0 && (
        <section>
          <div className="flex items-baseline justify-between mb-3">
            <h2>Needs your review</h2>
            <span className="text-muted text-sm">{n("needs_review")} waiting</span>
          </div>
          <p className="text-muted text-sm mb-3 max-w-[68ch]">
            These passed the checks, but something needs a human look first. Nothing happens to them until you approve.
          </p>
          <ul className="divide-y divide-line border-y border-line">
            {(review as Creator[]).map((c) => (
              <li key={c.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div className="max-w-[60ch]">
                  <Link href={`/leads/${c.id}`} className="font-semibold hover:underline">@{c.handle}</Link>
                  <p className="text-muted text-sm">
                    {fmt.num(c.followers)} followers, {c.demand_score} asking to learn
                  </p>
                  <p className="text-amber text-sm">{(c.review_reasons ?? []).join("; ")}</p>
                </div>
                <ReviewButtons creatorId={c.id} />
              </li>
            ))}
          </ul>
        </section>
      )}

      <section>
        <div className="flex items-baseline justify-between mb-3">
          <h2>Ready to warm up</h2>
          <span className="text-muted text-sm">{n("ready")} waiting</span>
        </div>
        {(ready ?? []).length === 0 ? (
          <p className="text-muted">No one's ready yet. A creator lands here once their e-book outline and outreach drafts exist.</p>
        ) : (
          <ul className="divide-y divide-line border-y border-line">
            {(ready as Creator[]).map((c) => (
              <li key={c.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div>
                  <Link href={`/leads/${c.id}`} className="font-semibold hover:underline">@{c.handle}</Link>
                  <p className="text-muted text-sm">
                    {c.niches?.name}, {fmt.num(c.followers)} followers, {c.demand_score} people asking to learn
                  </p>
                </div>
                <StartWarmupButton creatorId={c.id} />
              </li>
            ))}
          </ul>
        )}
      </section>

      {(replied ?? []).length > 0 && (
        <section>
          <h2 className="mb-3">Replied, over to you</h2>
          <ul className="divide-y divide-line border-y border-line">
            {(replied as Creator[]).map((c) => (
              <li key={c.id} className="py-3">
                <Link href={`/leads/${c.id}`} className="font-semibold hover:underline">@{c.handle}</Link>
                <span className="text-muted text-sm"> replied {fmt.ago(c.stage_changed_at)}</span>
                {c.reply_notes && <p className="text-sm mt-1">{c.reply_notes}</p>}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
