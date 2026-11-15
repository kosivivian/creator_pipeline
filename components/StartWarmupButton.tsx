"use client";
import { useState, useTransition } from "react";
import { startWarmup } from "@/app/actions";

export function StartWarmupButton({ creatorId }: { creatorId: string }) {
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  return (
    <div className="text-right">
      <button
        className="btn btn-primary"
        disabled={pending}
        onClick={() =>
          start(async () => {
            try { await startWarmup(creatorId); } catch (e) { setErr(e instanceof Error ? e.message : "Couldn't start"); }
          })
        }
      >
        {pending ? "Scheduling…" : "Start warm-up"}
      </button>
      {err && <p role="alert" className="text-red text-sm mt-1">{err}</p>}
    </div>
  );
}
