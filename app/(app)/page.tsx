import Link from "next/link";
import { supabaseServer } from "@/lib/supabase-server";
import { lagosToday } from "@/lib/labels";
import type { Action } from "@/lib/types";
import { ActionRow } from "@/components/ActionRow";

export const dynamic = "force-dynamic";

export default async function Today() {
  const supabase = await supabaseServer();
  const today = lagosToday();
  const { data, error } = await supabase
    .from("actions")
    .select("*, creators(handle, full_name, stage, followers, niches(name))")
    .eq("status", "pending")
    .lte("due_date", today)
    .order("due_date")
    .order("created_at");
  const actions = (data ?? []) as Action[];

  // group by creator, keep the order of their earliest action
  const groups = new Map<string, Action[]>();
  for (const a of actions) groups.set(a.creator_id, [...(groups.get(a.creator_id) ?? []), a]);

  const dateLabel = new Date().toLocaleDateString("en-GB", {
    weekday: "long", day: "numeric", month: "long", timeZone: "Africa/Lagos",
  });

  return (
    <div>
      <header className="mb-7">
        <h1>Today, {dateLabel}</h1>
        <p className="text-muted mt-1">
          {actions.length === 0
            ? "Nothing due."
            : `${actions.length} ${actions.length === 1 ? "action" : "actions"} across ${groups.size} ${groups.size === 1 ? "creator" : "creators"}. Copy the draft, do it on Instagram, then mark it done.`}
        </p>
      </header>

      {error && <p role="alert" className="text-red">Couldn't load today's actions: {error.message}</p>}

      {actions.length === 0 && !error && (
        <div className="rounded-2xl border border-dashed border-line px-6 py-10 max-w-xl">
          <h2>You're clear for today</h2>
          <p className="text-muted mt-2">
            New actions appear here once you start warming up a creator. Pick someone who's ready from the{" "}
            <Link href="/pipeline" className="text-green font-semibold underline underline-offset-2">pipeline</Link>.
          </p>
        </div>
      )}

      <div className="space-y-6">
        {[...groups.entries()].map(([creatorId, list]) => {
          const c = list[0].creators;
          return (
            <section key={creatorId} className="rounded-2xl bg-surface border border-line overflow-hidden">
              <header className="flex flex-wrap items-baseline justify-between gap-2 px-5 pt-4 pb-3 border-b border-line">
                <Link href={`/leads/${creatorId}`} className="font-display text-[1.1rem] font-semibold hover:underline">
                  @{c?.handle}
                </Link>
                <span className="text-muted text-sm">{c?.niches?.name}</span>
              </header>
              <ul className="divide-y divide-line">
                {list.map((a) => (
                  <ActionRow key={a.id} action={a} overdue={a.due_date < today} />
                ))}
              </ul>
            </section>
          );
        })}
      </div>
    </div>
  );
}
