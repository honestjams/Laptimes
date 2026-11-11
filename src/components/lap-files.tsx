"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Download, FolderDown, Paperclip, Trash2 } from "lucide-react";
import { formatBytes, getAcFolder, installPath, installToAc, supportsFolderAccess } from "@/lib/ac";
import { createClient } from "@/lib/supabase/client";
import type { LapFile } from "@/lib/types";
import { attachFiles } from "@/lib/upload";

const KIND_LABEL = { ghost: "Ghost", setup: "Setup", replay: "Replay", screenshot: "Screenshot", other: "File" } as const;

export function LapFiles({
  lapId,
  files,
  trackFolder,
  carFolder,
  isAc,
  meId,
  canAttach,
  isAdmin,
}: {
  lapId: number;
  files: LapFile[];
  trackFolder: string | null;
  carFolder: string | null;
  isAc: boolean;
  meId: string | null;
  canAttach: boolean;
  isAdmin: boolean;
}) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [canInstall, setCanInstall] = useState(false);
  const [hasFolder, setHasFolder] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState<number | "upload" | null>(null);

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- browser capability check after hydration */
    setCanInstall(supportsFolderAccess());
    getAcFolder().then((h) => setHasFolder(!!h));
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  const url = (f: LapFile) => supabase.storage.from("lap-files").getPublicUrl(f.storage_path, { download: f.filename }).data.publicUrl;

  const install = async (f: LapFile) => {
    const dirs = installPath(f.kind, trackFolder, carFolder);
    if (!dirs) return;
    setBusy(f.id);
    setMsg(null);
    try {
      const res = await fetch(supabase.storage.from("lap-files").getPublicUrl(f.storage_path).data.publicUrl);
      if (!res.ok) throw new Error("Could not download the file.");
      const where = await installToAc(await res.blob(), f.filename, dirs);
      setMsg({ ok: true, text: `Installed to ${where}` });
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : "Install failed. Use Download instead." });
    }
    setBusy(null);
  };

  const remove = async (f: LapFile) => {
    if (!confirm(`Remove ${f.filename}?`)) return;
    setBusy(f.id);
    const { error } = await supabase.from("lap_files").delete().eq("id", f.id);
    if (!error && f.uploaded_by === meId) await supabase.storage.from("lap-files").remove([f.storage_path]);
    setBusy(null);
    router.refresh();
  };

  const upload = async (list: FileList | null) => {
    if (!list?.length || !meId) return;
    setBusy("upload");
    setMsg(null);
    const failed = await attachFiles(supabase, meId, lapId, Array.from(list));
    setMsg(failed.length ? { ok: false, text: `Couldn't upload: ${failed.join(", ")} (50 MB max each)` } : { ok: true, text: "Uploaded." });
    setBusy(null);
    router.refresh();
  };

  return (
    <section>
      <h2 className="mb-3 font-display text-lg font-bold">Files</h2>
      <ul className="card divide-y divide-line">
        {files.map((f) => {
          const dirs = isAc ? installPath(f.kind, trackFolder, carFolder) : null;
          return (
            <li key={f.id} className="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3">
              <div className="min-w-0 flex-1 basis-40">
                <div className="truncate font-semibold">{f.filename}</div>
                <div className="text-xs text-muted">
                  {KIND_LABEL[f.kind]} · {formatBytes(f.size_bytes)}
                  {dirs && <span className="font-mono"> → {dirs.join("/")}/</span>}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {dirs && canInstall && hasFolder && (
                  <button className="btn btn-primary btn-sm" disabled={busy === f.id} onClick={() => install(f)}>
                    <FolderDown size={15} /> {busy === f.id ? "Installing…" : "Install"}
                  </button>
                )}
                <a className="btn btn-ghost btn-sm" href={url(f)} download={f.filename}>
                  <Download size={15} /> Download
                </a>
                {(f.uploaded_by === meId || isAdmin) && (
                  <button className="btn btn-ghost btn-sm !px-2.5" aria-label={`Remove ${f.filename}`} disabled={busy === f.id} onClick={() => remove(f)}>
                    <Trash2 size={15} />
                  </button>
                )}
              </div>
            </li>
          );
        })}
        {files.length === 0 && <li className="p-6 text-center text-sm text-muted">No ghost, setup or replay attached to this lap.</li>}
      </ul>

      {msg && <p role="status" className={`mt-2 text-sm font-semibold ${msg.ok ? "text-pb" : "text-accent"}`}>{msg.text}</p>}

      {isAc && files.some((f) => installPath(f.kind, trackFolder, carFolder)) && canInstall && !hasFolder && (
        <p className="mt-2 text-sm text-muted">
          Want one-click installs? <Link href="/settings#ac-folder" className="font-bold text-accent">Choose your Assetto Corsa folder</Link> once and an Install button appears here.
        </p>
      )}
      {isAc && files.some((f) => f.kind === "ghost" || f.kind === "setup") && !files.every((f) => installPath(f.kind, trackFolder, carFolder) || !["ghost", "setup"].includes(f.kind)) && (
        <p className="mt-2 text-xs text-muted">One-click install isn&apos;t available for some files because this track or car has no game folder name yet.</p>
      )}

      {canAttach && (
        <label className={`mt-3 flex min-h-[48px] cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed border-line px-4 text-sm font-bold text-muted hover:border-accent hover:text-ink ${busy === "upload" ? "pointer-events-none opacity-60" : ""}`}>
          <Paperclip size={16} /> {busy === "upload" ? "Uploading…" : "Attach a ghost, setup, replay or screenshot"}
          <input type="file" multiple className="sr-only" onChange={(e) => (upload(e.target.files), (e.target.value = ""))} />
        </label>
      )}
    </section>
  );
}
