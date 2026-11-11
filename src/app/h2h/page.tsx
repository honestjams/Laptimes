import Link from "next/link";
import { Crown } from "lucide-react";
import { H2HPicker } from "@/components/h2h-picker";
import { PageHeader, TimeChip } from "@/components/ui";
import { getMe } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";
import { formatGap, trackLabel } from "@/lib/time";
import type { Car, Lap, Track } from "@/lib/types";

export const metadata = { title: "Head to head" };
type Best = Lap & { track: Pick<Track, "name" | "layout">; car: Pick<Car, "name"> };

export default async function H2HPage({ searchParams }: PageProps<"/h2h">) {
  const sp = await searchParams;
  const supabase = await createClient();
  const me = await getMe();
  const { data: all } = await supabase.from("profiles").select("id,username,display_name").order("display_name").limit(5000);
  const drivers = all ?? [];
  const str = (v: string | string[] | undefined) => (typeof v === "string" ? v.toLowerCase() : "");
  const a = drivers.find((d) => d.username === (str(sp.a) || me?.username));
  const b = drivers.find((d) => d.username === str(sp.b));

  let rows: { key: string; href: string; label: string; car: string; a?: Best; b?: Best }[] = [];
  if (a && b && a.id !== b.id) {
    const { data } = await supabase.from("best_laps").select("*, track:tracks(name,layout), car:cars(name)").in("driver_id", [a.id, b.id]).limit(10000);
    const m = new Map<string, (typeof rows)[number]>();
    for (const l of (data ?? []) as unknown as Best[]) {
      const key = `${l.track_id}-${l.car_id}`;
      const r = m.get(key) ?? { key, href: `/combo/${l.track_id}/${l.car_id}`, label: trackLabel(l.track), car: l.car.name };
      if (l.driver_id === a.id) r.a = l;
      else r.b = l;
      m.set(key, r);
    }
    rows = [...m.values()].sort((x, y) => x.label.localeCompare(y.label) || x.car.localeCompare(y.car));
  }
  const shared = rows.filter((r) => r.a && r.b);
  const winsA = shared.filter((r) => r.a!.time_ms < r.b!.time_ms).length;
  const winsB = shared.filter((r) => r.b!.time_ms < r.a!.time_ms).length;
  const king = winsA === winsB ? null : winsA > winsB ? a : b;
  const solo = rows.filter((r) => !(r.a && r.b));

  return (
    <>
      <PageHeader eyebrow="Settle it" title="Head to head" />
      <H2HPicker drivers={drivers} a={a?.username ?? ""} b={b?.username ?? ""} />

      {a && b && a.id === b.id && <p className="mt-6 text-center text-sm text-muted">Pick two different drivers.</p>}
      {(!a || !b) && <p className="mt-6 text-center text-sm text-muted">Pick two drivers to compare every track and car they&apos;ve both driven.</p>}

      {a && b && a.id !== b.id && (
        <div className="mt-6 space-y-6">
          <div className="card p-5 text-center">
            <div className="eyebrow flex items-center justify-center gap-1.5"><Crown size={14} className="text-record" /> Who is the king?</div>
            <div className="mt-3 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
              <Side name={a.display_name} username={a.username} wins={winsA} lead={winsA > winsB} />
              <span className="font-display text-xl font-extrabold text-muted">–</span>
              <Side name={b.display_name} username={b.username} wins={winsB} lead={winsB > winsA} />
            </div>
            {/* share of wins */}
            {shared.length > 0 && (
              <div className="mt-4 flex h-2.5 gap-0.5 overflow-hidden rounded-full" aria-hidden>
                <span className={winsA >= winsB ? "bg-record" : "bg-muted"} style={{ flex: winsA || 0.0001 }} />
                <span className={winsB > winsA ? "bg-record" : "bg-muted"} style={{ flex: winsB || 0.0001 }} />
              </div>
            )}
            <p className="mt-3 text-sm text-muted">
              {shared.length === 0
                ? "They haven't driven the same track and car yet."
                : king
                  ? `${king.display_name} is the king across ${shared.length} shared ${shared.length === 1 ? "combo" : "combos"}.`
                  : `Dead level across ${shared.length} shared ${shared.length === 1 ? "combo" : "combos"}.`}
            </p>
          </div>

          {shared.length > 0 && (
            <ul className="card divide-y divide-line">
              {shared.map((r) => {
                const aw = r.a!.time_ms < r.b!.time_ms;
                const tie = r.a!.time_ms === r.b!.time_ms;
                return (
                  <li key={r.key} className="px-3 py-3 sm:px-4">
                    <Link href={r.href} className="block truncate text-sm font-bold hover:text-accent">
                      {r.label} <span className="font-normal text-muted">· {r.car}</span>
                    </Link>
                    <div className="mt-1.5 grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                      <div><TimeChip ms={r.a!.time_ms} status={aw || tie ? "pb" : "slow"} /></div>
                      <span className="font-mono text-xs tabular-nums text-muted">{tie ? "tie" : formatGap(Math.abs(r.a!.time_ms - r.b!.time_ms)).slice(1)}</span>
                      <div className="text-right"><TimeChip ms={r.b!.time_ms} status={!aw || tie ? "pb" : "slow"} /></div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
          <p className="text-xs text-muted">Green is the quicker of the two on that combo.</p>

          {solo.length > 0 && (
            <section>
              <h2 className="mb-3 font-display text-lg font-bold">Only one of them has a time</h2>
              <ul className="card divide-y divide-line">
                {solo.map((r) => (
                  <li key={r.key}>
                    <Link href={r.href} className="flex items-center gap-3 px-4 py-2.5 hover:bg-surface-2">
                      <div className="min-w-0 flex-1 truncate text-sm">
                        <b>{r.label}</b> <span className="text-muted">· {r.car}</span>
                      </div>
                      <span className="text-xs text-muted">{r.a ? a.display_name : b.display_name}</span>
                      <TimeChip ms={(r.a ?? r.b)!.time_ms} status="slow" size="sm" />
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      )}
    </>
  );
}

function Side({ name, username, wins, lead }: { name: string; username: string; wins: number; lead: boolean }) {
  return (
    <div>
      <div className={`font-display text-4xl font-extrabold tabular-nums ${lead ? "text-record" : ""}`}>{wins}</div>
      <Link href={`/drivers/${username}`} className="text-sm font-bold hover:text-accent">{name}</Link>
    </div>
  );
}
