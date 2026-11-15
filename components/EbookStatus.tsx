"use client";
import { useTransition } from "react";
import { setEbookStatus } from "@/app/actions";

const STEPS = [
  { key: "draft", label: "Draft" },
  { key: "approved", label: "Approved" },
  { key: "designed", label: "Designed" },
] as const;

export function EbookStatus({ ebookId, status }: { ebookId: string; status: string }) {
  const [pending, start] = useTransition();
  return (
    <div role="group" aria-label="Outline status" className="inline-flex rounded-full border border-line bg-surface p-1">
      {STEPS.map((s) => (
        <button
          key={s.key}
          disabled={pending}
          aria-pressed={status === s.key}
          onClick={() => start(() => setEbookStatus(ebookId, s.key))}
          className={`rounded-full px-3.5 py-1.5 text-sm font-semibold ${status === s.key ? "bg-ink text-paper" : "text-muted hover:text-ink"}`}
        >
          {s.label}
        </button>
      ))}
    </div>
  );
}
