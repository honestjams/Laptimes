"use client";
import type { SupabaseClient } from "@supabase/supabase-js";
import { guessKind, MAX_FILE_BYTES } from "@/lib/ac";

/** Uploads files to storage and records them against the lap. Returns names that failed. */
export async function attachFiles(supabase: SupabaseClient, userId: string, lapId: number, files: File[]): Promise<string[]> {
  const failed: string[] = [];
  for (const file of files) {
    if (file.size === 0 || file.size > MAX_FILE_BYTES) {
      failed.push(file.name);
      continue;
    }
    const safe = file.name.replace(/[^A-Za-z0-9._\-]/g, "_").slice(-120);
    const path = `${userId}/${lapId}/${crypto.randomUUID().slice(0, 8)}-${safe}`;
    const up = await supabase.storage.from("lap-files").upload(path, file, { contentType: file.type || "application/octet-stream" });
    if (up.error) {
      failed.push(file.name);
      continue;
    }
    const { error } = await supabase.from("lap_files").insert({
      lap_id: lapId,
      kind: guessKind(file.name),
      storage_path: path,
      filename: file.name.slice(0, 200),
      size_bytes: file.size,
      uploaded_by: userId,
    });
    if (error) {
      failed.push(file.name);
      await supabase.storage.from("lap-files").remove([path]);
    }
  }
  return failed;
}
