"use client";
import { useState, useTransition } from "react";
import { supabaseBrowser } from "@/lib/supabase-browser";
import { setEbookImage } from "@/app/actions";
import type { ImageIdea } from "@/lib/types";

export function ImageSlot({ ebookId, index, idea }: { ebookId: string; index: number; idea: ImageIdea }) {
  const [copied, setCopied] = useState(false);
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  async function copy() {
    if (!idea.gemini_prompt) return;
    try {
      await navigator.clipboard.writeText(idea.gemini_prompt);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* clipboard blocked; prompt stays selectable */ }
  }

  function upload(file: File) {
    start(async () => {
      setErr(null);
      const ext = file.name.split(".").pop() || "png";
      const path = `${ebookId}/${index}-${Date.now()}.${ext}`;
      const sb = supabaseBrowser();
      const { error } = await sb.storage.from("ebook-images").upload(path, file, { upsert: true, contentType: file.type });
      if (error) return setErr(`Upload failed: ${error.message}`);
      const { data } = sb.storage.from("ebook-images").getPublicUrl(path);
      try { await setEbookImage(ebookId, index, data.publicUrl); } catch (e) { setErr(e instanceof Error ? e.message : "Couldn't save"); }
    });
  }

  return (
    <li className="rounded-2xl bg-surface border border-line overflow-hidden flex flex-col">
      {idea.image_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={idea.image_url} alt={idea.caption ?? `Image ${index + 1}`} className="w-full aspect-[4/3] object-cover bg-paper" />
      ) : null}
      <div className="p-4 flex-1 flex flex-col gap-2">
        <h3>{idea.placement ?? `Image ${index + 1}`}</h3>
        {idea.caption && <p className="text-sm text-muted">{idea.caption}</p>}
        {idea.gemini_prompt && (
          <p className="text-sm rounded-lg bg-paper px-3 py-2 select-all">{idea.gemini_prompt}</p>
        )}
        <div className="mt-auto pt-2 flex flex-wrap gap-2">
          {idea.gemini_prompt && (
            <button className="btn" onClick={copy}>{copied ? "Copied" : "Copy prompt"}</button>
          )}
          <a href="https://gemini.google.com/app" target="_blank" rel="noopener" className="btn btn-quiet">Open Gemini</a>
          <label className={`btn ${idea.image_url ? "" : "btn-primary"} ${pending ? "opacity-50" : ""}`}>
            {pending ? "Uploading…" : idea.image_url ? "Replace image" : "Upload image"}
            <input
              type="file"
              accept="image/*"
              className="sr-only"
              disabled={pending}
              onChange={(ev) => ev.target.files?.[0] && upload(ev.target.files[0])}
            />
          </label>
        </div>
        {err && <p role="alert" className="text-red text-sm">{err}</p>}
      </div>
    </li>
  );
}
