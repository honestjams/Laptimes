import Link from "next/link";
import { notFound } from "next/navigation";
import { ResolveClaim, ResolveReport } from "@/components/admin-actions";
import { PageHeader } from "@/components/ui";
import { getMe } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";
import { formatDate, formatLapTime } from "@/lib/time";

export const metadata = { title: "Admin" };

export default async function AdminPage() {
  const me = await getMe();
  if (!me?.is_admin) notFound();
  const supabase = await createClient();
  const [{ data: reports }, { data: claims }, { data: hidden }] = await Promise.all([
    supabase.from("reports").select("id,reason,created_at,lap_id,reporter:profiles(display_name)").eq("resolved", false).order("created_at"),
    supabase
      .from("claim_requests")
      .select("id,created_at,placeholder:profiles!claim_requests_placeholder_id_fkey(display_name,username),claimant:profiles!claim_requests_claimant_id_fkey(display_name,username)")
      .eq("status", "pending")
      .order("created_at"),
    supabase.from("laps").select("id,time_ms,driver:profiles(display_name)").eq("is_hidden", true).limit(100),
  ]);
  type Name = { display_name: string; username?: string };
  const R = (reports ?? []) as unknown as { id: number; reason: string; created_at: string; lap_id: number; reporter: Name }[];
  const C = (claims ?? []) as unknown as { id: number; created_at: string; placeholder: Name; claimant: Name }[];
  const H = (hidden ?? []) as unknown as { id: number; time_ms: number; driver: Name }[];

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <PageHeader eyebrow="Keep it clean" title="Admin" />
      <section>
        <h2 className="mb-3 font-display text-lg font-bold">Reported laps ({R.length})</h2>
        <ul className="card divide-y divide-line">
          {R.map((r) => (
            <li key={r.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
              <div className="min-w-0 flex-1 basis-48">
                <div className="font-semibold">{r.reason}</div>
                <div className="text-xs text-muted">
                  {r.reporter.display_name} · {formatDate(r.created_at)} · <Link href={`/laps/${r.lap_id}`} className="font-bold text-accent">Open lap</Link>
                </div>
              </div>
              <ResolveReport id={r.id} />
            </li>
          ))}
          {R.length === 0 && <li className="p-6 text-center text-sm text-muted">Nothing reported.</li>}
        </ul>
        <p className="mt-2 text-xs text-muted">Open the lap to hide or delete it, then mark the report as dealt with.</p>
      </section>
      <section>
        <h2 className="mb-3 font-display text-lg font-bold">Driver claims ({C.length})</h2>
        <ul className="card divide-y divide-line">
          {C.map((c) => (
            <li key={c.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
              <div className="min-w-0 flex-1 basis-48 text-sm">
                <Link href={`/drivers/${c.claimant.username}`} className="font-bold hover:text-accent">{c.claimant.display_name}</Link> says they are{" "}
                <Link href={`/drivers/${c.placeholder.username}`} className="font-bold hover:text-accent">{c.placeholder.display_name}</Link>
              </div>
              <ResolveClaim id={c.id} />
            </li>
          ))}
          {C.length === 0 && <li className="p-6 text-center text-sm text-muted">No one waiting.</li>}
        </ul>
      </section>
      <section>
        <h2 className="mb-3 font-display text-lg font-bold">Hidden laps ({H.length})</h2>
        <ul className="card divide-y divide-line">
          {H.map((l) => (
            <li key={l.id} className="flex items-center gap-3 px-4 py-3 text-sm">
              <span className="flex-1">{l.driver.display_name}</span>
              <span className="font-mono font-bold">{formatLapTime(l.time_ms)}</span>
              <Link href={`/laps/${l.id}`} className="font-bold text-accent">Open</Link>
            </li>
          ))}
          {H.length === 0 && <li className="p-6 text-center text-sm text-muted">None.</li>}
        </ul>
      </section>
    </div>
  );
}
