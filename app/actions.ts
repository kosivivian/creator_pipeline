"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase-server";
import type { ImageIdea } from "@/lib/types";

function refresh() {
  revalidatePath("/", "layout");
}

export async function signIn(_: string | null, form: FormData): Promise<string | null> {
  const supabase = await supabaseServer();
  const { error } = await supabase.auth.signInWithPassword({
    email: String(form.get("email") ?? ""),
    password: String(form.get("password") ?? ""),
  });
  if (error) return "That email and password don't match. Check them and try again.";
  redirect("/");
}

export async function completeAction(id: string) {
  const supabase = await supabaseServer();
  const { error } = await supabase.rpc("complete_action", { p_action: id });
  if (error) throw new Error(error.message);
  refresh();
}

export async function skipAction(id: string) {
  const supabase = await supabaseServer();
  const { error } = await supabase.rpc("skip_action", { p_action: id });
  if (error) throw new Error(error.message);
  refresh();
}

export async function startWarmup(creatorId: string) {
  const supabase = await supabaseServer();
  const { error } = await supabase.rpc("start_warmup", { p_creator: creatorId });
  if (error) throw new Error(error.message);
  refresh();
}

export async function markReplied(creatorId: string, notes: string) {
  const supabase = await supabaseServer();
  const { error } = await supabase.rpc("mark_replied", { p_creator: creatorId, p_notes: notes || undefined });
  if (error) throw new Error(error.message);
  refresh();
}

export async function setStage(creatorId: string, stage: "rejected" | "qualified") {
  const supabase = await supabaseServer();
  const { error } = await supabase.from("creators").update({ stage }).eq("id", creatorId);
  if (error) throw new Error(error.message);
  if (stage === "rejected") {
    await supabase.from("actions").update({ status: "skipped" }).eq("creator_id", creatorId).eq("status", "pending");
  }
  refresh();
}

export async function setEbookImage(ebookId: string, index: number, imageUrl: string) {
  const supabase = await supabaseServer();
  const { data, error } = await supabase.from("ebooks").select("image_ideas").eq("id", ebookId).single();
  if (error) throw new Error(error.message);
  const ideas = (data.image_ideas ?? []) as ImageIdea[];
  if (!ideas[index]) throw new Error("That image slot no longer exists");
  ideas[index] = { ...ideas[index], image_url: imageUrl };
  const res = await supabase.from("ebooks").update({ image_ideas: ideas }).eq("id", ebookId);
  if (res.error) throw new Error(res.error.message);
  refresh();
}

export async function setEbookStatus(ebookId: string, status: "draft" | "approved" | "designed") {
  const supabase = await supabaseServer();
  const { error } = await supabase.from("ebooks").update({ status }).eq("id", ebookId);
  if (error) throw new Error(error.message);
  refresh();
}
