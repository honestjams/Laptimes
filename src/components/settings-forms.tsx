"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { FolderOpen } from "lucide-react";
import { refreshData } from "@/app/actions";
import { forgetAcFolder, getAcFolder, pickAcFolder, supportsFolderAccess } from "@/lib/ac";
import { createClient } from "@/lib/supabase/client";

export function ProfileForm({ id, displayName, bio }: { id: string; displayName: string; bio: string }) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [name, setName] = useState(displayName);
  const [about, setAbout] = useState(bio);
  const [msg, setMsg] = useState<string | null>(null);
  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from("profiles").update({ display_name: name.trim(), bio: about.trim() || null }).eq("id", id);
    if (!error) await refreshData("profiles");
    setMsg(error ? error.message : "Saved.");
    router.refresh();
  };
  return (
    <form onSubmit={save} className="card space-y-4 p-5">
      <h2 className="font-display text-lg font-bold">Profile</h2>
      <div>
        <label className="label" htmlFor="dn">Driver name</label>
        <input id="dn" className="field" required maxLength={40} value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <div>
        <label className="label" htmlFor="bio">About</label>
        <textarea id="bio" className="field" rows={2} maxLength={280} value={about} onChange={(e) => setAbout(e.target.value)} placeholder="Rig, favourite car, excuses" />
      </div>
      <div className="flex items-center gap-3">
        <button className="btn btn-primary">Save</button>
        {msg && <span role="status" className="text-sm font-semibold text-muted">{msg}</span>}
      </div>
    </form>
  );
}

export function AcFolderCard() {
  const [supported, setSupported] = useState<boolean | null>(null);
  const [folder, setFolder] = useState<string | null>(null);
  const [warn, setWarn] = useState<string | null>(null);

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- browser capability check after hydration */
    setSupported(supportsFolderAccess());
    getAcFolder().then((h) => setFolder(h?.name ?? null));
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  const pick = async () => {
    setWarn(null);
    try {
      const r = await pickAcFolder();
      setFolder(r.name);
      if (!r.looksRight) setWarn("That folder doesn't have the usual Assetto Corsa subfolders (setups, cfg, replay). Double-check it's Documents › Assetto Corsa.");
    } catch (e) {
      if ((e as Error).name !== "AbortError") setWarn("The browser wouldn't open that folder. Pick the Assetto Corsa folder inside Documents, not Documents itself.");
    }
  };

  return (
    <section id="ac-folder" className="card scroll-mt-20 space-y-3 p-5">
      <h2 className="font-display text-lg font-bold">Assetto Corsa folder</h2>
      <p className="text-sm text-muted">
        Choose your <b className="text-ink">Documents › Assetto Corsa</b> folder once, and ghosts, setups and replays install straight into the right place with one click:
      </p>
      <ul className="space-y-1 font-mono text-xs text-muted">
        <li>setups/&lt;car&gt;/&lt;track&gt;/</li>
        <li>ghostcar/&lt;track&gt;/</li>
        <li>replay/</li>
      </ul>
      {supported === false ? (
        <p className="rounded-lg bg-surface-2 px-3 py-2 text-sm">
          This browser can&apos;t write to folders. One-click install works in Chrome or Edge on a computer. Everywhere else you get a normal download.
        </p>
      ) : (
        <div className="flex flex-wrap items-center gap-3">
          <button className="btn btn-primary" onClick={pick} disabled={supported === null}>
            <FolderOpen size={17} /> {folder ? "Change folder" : "Choose folder"}
          </button>
          {folder && (
            <>
              <span className="text-sm">Using <b className="font-mono">{folder}</b></span>
              <button className="text-sm font-bold text-accent" onClick={() => forgetAcFolder().then(() => setFolder(null))}>Forget</button>
            </>
          )}
        </div>
      )}
      {warn && <p role="alert" className="text-sm font-semibold text-accent">{warn}</p>}
      <p className="text-xs text-muted">The folder choice is remembered by this browser on this device only. Nothing about your files is sent to the site.</p>
    </section>
  );
}
