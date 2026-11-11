"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Pencil } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

/** Lets an admin (or whoever added it) fix a track or car's game folder name and mod link. */
export function EntityEdit({ kind, id, folder, layoutFolder, url, cls }: { kind: "track" | "car"; id: number; folder: string; layoutFolder: string; url: string; cls: string }) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ folder, layoutFolder, url, cls });
  const [err, setErr] = useState<string | null>(null);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    const patch: Record<string, string | boolean | null> = { ac_folder: f.folder.trim() || null, download_url: f.url.trim() || null };
    if (kind === "track") patch.ac_layout = f.layoutFolder.trim() || null;
    else patch.class = f.cls.trim() || null;
    const { error } = await supabase.from(`${kind}s`).update(patch).eq("id", id);
    if (error) return setErr(/check constraint/.test(error.message) ? "Folder names can only use letters, numbers, dots, dashes and underscores. Links must start with http." : error.message);
    setOpen(false);
    router.refresh();
  };

  if (!open)
    return (
      <button className="btn btn-ghost btn-sm mb-6" onClick={() => setOpen(true)}>
        <Pencil size={14} /> Edit game folder and mod link
      </button>
    );
  return (
    <form onSubmit={save} className="card rise mb-6 max-w-md space-y-3 p-4">
      <div>
        <label className="label" htmlFor="ef">Game folder name</label>
        <input id="ef" className="field font-mono" value={f.folder} onChange={(e) => setF({ ...f, folder: e.target.value })} placeholder={kind === "track" ? "ks_barcelona" : "ks_ferrari_488_gt3"} />
        <p className="mt-1 text-xs text-muted">The folder inside content/{kind}s. Ghosts and setups use it to install to the right place.</p>
      </div>
      {kind === "track" ? (
        <div>
          <label className="label" htmlFor="el">Layout folder name (optional)</label>
          <input id="el" className="field font-mono" value={f.layoutFolder} onChange={(e) => setF({ ...f, layoutFolder: e.target.value })} placeholder="layout_gp" />
        </div>
      ) : (
        <div>
          <label className="label" htmlFor="ec">Class</label>
          <input id="ec" className="field" maxLength={30} value={f.cls} onChange={(e) => setF({ ...f, cls: e.target.value })} placeholder="GT3" />
        </div>
      )}
      <div>
        <label className="label" htmlFor="eu">Mod download link</label>
        <input id="eu" className="field" type="url" value={f.url} onChange={(e) => setF({ ...f, url: e.target.value })} />
      </div>
      {err && <p role="alert" className="text-sm font-semibold text-accent">{err}</p>}
      <div className="flex gap-2">
        <button className="btn btn-primary btn-sm">Save</button>
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => setOpen(false)}>Cancel</button>
      </div>
    </form>
  );
}
