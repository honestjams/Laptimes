"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ChevronDown, Paperclip, X } from "lucide-react";
import { Combobox } from "@/components/combobox";
import { TimeChip } from "@/components/ui";
import { formatBytes, MAX_FILE_BYTES } from "@/lib/ac";
import { createClient } from "@/lib/supabase/client";
import { formatGap, formatLapTime, parseLapTime, trackLabel } from "@/lib/time";
import { ASSISTS, type AssistKey, type Car, type InputDevice, type LapStatus, type Sim, type Track } from "@/lib/types";
import { attachFiles } from "@/lib/upload";

type Props = { userId: string; sims: Sim[]; tracks: Track[]; cars: Car[]; initialTrack: number | null; initialCar: number | null };
type Result = { lapId: number; ms: number; status: LapStatus; gap: number | null; prevPb: number | null; trackId: number; carId: number; failed: string[] };
type NewItem = { kind: "track" | "car"; name: string; layout: string; folder: string; cls: string; url: string };

const LAST = "laptimes:last";

export function LogLapForm({ userId, sims, tracks: t0, cars: c0, initialTrack, initialCar }: Props) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [tracks, setTracks] = useState(t0);
  const [cars, setCars] = useState(c0);
  const [simId, setSimId] = useState(sims[0]?.id ?? 1);
  const [trackId, setTrackId] = useState<number | null>(initialTrack);
  const [carId, setCarId] = useState<number | null>(initialCar);
  const [time, setTime] = useState("");
  const [date, setDate] = useState("");
  const [more, setMore] = useState(false);
  const [sectors, setSectors] = useState(["", "", ""]);
  const [device, setDevice] = useState<InputDevice | "">("");
  const [assists, setAssists] = useState<Record<AssistKey, boolean>>({ assist_tc: false, assist_abs: false, assist_sc: false, assist_line: false, assist_auto: false });
  const [tyre, setTyre] = useState("");
  const [temp, setTemp] = useState("");
  const [notes, setNotes] = useState("");
  const [proof, setProof] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [adding, setAdding] = useState<NewItem | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);

  // Remember the last combo and rig so the next lap is a couple of taps.
  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- restoring saved choices after hydration */
    setDate(new Date().toLocaleDateString("en-CA"));
    try {
      const last = JSON.parse(localStorage.getItem(LAST) ?? "null") ?? {};
      const tr = t0.find((t) => t.id === (initialTrack ?? last.trackId));
      const ca = c0.find((c) => c.id === (initialCar ?? last.carId));
      if (tr) {
        setTrackId(tr.id);
        setSimId(tr.sim_id);
      } else if (last.simId) setSimId(last.simId);
      if (ca) setCarId(ca.id);
      if (last.device) setDevice(last.device);
      if (last.assists) setAssists((a) => ({ ...a, ...last.assists }));
    } catch {}
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [t0, c0, initialTrack, initialCar]);

  const ms = parseLapTime(time);
  const simTracks = tracks.filter((t) => t.sim_id === simId);
  const simCars = cars.filter((c) => c.sim_id === simId);

  const saveNew = async () => {
    if (!adding) return;
    setError(null);
    const folder = adding.folder.trim() || null;
    const url = adding.url.trim() || null;
    if (adding.kind === "track") {
      const { data, error } = await supabase
        .from("tracks")
        .insert({ sim_id: simId, name: adding.name.trim(), layout: adding.layout.trim(), ac_folder: folder, download_url: url, is_mod: !!url, created_by: userId })
        .select("*")
        .single();
      if (error) return setError(error.code === "23505" ? "That track and layout already exists. Pick it from the list." : friendly(error.message));
      setTracks((l) => [...l, data as Track]);
      setTrackId(data.id);
    } else {
      const { data, error } = await supabase
        .from("cars")
        .insert({ sim_id: simId, name: adding.name.trim(), class: adding.cls.trim() || null, ac_folder: folder, download_url: url, is_mod: !!url, created_by: userId })
        .select("*")
        .single();
      if (error) return setError(error.code === "23505" ? "That car already exists. Pick it from the list." : friendly(error.message));
      setCars((l) => [...l, data as Car]);
      setCarId(data.id);
    }
    setAdding(null);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!trackId || !carId) return setError("Pick a track and a car.");
    if (!ms) return setError("That lap time doesn't look right. Try something like 1:31.510.");
    const sec = sectors.map((s) => (s.trim() ? parseSector(s) : null));
    if (sec.some((s, i) => sectors[i].trim() && !s)) return setError("One of the sector times doesn't look right.");
    if (proof.trim() && !/^https?:\/\//.test(proof.trim())) return setError("The proof link needs to start with http:// or https://");
    if (files.some((f) => f.size > MAX_FILE_BYTES)) return setError("Files need to be under 50 MB each.");
    setBusy(true);

    // What were the record and my best before this lap?
    const { data: before } = await supabase.from("best_laps").select("driver_id,time_ms").eq("track_id", trackId).eq("car_id", carId).order("time_ms");
    const record = before?.[0]?.time_ms as number | undefined;
    const myBest = before?.find((b) => b.driver_id === userId)?.time_ms as number | undefined;

    const { data: lap, error } = await supabase
      .from("laps")
      .insert({
        driver_id: userId,
        track_id: trackId,
        car_id: carId,
        time_ms: ms,
        s1_ms: sec[0],
        s2_ms: sec[1],
        s3_ms: sec[2],
        set_on: date || null,
        input_device: device || null,
        tyre: tyre.trim() || null,
        track_temp_c: temp.trim() ? Number(temp) : null,
        notes: notes.trim() || null,
        proof_url: proof.trim() || null,
        ...assists,
      })
      .select("id")
      .single();
    if (error || !lap) {
      setBusy(false);
      return setError(friendly(error?.message ?? "Could not save the lap."));
    }
    const failed = files.length ? await attachFiles(supabase, userId, lap.id, files) : [];
    try {
      localStorage.setItem(LAST, JSON.stringify({ simId, trackId, carId, device, assists }));
    } catch {}

    const status: LapStatus = record === undefined || ms < record ? "record" : myBest === undefined || ms < myBest ? "pb" : "slow";
    setResult({ lapId: lap.id, ms, status, gap: record === undefined ? null : ms - record, prevPb: myBest ?? null, trackId, carId, failed });
    setBusy(false);
    router.refresh();
  };

  if (result) {
    const track = tracks.find((t) => t.id === result.trackId)!;
    const car = cars.find((c) => c.id === result.carId)!;
    const headline = result.status === "record" ? "New record!" : result.status === "pb" ? "Personal best!" : "Lap logged";
    return (
      <div className="card rise mx-auto max-w-md p-8 text-center">
        <div className="eyebrow">{trackLabel(track)} · {car.name}</div>
        <div className={`mt-2 font-display text-3xl font-extrabold ${result.status === "record" ? "text-record" : result.status === "pb" ? "text-pb" : ""}`}>{headline}</div>
        <div className="my-6">
          <TimeChip ms={result.ms} status={result.status} size="lg" flash={result.status !== "slow"} />
        </div>
        <p className="text-sm text-muted">
          {result.status === "record"
            ? result.gap === null
              ? "First time on the board for this combo. It's yours to defend."
              : `You took the record by ${formatGap(result.gap).slice(1)}s.`
            : `${formatGap(result.gap ?? 0)} off the record.`}
          {result.prevPb !== null && result.status !== "slow" && ` That's ${formatGap(result.ms - result.prevPb).slice(1)}s quicker than your old best.`}
          {result.status === "slow" && result.prevPb !== null && ` Your best is still ${formatLapTime(result.prevPb)}.`}
        </p>
        {result.failed.length > 0 && <p className="mt-3 text-sm font-semibold text-accent">Couldn&apos;t upload: {result.failed.join(", ")}. You can retry from the lap page.</p>}
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <Link href={`/combo/${result.trackId}/${result.carId}`} className="btn btn-primary">See the leaderboard</Link>
          <button className="btn btn-ghost" onClick={() => (setResult(null), setTime(""), setSectors(["", "", ""]), setFiles([]), setNotes(""), setProof(""))}>Log another</button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="mx-auto max-w-md space-y-4">
      {sims.length > 1 && (
        <div>
          <label className="label" htmlFor="sim">Sim</label>
          <select id="sim" className="field" value={simId} onChange={(e) => (setSimId(Number(e.target.value)), setTrackId(null), setCarId(null))}>
            {sims.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>
      )}
      <Combobox
        label="Track"
        placeholder="Search tracks"
        options={simTracks.map((t) => ({ id: t.id, label: trackLabel(t), hint: t.country })).sort((a, b) => a.label.localeCompare(b.label))}
        value={trackId}
        onChange={setTrackId}
        onCreate={(name) => setAdding({ kind: "track", name, layout: "", folder: "", cls: "", url: "" })}
      />
      <Combobox
        label="Car"
        placeholder="Search cars"
        options={simCars.map((c) => ({ id: c.id, label: c.name, hint: c.class })).sort((a, b) => a.label.localeCompare(b.label))}
        value={carId}
        onChange={setCarId}
        onCreate={(name) => setAdding({ kind: "car", name, layout: "", folder: "", cls: "", url: "" })}
      />

      {adding && (
        <div className="card rise space-y-3 border-accent p-4">
          <div className="font-bold">New {adding.kind}</div>
          <input className="field" aria-label="Name" value={adding.name} onChange={(e) => setAdding({ ...adding, name: e.target.value })} placeholder="Name" />
          {adding.kind === "track" ? (
            <input className="field" value={adding.layout} onChange={(e) => setAdding({ ...adding, layout: e.target.value })} placeholder="Layout, e.g. GP (optional)" aria-label="Layout" />
          ) : (
            <input className="field" value={adding.cls} onChange={(e) => setAdding({ ...adding, cls: e.target.value })} placeholder="Class, e.g. GT3 (optional)" aria-label="Class" />
          )}
          <input className="field font-mono" value={adding.folder} onChange={(e) => setAdding({ ...adding, folder: e.target.value })} placeholder="Game folder name, e.g. ks_barcelona (optional)" aria-label="Game folder name" />
          <input className="field" type="url" value={adding.url} onChange={(e) => setAdding({ ...adding, url: e.target.value })} placeholder="Mod download link (optional)" aria-label="Mod download link" />
          <p className="text-xs text-muted">The folder name lets ghosts and setups install to the right place.</p>
          <div className="flex gap-2">
            <button type="button" className="btn btn-primary btn-sm" onClick={saveNew} disabled={adding.name.trim().length < 2}>Add {adding.kind}</button>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setAdding(null)}>Cancel</button>
          </div>
        </div>
      )}

      <div>
        <label className="label" htmlFor="time">Lap time</label>
        <input
          id="time"
          className="field !min-h-[64px] text-center font-mono !text-3xl font-bold tabular-nums"
          inputMode="decimal"
          autoComplete="off"
          placeholder="1:31.510"
          value={time}
          onChange={(e) => setTime(e.target.value)}
        />
        <p className={`mt-1 text-center text-xs ${time && !ms ? "font-semibold text-accent" : "text-muted"}`}>
          {ms ? <>Reads as <b className="font-mono text-ink">{formatLapTime(ms)}</b></> : time ? "Can't read that yet. Try 1:31.510" : "Any format works: 1:31.510, 01.31.510 or 131510"}
        </p>
      </div>

      <button type="button" onClick={() => setMore((m) => !m)} aria-expanded={more} className="flex min-h-[44px] w-full items-center justify-between rounded-xl bg-surface-2 px-4 text-sm font-bold">
        More detail and proof (optional)
        <ChevronDown size={18} className={`transition-transform ${more ? "rotate-180" : ""}`} />
      </button>

      {more && (
        <div className="rise space-y-4">
          <div>
            <label className="label" htmlFor="date">Date set</label>
            <input id="date" type="date" className="field" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div>
            <span className="label">Sector times</span>
            <div className="grid grid-cols-3 gap-2">
              {sectors.map((s, i) => (
                <input key={i} className="field text-center font-mono" inputMode="decimal" placeholder={`S${i + 1}`} aria-label={`Sector ${i + 1}`} value={s} onChange={(e) => setSectors(sectors.map((x, j) => (j === i ? e.target.value : x)))} />
              ))}
            </div>
          </div>
          <div>
            <span className="label">Driving with</span>
            <div className="grid grid-cols-3 gap-2">
              {(["wheel", "controller", "keyboard"] as InputDevice[]).map((d) => (
                <button key={d} type="button" aria-pressed={device === d} onClick={() => setDevice(device === d ? "" : d)} className={`min-h-[44px] rounded-xl border text-sm font-bold capitalize ${device === d ? "border-accent bg-accent text-accent-ink" : "border-line bg-surface text-muted"}`}>
                  {d}
                </button>
              ))}
            </div>
          </div>
          <div>
            <span className="label">Assists switched on</span>
            <div className="flex flex-wrap gap-2">
              {ASSISTS.map((a) => (
                <button key={a.key} type="button" aria-pressed={assists[a.key]} onClick={() => setAssists({ ...assists, [a.key]: !assists[a.key] })} className={`min-h-[40px] rounded-full border px-3.5 text-sm font-bold ${assists[a.key] ? "border-accent bg-accent text-accent-ink" : "border-line bg-surface text-muted"}`}>
                  {a.label}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="label" htmlFor="tyre">Tyres</label>
              <input id="tyre" className="field" maxLength={40} value={tyre} onChange={(e) => setTyre(e.target.value)} placeholder="Softs" />
            </div>
            <div>
              <label className="label" htmlFor="temp">Track temp °C</label>
              <input id="temp" className="field" type="number" min={-20} max={80} value={temp} onChange={(e) => setTemp(e.target.value)} />
            </div>
          </div>
          <div>
            <label className="label" htmlFor="notes">Notes</label>
            <textarea id="notes" className="field" rows={2} maxLength={500} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Setup, fuel, excuses" />
          </div>
          <div>
            <label className="label" htmlFor="proof">Proof link</label>
            <input id="proof" className="field" type="url" value={proof} onChange={(e) => setProof(e.target.value)} placeholder="YouTube, Drive, etc." />
          </div>
          <div>
            <span className="label">Ghost, setup, replay or screenshot</span>
            <label className="flex min-h-[56px] cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed border-line px-4 text-sm font-bold text-muted hover:border-accent hover:text-ink">
              <Paperclip size={16} /> Add files
              <input type="file" multiple className="sr-only" onChange={(e) => (setFiles([...files, ...Array.from(e.target.files ?? [])]), (e.target.value = ""))} />
            </label>
            {files.length > 0 && (
              <ul className="mt-2 space-y-1">
                {files.map((f, i) => (
                  <li key={i} className="flex items-center gap-2 rounded-lg bg-surface-2 px-3 py-2 text-sm">
                    <span className="min-w-0 flex-1 truncate">{f.name}</span>
                    <span className={`text-xs ${f.size > MAX_FILE_BYTES ? "font-bold text-accent" : "text-muted"}`}>{formatBytes(f.size)}</span>
                    <button type="button" aria-label={`Remove ${f.name}`} onClick={() => setFiles(files.filter((_, j) => j !== i))}><X size={16} /></button>
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-1 text-xs text-muted">Anything attached here, or a proof link, earns the lap a verified tick. 50 MB max per file.</p>
          </div>
        </div>
      )}

      {error && <p role="alert" className="rounded-lg bg-accent/10 px-3 py-2 text-sm font-semibold text-accent">{error}</p>}
      <button className="btn btn-primary w-full !min-h-[54px] !text-base" disabled={busy}>
        {busy ? "Saving…" : "Save lap"}
      </button>
    </form>
  );
}

function parseSector(s: string): number | null {
  const t = s.trim();
  if (/^\d{1,3}([.,]\d{1,3})?$/.test(t)) return Math.round(Number(t.replace(",", ".")) * 1000) || null;
  return parseLapTime(t);
}

function friendly(msg: string): string {
  if (/row-level security/i.test(msg)) return "You need to be signed in to do that.";
  if (/check constraint/i.test(msg)) return "Something in the form isn't valid. Folder names can only use letters, numbers, dashes and underscores.";
  return msg;
}
