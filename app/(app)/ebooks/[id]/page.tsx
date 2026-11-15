import Link from "next/link";
import { notFound } from "next/navigation";
import { supabaseServer } from "@/lib/supabase-server";
import type { Ebook } from "@/lib/types";
import { ImageSlot } from "@/components/ImageSlot";
import { EbookStatus } from "@/components/EbookStatus";

export const dynamic = "force-dynamic";

export default async function EbookPage(props: PageProps<"/ebooks/[id]">) {
  const { id } = await props.params;
  const supabase = await supabaseServer();
  const { data } = await supabase.from("ebooks").select("*, creators(handle, full_name)").eq("id", id).maybeSingle();
  if (!data) notFound();
  const e = data as Ebook;

  return (
    <div className="space-y-9">
      <header>
        <Link href={`/leads/${e.creator_id}`} className="text-muted text-sm hover:text-ink">@{e.creators?.handle}</Link>
        <h1 className="mt-1 max-w-[30ch]">{e.title}</h1>
        {e.subtitle && <p className="text-muted mt-1 text-[1.05rem] max-w-[60ch]">{e.subtitle}</p>}
        <div className="mt-4"><EbookStatus ebookId={e.id} status={e.status} /></div>
      </header>

      <section className="grid gap-6 sm:grid-cols-3 max-w-4xl">
        <div><h3 className="text-muted text-sm font-semibold">Who it's for</h3><p className="mt-1">{e.audience ?? "–"}</p></div>
        <div><h3 className="text-muted text-sm font-semibold">The one problem</h3><p className="mt-1">{e.problem ?? "–"}</p></div>
        <div><h3 className="text-muted text-sm font-semibold">The one promise</h3><p className="mt-1">{e.promise ?? "–"}</p></div>
      </section>
      {e.suggested_price && <p className="text-sm"><span className="font-semibold">Suggested price:</span> {e.suggested_price}</p>}

      <section>
        <h2 className="mb-3">Chapters</h2>
        <ol className="space-y-3 max-w-[70ch]">
          {e.chapters.map((ch, i) => (
            <li key={i} className="grid grid-cols-[2rem_1fr]">
              <span className="font-display font-semibold text-muted tnum">{i + 1}</span>
              <div>
                <h3>{ch.title}</h3>
                {ch.summary && <p className="text-muted text-sm mt-0.5">{ch.summary}</p>}
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section>
        <h2>Images</h2>
        <p className="text-muted mt-1 mb-4 max-w-[68ch]">
          Copy each prompt into Gemini, download the image, then upload it here. Uploaded images are saved with the outline.
        </p>
        <ul className="grid gap-4 md:grid-cols-2">
          {e.image_ideas.map((img, i) => (
            <ImageSlot key={i} ebookId={e.id} index={i} idea={img} />
          ))}
        </ul>
      </section>

      {e.source_comments.length > 0 && (
        <section>
          <h2 className="mb-3">Built from these comments</h2>
          <ul className="space-y-2 max-w-[68ch]">
            {e.source_comments.map((c, i) => (
              <li key={i} className="text-sm">“{c.text}”{c.username && <span className="text-muted"> @{c.username}</span>}</li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
