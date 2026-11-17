import Link from "next/link";
import { notFound } from "next/navigation";
import { supabaseServer } from "@/lib/supabase-server";
import { AUDIT_LABELS, STAGE_LABEL, actionLabel, fmt } from "@/lib/labels";
import type { Action, Creator, Ebook } from "@/lib/types";
import { StartWarmupButton } from "@/components/StartWarmupButton";
import { LeadControls } from "@/components/LeadControls";

export const dynamic = "force-dynamic";

export default async function Lead(props: PageProps<"/leads/[id]">) {
  const { id } = await props.params;
  const supabase = await supabaseServer();
  const [{ data: c }, { data: ebooks }, { data: actions }] = await Promise.all([
    supabase.from("creators").select("*, niches(name)").eq("id", id).maybeSingle(),
    supabase.from("ebooks").select("*").eq("creator_id", id).order("created_at", { ascending: false }),
    supabase.from("actions").select("*").eq("creator_id", id).order("due_date").order("created_at"),
  ]);
  if (!c) notFound();
  const creator = c as Creator;
  const ebook = (ebooks as Ebook[] | null)?.[0];
  const audit = Object.entries(AUDIT_LABELS);

  return (
    <div className="space-y-9">
      <header>
        <Link href="/leads" className="text-muted text-sm hover:text-ink">Leads</Link>
        <div className="flex flex-wrap items-end justify-between gap-4 mt-1">
          <div>
            <h1>@{creator.handle}</h1>
            <p className="text-muted mt-1">
              {[creator.full_name, creator.niches?.name, `${fmt.num(creator.followers)} followers`,
                creator.engagement_rate != null && `${creator.engagement_rate}% engagement`]
                .filter(Boolean).join(", ")}
            </p>
          </div>
          <div className="flex flex-wrap gap-2 items-center">
            <span className="rounded-full bg-green-tint text-green-deep px-3 py-1 text-sm font-semibold">{STAGE_LABEL[creator.stage]}</span>
            {creator.profile_url && <a href={creator.profile_url} target="_blank" rel="noopener" className="btn">Open on Instagram</a>}
            {creator.stage === "ready" && <StartWarmupButton creatorId={creator.id} />}
          </div>
        </div>
      </header>

      <section className="grid gap-8 lg:grid-cols-[1.4fr_1fr]">
        <div>
          <h2 className="mb-2">Why they're a lead</h2>
          <p className="max-w-[68ch]">{creator.evidence_summary ?? "The Finder hasn't written evidence for this creator yet."}</p>
          <dl className="grid grid-cols-2 gap-4 mt-5 max-w-md">
            <div>
              <dt className="text-muted text-sm">People asking to learn</dt>
              <dd className="font-display text-[1.6rem] font-semibold tnum">{creator.demand_score}</dd>
            </div>
            <div>
              <dt className="text-muted text-sm">Launch estimate</dt>
              <dd className="font-display text-[1.6rem] font-semibold tnum">{fmt.usd(creator.est_launch_revenue)}</dd>
            </div>
          </dl>
          {creator.stage === "needs_review" && (creator.review_reasons ?? []).length > 0 && (
            <div className="mt-4 rounded-xl bg-amber-tint px-4 py-3 max-w-[68ch]">
              <p className="font-semibold text-amber">Check before approving</p>
              <ul className="text-sm mt-1 list-disc pl-5">
                {creator.review_reasons.map((r) => <li key={r}>{r}</li>)}
              </ul>
            </div>
          )}
          {creator.top_question && (
            <p className="mt-4 text-sm"><span className="font-semibold">Most-asked question:</span> {creator.top_question}</p>
          )}
          {creator.location_signal && (
            <p className="mt-1 text-sm text-muted">Nigerian signal: {creator.location_signal}</p>
          )}
          {creator.bio && <p className="mt-4 text-sm text-muted whitespace-pre-wrap max-w-[60ch]">Bio: {creator.bio}</p>}
        </div>
        <div>
          <h2 className="mb-2">Audit</h2>
          <ul className="space-y-1.5">
            {audit.map(([key, label]) => {
              const v = creator.audit?.[key];
              return (
                <li key={key} className="flex gap-2.5 text-sm">
                  <span aria-hidden className={`font-bold w-4 ${v === true ? "text-green" : v === false ? "text-red" : "text-muted"}`}>
                    {v === true ? "✓" : v === false ? "✗" : "?"}
                  </span>
                  <span>
                    {label}
                    <span className="sr-only">: {v === true ? "yes" : v === false ? "no" : "unknown"}</span>
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      </section>

      {creator.sample_comments?.length > 0 && (
        <section>
          <h2 className="mb-3">What their audience is asking</h2>
          <ul className="grid gap-3 sm:grid-cols-2">
            {creator.sample_comments.map((cm, i) => (
              <li key={i} className="rounded-xl bg-surface border border-line px-4 py-3">
                <p>“{cm.text}”</p>
                <p className="text-muted text-sm mt-1">
                  {cm.username ? `@${cm.username}` : "Commenter"}
                  {cm.post_url && <> on <a href={cm.post_url} target="_blank" rel="noopener" className="underline">this post</a></>}
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section>
        <div className="flex items-baseline justify-between mb-2">
          <h2>E-book outline</h2>
          {ebook && <Link href={`/ebooks/${ebook.id}`} className="text-green font-semibold text-sm hover:underline">Open outline and images</Link>}
        </div>
        {ebook ? (
          <div>
            <h3 className="text-[1.1rem]">{ebook.title}</h3>
            {ebook.promise && <p className="mt-1 max-w-[68ch]">{ebook.promise}</p>}
            <p className="text-muted text-sm mt-1">{ebook.chapters.length} chapters, {ebook.image_ideas.length} images planned</p>
          </div>
        ) : (
          <p className="text-muted">The e-book builder hasn't drafted one yet.</p>
        )}
      </section>

      <section>
        <h2 className="mb-3">Outreach</h2>
        {(actions ?? []).length === 0 ? (
          <p className="text-muted">Not started.</p>
        ) : (
          <ol className="border-l-2 border-line ml-1.5 space-y-4">
            {(actions as Action[]).map((a) => (
              <li key={a.id} className="relative pl-5">
                <span
                  aria-hidden
                  className={`absolute -left-[7px] top-1.5 h-3 w-3 rounded-full border-2 ${
                    a.status === "done" ? "bg-green border-green" : a.status === "skipped" ? "bg-line border-line" : "bg-paper border-muted"
                  }`}
                />
                <p className="font-semibold">
                  {actionLabel(a.type, a.seq)}
                  <span className="text-muted font-normal text-sm">
                    {" "}{a.status === "done" ? `done ${fmt.date(a.done_at!)}` : a.status === "skipped" ? "skipped" : `due ${fmt.date(a.due_date)}`}
                  </span>
                </p>
                {a.draft && <p className="text-sm text-muted mt-0.5 max-w-[68ch] whitespace-pre-wrap">{a.draft}</p>}
              </li>
            ))}
          </ol>
        )}
      </section>

      {creator.reply_notes && (
        <section>
          <h2 className="mb-2">Their reply</h2>
          <p className="max-w-[68ch]">{creator.reply_notes}</p>
        </section>
      )}

      <LeadControls creatorId={creator.id} stage={creator.stage} />
    </div>
  );
}
