"use client";
import { useState, useTransition } from "react";
import { completeAction, skipAction, markReplied } from "@/app/actions";
import { actionButton, actionLabel } from "@/lib/labels";
import type { Action } from "@/lib/types";

export function ActionRow({ action: a, overdue }: { action: Action; overdue: boolean }) {
  const [pending, start] = useTransition();
  const [leaving, setLeaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [replyOpen, setReplyOpen] = useState(false);
  const [notes, setNotes] = useState("");
  const isMessage = a.type === "dm" || a.type === "followup_1" || a.type === "followup_2";

  const run = (fn: () => Promise<void>) =>
    start(async () => {
      setErr(null);
      try {
        setLeaving(true);
        await fn();
      } catch (e) {
        setLeaving(false);
        setErr(e instanceof Error ? e.message : "That didn't save. Try again.");
      }
    });

  async function copyAndOpen() {
    if (a.draft) {
      try {
        await navigator.clipboard.writeText(a.draft);
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      } catch {
        /* clipboard blocked; the text is still visible to copy by hand */
      }
    }
    if (a.target_url) window.open(a.target_url, "_blank", "noopener");
  }

  return (
    <li className={`px-5 py-4 ${leaving ? "leave" : ""}`}>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <h3>{actionLabel(a.type, a.seq)}</h3>
        {overdue && (
          <span className="rounded-full bg-amber-tint text-amber text-[.78rem] font-semibold px-2 py-0.5">
            Due {new Date(a.due_date).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
          </span>
        )}
      </div>

      {a.guidance && <p className="text-muted text-sm mt-1">{a.guidance}</p>}

      {a.draft && (
        <blockquote className="mt-3 rounded-xl bg-paper border-l-[3px] border-green px-4 py-3 whitespace-pre-wrap max-w-[68ch]">
          {a.draft}
        </blockquote>
      )}
      {!a.draft && (a.type === "comment" || isMessage) && (
        <p className="mt-2 text-sm text-amber">No draft yet. The outreach writer fills this in on its next run.</p>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button className="btn" onClick={copyAndOpen} disabled={!a.target_url}>
          {copied ? "Copied, opening…" : actionButton(a.type)}
        </button>
        <button className="btn btn-primary" disabled={pending} onClick={() => run(() => completeAction(a.id))}>
          {isMessage ? "Mark sent" : "Mark done"}
        </button>
        {isMessage && (
          <button className="btn" disabled={pending} aria-expanded={replyOpen} onClick={() => setReplyOpen((v) => !v)}>
            They replied
          </button>
        )}
        <button className="btn btn-quiet" disabled={pending} onClick={() => run(() => skipAction(a.id))}>
          {a.type === "comment" || a.type === "follow_like" ? "Skip" : "Do tomorrow"}
        </button>
      </div>
      {replyOpen && (
        <div className="mt-3 max-w-[68ch] space-y-2">
          <label className="block text-sm font-semibold" htmlFor={`notes-${a.id}`}>
            What did they say? This stops the sequence and moves them to Replied.
          </label>
          <textarea id={`notes-${a.id}`} className="field" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
          <button className="btn btn-primary" disabled={pending} onClick={() => run(() => markReplied(a.creator_id, notes))}>
            Move to Replied
          </button>
        </div>
      )}
      {err && <p role="alert" className="text-red text-sm mt-2">{err}</p>}
    </li>
  );
}
