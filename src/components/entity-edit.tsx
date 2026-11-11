"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { ImagePlus, Pencil } from "lucide-react";
import { refreshData } from "@/app/actions";
import { createClient } from "@/lib/supabase/client";

const MAX_IMAGE = 5 * 1024 * 1024;

/** Lets an admin (or whoever added it) set a track or car's picture, game folder name and mod link. */
export function EntityEdit({ kind, id, userId, folder, layoutFolder, url, cls, hasImage }: { kind: "track" | "car"; id: number; userId: string; folder: string; layoutFolder: string; url: string; cls: string; hasImage: boolean }) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ folder, layoutFolder, url, cls, credit: "" });
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    if (file && (file.size > MAX_IMAGE || !/^image\/(png|jpeg|webp)$/.test(file.type))) return setErr("Pictures need to be PNG, JPG or WebP and under 5 MB.");
    setBusy(true);
    const patch: Record<string, string | boolean | null> = { ac_folder: f.folder.trim() || null, download_url: f.url.trim() || null };
    if (kind === "track") patch.ac_layout = f.layoutFolder.trim() || null;
    else patch.class = f.cls.trim() || null;
    if (file) {
      const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
      const path = `${userId}/${kind}-${id}-${crypto.randomUUID().slice(0, 8)}.${ext}`;
      const up = await supabase.storage.from("catalog").upload(path, file, { contentType: file.type, cacheControl: "31536000" });
      if (up.error) {
        setBusy(false);
        return setErr("Couldn't upload that picture. Try a smaller PNG or JPG.");
      }
      patch.image_url = supabase.storage.from("catalog").getPublicUrl(path).data.publicUrl;
      patch.image_credit = f.credit.trim() || null;
      patch.image_source_url = null;
    }
    const { error } = await supabase.from(`${kind}s`).update(patch).eq("id", id);
    setBusy(false);
    if (error) return setErr(/check constraint/.test(error.message) ? "Folder names can only use letters, numbers, dots, dashes and underscores. Links must start with http." : error.message);
    await refreshData("catalog");
    setOpen(false);
    setFile(null);
    router.refresh();
  };

  if (!open)
    return (
      <button className="btn btn-ghost btn-sm mb-6" onClick={() => setOpen(true)}>
        <Pencil size={14} /> {hasImage ? "Edit details" : `Add a ${kind === "track" ? "track map" : "photo"} and details`}
      </button>
    );
  return (
    <form onSubmit={save} className="card rise mb-6 max-w-md space-y-3 p-4">
      <div>
        <span className="label">{kind === "track" ? "Track map" : "Car photo"}</span>
        <label className="flex min-h-[52px] cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed border-line px-4 text-sm font-bold text-muted hover:border-accent hover:text-ink">
          <ImagePlus size={16} /> <span className="truncate">{file ? file.name : hasImage ? "Replace picture" : "Choose a picture"}</span>
          <input type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
        </label>
        <p className="mt-1 text-xs text-muted">
          {kind === "track" ? "Tip: every Assetto Corsa track has a map at content/tracks/<folder>/ui/outline.png." : "Tip: every Assetto Corsa car has a preview at content/cars/<folder>/skins/<skin>/preview.jpg."} Only upload pictures you&apos;re allowed to share.
        </p>
        {file && <input className="field mt-2" maxLength={200} value={f.credit} onChange={(e) => setF({ ...f, credit: e.target.value })} placeholder="Picture credit (optional)" aria-label="Picture credit" />}
      </div>
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
        <button className="btn btn-primary btn-sm" disabled={busy}>{busy ? "Saving…" : "Save"}</button>
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => setOpen(false)}>Cancel</button>
      </div>
    </form>
  );
}
