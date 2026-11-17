"use client";
import { useTransition } from "react";
import { setStage } from "@/app/actions";

export function ReviewButtons({ creatorId }: { creatorId: string }) {
  const [pending, start] = useTransition();
  return (
    <div className="flex gap-2">
      <button className="btn btn-primary" disabled={pending} onClick={() => start(() => setStage(creatorId, "qualified"))}>
        Approve as lead
      </button>
      <button className="btn" disabled={pending} onClick={() => start(() => setStage(creatorId, "rejected"))}>
        Reject
      </button>
    </div>
  );
}
