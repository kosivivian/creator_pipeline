import { Shell } from "@/components/Shell";
import { supabaseServer } from "@/lib/supabase-server";
import { lagosToday } from "@/lib/labels";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await supabaseServer();
  const { count } = await supabase
    .from("actions")
    .select("id", { count: "exact", head: true })
    .eq("status", "pending")
    .lte("due_date", lagosToday());
  return <Shell todayCount={count ?? 0}>{children}</Shell>;
}
