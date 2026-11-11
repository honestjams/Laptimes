// Lap time helpers. Times are stored as whole milliseconds.

/**
 * Forgiving parser. Accepts 1:31.510, 01.22.942, 1.31.215, 01.31.82,
 * 82.5 (seconds), 7:33.092, 1:02:03.456 and bare digits like 122942.
 * Returns milliseconds, or null if it can't be read as a lap time.
 */
export function parseLapTime(input: string): number | null {
  const raw = input.trim();
  if (!raw || !/^[\d:.,\s']+$/.test(raw)) return null;
  const parts = raw.split(/[^\d]+/).filter(Boolean);
  if (parts.length === 0 || parts.length > 4) return null;
  const frac = (s: string) => Number((s + "000").slice(0, 3));
  let ms: number;

  if (parts.length === 1) {
    const d = parts[0];
    if (d.length <= 3) ms = Number(d) * 1000; // plain seconds
    else {
      // m ss mmm, e.g. 122942 -> 1:22.942
      const millis = Number(d.slice(-3));
      const secs = Number(d.slice(-5, -3));
      const mins = Number(d.slice(0, -5) || "0");
      if (secs > 59) return null;
      ms = mins * 60000 + secs * 1000 + millis;
    }
  } else if (parts.length === 2) {
    const usesColon = raw.includes(":");
    if (usesColon) {
      if (Number(parts[1]) > 59) return null;
      ms = Number(parts[0]) * 60000 + Number(parts[1]) * 1000; // m:ss
    } else ms = Number(parts[0]) * 1000 + frac(parts[1]); // ss.mmm
  } else if (parts.length === 3) {
    if (Number(parts[1]) > 59) return null;
    ms = Number(parts[0]) * 60000 + Number(parts[1]) * 1000 + frac(parts[2]);
  } else {
    if (Number(parts[1]) > 59 || Number(parts[2]) > 59) return null;
    ms = Number(parts[0]) * 3600000 + Number(parts[1]) * 60000 + Number(parts[2]) * 1000 + frac(parts[3]);
  }
  if (!Number.isFinite(ms) || ms < 5000 || ms > 3600000) return null;
  return ms;
}

export function formatLapTime(ms: number): string {
  const total = Math.round(ms);
  const h = Math.floor(total / 3600000);
  const m = Math.floor((total % 3600000) / 60000);
  const s = Math.floor((total % 60000) / 1000);
  const milli = total % 1000;
  const tail = `${String(s).padStart(2, "0")}.${String(milli).padStart(3, "0")}`;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${tail}`;
  return `${m}:${tail}`;
}

export function formatGap(ms: number): string {
  if (ms === 0) return "—";
  const sign = ms > 0 ? "+" : "−";
  const abs = Math.abs(ms);
  if (abs >= 60000) return `${sign}${formatLapTime(abs)}`;
  return `${sign}${(abs / 1000).toFixed(3)}`;
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso.length === 10 ? iso + "T00:00:00Z" : iso);
  return d.toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
}

export function trackLabel(t: { name: string; layout?: string | null }): string {
  return t.layout ? `${t.name} – ${t.layout}` : t.name;
}
