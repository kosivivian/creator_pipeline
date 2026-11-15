"use client";
import { useTransition } from "react";
import { setStage } from "@/app/actions";
import type { Stage } from "@/lib/types";

export function LeadControls({ creatorId, stage }: { creatorId: string; stage: Stage }) {
  const [pending, start] = useTransition();
  if (stage === "replied") return null;
  return (
    <footer className="border-t border-line pt-5">
      {stage === "rejected" ? (
        <button className="btn" disabled={pending} onClick={() => start(() => setStage(creatorId, "qualified"))}>
          Restore to qualified
        </button>
      ) : (
        <button className="btn btn-quiet text-red px-0" disabled={pending} onClick={() => start(() => setStage(creatorId, "rejected"))}>
          Not a fit, reject this lead
        </button>
      )}
    </footer>
  );
}
