"use client";

import { useRouter } from "next/navigation";

export function H2HPicker({ drivers, a, b }: { drivers: { username: string; display_name: string }[]; a: string; b: string }) {
  const router = useRouter();
  const go = (na: string, nb: string) => router.push(`/h2h?a=${encodeURIComponent(na)}&b=${encodeURIComponent(nb)}`);
  const sel = (value: string, on: (v: string) => void, label: string) => (
    <select className="field" value={value} onChange={(e) => on(e.target.value)} aria-label={label}>
      <option value="">Pick a driver</option>
      {drivers.map((d) => (
        <option key={d.username} value={d.username}>{d.display_name}</option>
      ))}
    </select>
  );
  return (
    <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
      {sel(a, (v) => go(v, b), "First driver")}
      <span className="font-display text-sm font-extrabold text-muted">VS</span>
      {sel(b, (v) => go(a, v), "Second driver")}
    </div>
  );
}
