import Link from "next/link";
import { BadgeCheck } from "lucide-react";
import { formatLapTime } from "@/lib/time";
import type { DriverLite, LapStatus } from "@/lib/types";

const CHIP: Record<LapStatus, { cls: string; title: string }> = {
  record: { cls: "bg-record-bg text-record border-record/40", title: "Overall record for this track and car" },
  pb: { cls: "bg-pb-bg text-pb border-pb/40", title: "Driver's personal best" },
  slow: { cls: "bg-slow-bg text-slow border-slow/40", title: "Slower than the driver's personal best" },
};

/** The signature element: every lap time is a timing-screen coloured chip. */
export function TimeChip({ ms, status, size = "md", flash = false }: { ms: number; status: LapStatus; size?: "sm" | "md" | "lg"; flash?: boolean }) {
  const s = CHIP[status];
  const sz = size === "lg" ? "text-2xl px-4 py-1.5 rounded-xl" : size === "sm" ? "text-xs px-1.5 py-0.5 rounded-md" : "text-sm px-2.5 py-1 rounded-lg";
  return (
    <span title={s.title} className={`inline-block border font-mono font-bold tabular-nums ${sz} ${s.cls} ${flash ? "record-flash" : ""}`}>
      {formatLapTime(ms)}
    </span>
  );
}

export function Verified({ on }: { on: boolean | null }) {
  if (!on) return null;
  return (
    <span title="Verified: this lap has proof attached" className="inline-flex text-pb">
      <BadgeCheck size={16} aria-label="Verified" />
    </span>
  );
}

export function DriverLink({ d, className = "" }: { d: DriverLite; className?: string }) {
  return (
    <Link href={`/drivers/${d.username}`} className={`font-bold hover:text-accent ${className}`}>
      {d.display_name}
      {d.is_placeholder && <span className="ml-1 text-xs font-semibold text-muted" title="Imported driver, not yet claimed">(unclaimed)</span>}
    </Link>
  );
}

export function PageHeader({ eyebrow, title, children }: { eyebrow?: string; title: string; children?: React.ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        {eyebrow && <div className="eyebrow mb-1">{eyebrow}</div>}
        <h1 className="font-display text-2xl font-extrabold leading-tight tracking-tight sm:text-3xl">{title}</h1>
      </div>
      {children && <div className="flex flex-wrap items-center gap-2">{children}</div>}
    </div>
  );
}

export function Empty({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="card p-8 text-center">
      <div className="font-display text-lg font-bold">{title}</div>
      {children && <div className="mx-auto mt-2 max-w-sm text-sm text-muted">{children}</div>}
    </div>
  );
}

export function Stat({ label, value, tone }: { label: string; value: React.ReactNode; tone?: "record" | "pb" | "accent" }) {
  const c = tone === "record" ? "text-record" : tone === "pb" ? "text-pb" : tone === "accent" ? "text-accent" : "";
  return (
    <div className="card p-4">
      <div className={`font-display text-2xl font-extrabold tabular-nums ${c}`}>{value}</div>
      <div className="mt-0.5 text-xs font-semibold text-muted">{label}</div>
    </div>
  );
}

export function Legend() {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted">
      <span className="inline-flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-sm bg-record" /> Record</span>
      <span className="inline-flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-sm bg-pb" /> Personal best</span>
      <span className="inline-flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-sm bg-slow" /> Slower lap</span>
    </div>
  );
}
