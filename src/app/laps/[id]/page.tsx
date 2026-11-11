import Link from "next/link";
import { notFound } from "next/navigation";
import { ExternalLink } from "lucide-react";
import { LapActions } from "@/components/lap-actions";
import { LapFiles } from "@/components/lap-files";
import { DriverLink, TimeChip, Verified } from "@/components/ui";
import { getLapStatuses, getMe, LAP_FULL } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";
import { formatDate, formatGap, formatLapTime, trackLabel } from "@/lib/time";
import { ASSISTS, type LapFile, type LapFull } from "@/lib/types";

export const metadata = { title: "Lap" };

export default async function LapPage({ params }: PageProps<"/laps/[id]">) {
  const { id } = await params;
  const lapId = Number(id);
  if (!Number.isInteger(lapId)) notFound();
  const supabase = await createClient();
  const me = await getMe();
  const { data } = await supabase.from("laps").select(LAP_FULL).eq("id", lapId).maybeSingle();
  if (!data) notFound();
  const lap = data as unknown as LapFull;

  const [{ data: files }, statuses, { data: rec }, { data: sim }] = await Promise.all([
    supabase.from("lap_files").select("*").eq("lap_id", lapId).order("created_at"),
    getLapStatuses([lap]),
    supabase.from("combo_records").select("time_ms").eq("track_id", lap.track_id).eq("car_id", lap.car_id).maybeSingle(),
    supabase.from("sims").select("slug").eq("id", lap.track.sim_id).maybeSingle(),
  ]);
  const status = statuses.get(lap.id) ?? "slow";
  const gap = rec?.time_ms != null ? lap.time_ms - (rec.time_ms as number) : 0;
  const used = ASSISTS.filter((a) => lap[a.key]);
  const sectors = [lap.s1_ms, lap.s2_ms, lap.s3_ms];
  const isOwner = me?.id === lap.driver_id;

  const facts: [string, React.ReactNode][] = [
    ["Date", formatDate(lap.set_on) || "Unknown"],
    ["Driving with", lap.input_device ? <span key="d" className="capitalize">{lap.input_device}</span> : "Not recorded"],
    ["Assists", used.length ? used.map((a) => a.label).join(", ") : "None recorded"],
    ...(lap.tyre ? ([["Tyres", lap.tyre]] as [string, React.ReactNode][]) : []),
    ...(lap.track_temp_c != null ? ([["Track temp", `${lap.track_temp_c} °C`]] as [string, React.ReactNode][]) : []),
  ];

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="card p-6 text-center">
        {lap.is_hidden && <div className="tag mb-3 !bg-accent !text-accent-ink">Hidden from leaderboards</div>}
        <Link href={`/combo/${lap.track_id}/${lap.car_id}`} className="eyebrow hover:text-ink">
          {trackLabel(lap.track)} · {lap.car.name}
        </Link>
        <div className="my-4">
          <TimeChip ms={lap.time_ms} status={status} size="lg" />
        </div>
        <div className="flex items-center justify-center gap-2">
          <DriverLink d={lap.driver} /> <Verified on={lap.is_verified} />
        </div>
        <div className="mt-1 text-sm text-muted">
          {status === "record" ? "Holds the record for this combo" : `${formatGap(gap)} off the record${status === "pb" ? ", driver's personal best" : ""}`}
        </div>
        {sectors.every((s) => s != null) && (
          <div className="mt-5 grid grid-cols-3 gap-2">
            {sectors.map((s, i) => (
              <div key={i} className="rounded-xl bg-surface-2 py-2">
                <div className="text-[11px] font-bold text-muted">S{i + 1}</div>
                <div className="font-mono text-sm font-bold tabular-nums">{formatLapTime(s!)}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      <dl className="card divide-y divide-line">
        {facts.map(([k, v]) => (
          <div key={k} className="flex justify-between gap-4 px-4 py-3 text-sm">
            <dt className="text-muted">{k}</dt>
            <dd className="text-right font-semibold">{v}</dd>
          </div>
        ))}
        {lap.notes && (
          <div className="px-4 py-3 text-sm">
            <dt className="text-muted">Notes</dt>
            <dd className="mt-1 whitespace-pre-wrap">{lap.notes}</dd>
          </div>
        )}
        {lap.proof_url && (
          <div className="flex justify-between gap-4 px-4 py-3 text-sm">
            <dt className="text-muted">Proof</dt>
            <dd>
              <a href={lap.proof_url} target="_blank" rel="noopener noreferrer nofollow" className="inline-flex items-center gap-1 font-bold text-accent hover:underline">
                Open link <ExternalLink size={13} />
              </a>
            </dd>
          </div>
        )}
      </dl>

      <LapFiles
        lapId={lap.id}
        files={(files ?? []) as LapFile[]}
        trackFolder={lap.track.ac_folder}
        carFolder={lap.car.ac_folder}
        isAc={sim?.slug === "ac"}
        meId={me?.id ?? null}
        canAttach={isOwner}
        isAdmin={!!me?.is_admin}
      />

      <LapActions
        lapId={lap.id}
        storagePaths={((files ?? []) as LapFile[]).filter((f) => f.uploaded_by === me?.id).map((f) => f.storage_path)}
        meId={me?.id ?? null}
        isOwner={isOwner}
        isAdmin={!!me?.is_admin}
        isHidden={lap.is_hidden}
        backHref={`/combo/${lap.track_id}/${lap.car_id}`}
      />
    </div>
  );
}
