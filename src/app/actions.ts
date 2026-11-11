"use server";

import { updateTag } from "next/cache";
import type { Tag } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";

const TAGS: Tag[] = ["laps", "catalog", "profiles"];

/**
 * Clears cached public data after something changes, so the person who made
 * the change (and everyone else) sees it straight away.
 */
export async function refreshData(...tags: Tag[]) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) return;
  for (const t of tags) if (TAGS.includes(t)) updateTag(t);
}
