import Link from "next/link";
import { supabaseServer } from "@/lib/supabase-server";
import { STAGE_LABEL, fmt } from "@/lib/labels";
import type { Creator, Niche, Stage } from "@/lib/types";

export const dynamic = "force-dynamic";

const FILTERS: { key: string; label: string; stages: Stage[] }[] = [
  { key: "all", label: "All", stages: [] },
  { key: "qualified", label: "Qualified", stages: ["qualified"] },
  { key: "ready", label: "Ready", stages: ["ready"] },
  { key: "warming", label: "Warming up", stages: ["warming"] },
  { key: "dm_sent", label: "Messaged", stages: ["dm_sent", "followup_1", "followup_2"] },
  { key: "replied", label: "Replied", stages: ["replied"] },
  { key: "closed", label: "Closed", stages: ["closed_no_reply", "rejected"] },
];

export default async function Leads(props: PageProps<"/leads">) {
  const sp = await props.searchParams;
  const stageKey = typeof sp.stage === "string" ? sp.stage : "all";
  const nicheId = typeof sp.niche === "string" ? sp.niche : "";
  const filter = FILTERS.find((f) => f.key === stageKey) ?? (stageKey === "found" ? { key: "found", label: "Found", stages: ["found" as Stage] } : stageKey === "followup_1" ? FILTERS[4] : FILTERS[0]);

  const supabase = await supabaseServer();
  let q = supabase.from("creators").select("*, niches(name)").order("demand_score", { ascending: false }).limit(500);
  if (filter.stages.length) q = q.in("stage", filter.stages);
  if (nicheId) q = q.eq("niche_id", nicheId);
  const [{ data }, { data: niches }] = await Promise.all([q, supabase.from("niches").select("*").order("name")]);
  const creators = (data ?? []) as Creator[];

  const href = (stage: string, niche = nicheId) =>
    `/leads?${new URLSearchParams({ ...(stage !== "all" && { stage }), ...(niche && { niche }) })}`;

  return (
    <div>
      <header className="mb-6">
        <h1>Leads</h1>
        <p className="text-muted mt-1">Sorted by how many people are asking to learn from them.</p>
      </header>

      <div className="flex flex-wrap items-center gap-2 mb-3">
        {FILTERS.map((f) => (
          <Link
            key={f.key}
            href={href(f.key)}
            aria-current={filter.key === f.key ? "page" : undefined}
            className={`rounded-full px-3 py-1.5 text-sm font-semibold border ${
              filter.key === f.key ? "bg-ink text-paper border-ink" : "border-line text-muted hover:text-ink"
            }`}
          >
            {f.label}
          </Link>
        ))}
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 mb-6 text-sm">
        <Link href={href(filter.key, "")} className={!nicheId ? "font-semibold" : "text-muted hover:text-ink"}>Every niche</Link>
        {(niches as Niche[] | null)?.map((n) => (
          <Link key={n.id} href={href(filter.key, n.id)} className={nicheId === n.id ? "font-semibold" : "text-muted hover:text-ink"}>
            {n.name}
          </Link>
        ))}
      </div>

      {creators.length === 0 ? (
        <p className="text-muted">No creators here yet. The Finder adds them after each run.</p>
      ) : (
        <div className="overflow-x-auto border-y border-line">
          <table className="w-full text-left min-w-[640px]">
            <thead className="text-muted text-sm">
              <tr className="border-b border-line">
                <th className="py-2.5 pr-4 font-semibold">Creator</th>
                <th className="py-2.5 pr-4 font-semibold">Niche</th>
                <th className="py-2.5 pr-4 font-semibold text-right">Followers</th>
                <th className="py-2.5 pr-4 font-semibold text-right">Asking to learn</th>
                <th className="py-2.5 pr-4 font-semibold text-right">Launch estimate</th>
                <th className="py-2.5 font-semibold">Stage</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {creators.map((c) => (
                <tr key={c.id} className="hover:bg-surface">
                  <td className="py-3 pr-4">
                    <Link href={`/leads/${c.id}`} className="font-semibold hover:underline">@{c.handle}</Link>
                    {c.full_name && <div className="text-muted text-sm">{c.full_name}</div>}
                  </td>
                  <td className="py-3 pr-4 text-sm">{c.niches?.name ?? "–"}</td>
                  <td className="py-3 pr-4 text-right tnum">{fmt.num(c.followers)}</td>
                  <td className="py-3 pr-4 text-right tnum font-semibold">{c.demand_score}</td>
                  <td className="py-3 pr-4 text-right tnum">{fmt.usd(c.est_launch_revenue)}</td>
                  <td className="py-3 text-sm">{STAGE_LABEL[c.stage]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
