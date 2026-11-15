import Link from "next/link";
import { supabaseServer } from "@/lib/supabase-server";
import { fmt } from "@/lib/labels";
import type { Ebook } from "@/lib/types";

export const dynamic = "force-dynamic";

const STATUS = { draft: "Draft", approved: "Approved", designed: "Designed" } as Record<string, string>;

export default async function Ebooks() {
  const supabase = await supabaseServer();
  const { data } = await supabase
    .from("ebooks")
    .select("*, creators(handle, full_name)")
    .order("created_at", { ascending: false })
    .limit(200);
  const ebooks = (data ?? []) as Ebook[];

  return (
    <div>
      <header className="mb-6">
        <h1>E-books</h1>
        <p className="text-muted mt-1">One problem, one promise, built from what each creator's audience keeps asking.</p>
      </header>
      {ebooks.length === 0 ? (
        <p className="text-muted">No outlines yet. The e-book builder drafts one for every qualified creator.</p>
      ) : (
        <ul className="divide-y divide-line border-y border-line">
          {ebooks.map((e) => {
            const done = e.image_ideas.filter((i) => i.image_url).length;
            return (
              <li key={e.id} className="py-4 grid gap-1 sm:grid-cols-[1fr_auto] sm:gap-6">
                <div>
                  <Link href={`/ebooks/${e.id}`} className="font-display text-[1.1rem] font-semibold hover:underline">{e.title}</Link>
                  <p className="text-muted text-sm">
                    For @{e.creators?.handle}, {e.chapters.length} chapters, {done} of {e.image_ideas.length} images ready
                  </p>
                </div>
                <p className="text-sm sm:text-right">
                  <span className="font-semibold">{STATUS[e.status] ?? e.status}</span>
                  <span className="text-muted"> since {fmt.date(e.created_at)}</span>
                </p>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
