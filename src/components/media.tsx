import Image from "next/image";
import { CarFront, Route } from "lucide-react";

type Pic = { name: string; image_url: string | null };

// Callers may position the frame absolutely; otherwise it needs to be relative for the fill image.
const pos = (className: string) => (/(^|\s)(absolute|fixed)(\s|$)/.test(className) ? "" : "relative");

/**
 * Track map on a white plate. Maps are mostly dark lines on a clear or white
 * background, so in dark mode the whole plate is inverted (hue kept) rather
 * than showing a glaring white box.
 */
export function TrackMap({ track, sizes = "256px", eager = false, className = "" }: { track: Pic; sizes?: string; eager?: boolean; className?: string }) {
  if (!track.image_url)
    return (
      <div className={`grid place-items-center bg-surface-2 text-muted ${className}`} aria-hidden>
        <Route className="h-1/3 w-1/3 opacity-50" />
      </div>
    );
  return (
    // In dark mode the plate is #e3e5ec: after hue-rotate(180deg) then invert() it lands on the card colour (#181a21).
    <div className={`${pos(className)} overflow-hidden bg-white dark:bg-[#e3e5ec] dark:hue-rotate-180 dark:invert ${className}`}>
      <Image src={track.image_url} alt={`${track.name} track map`} fill sizes={sizes} loading={eager ? "eager" : "lazy"} fetchPriority={eager ? "high" : "auto"} className="object-contain p-[6%] mix-blend-multiply" />
    </div>
  );
}

export function CarPhoto({ car, sizes = "256px", eager = false, className = "" }: { car: Pic; sizes?: string; eager?: boolean; className?: string }) {
  if (!car.image_url)
    return (
      <div className={`grid place-items-center bg-surface-2 text-muted ${className}`} aria-hidden>
        <CarFront className="h-1/3 w-1/3 opacity-50" />
      </div>
    );
  return (
    <div className={`${pos(className)} overflow-hidden bg-surface-2 ${className}`}>
      <Image src={car.image_url} alt={car.name} fill sizes={sizes} loading={eager ? "eager" : "lazy"} fetchPriority={eager ? "high" : "auto"} className="object-cover" />
    </div>
  );
}

/** Initials on a colour picked from the username, so each driver is recognisable at a glance. */
export function Avatar({ name, seed, size = 36 }: { name: string; seed: string; size?: number }) {
  let h = 0;
  for (const ch of seed) h = (h * 31 + ch.charCodeAt(0)) % 360;
  const initials = name.split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase();
  return (
    <span
      aria-hidden
      className="grid shrink-0 place-items-center rounded-full font-display font-extrabold text-white"
      style={{ width: size, height: size, fontSize: size * 0.36, background: `oklch(0.55 0.16 ${h})` }}
    >
      {initials}
    </span>
  );
}

export function ImageCredit({ credit, sourceUrl }: { credit: string | null; sourceUrl: string | null }) {
  if (!credit) return null;
  return (
    <p className="text-[11px] text-muted">
      Image: {sourceUrl ? <a href={sourceUrl} target="_blank" rel="noopener noreferrer" className="underline hover:text-ink">{credit}</a> : credit}
    </p>
  );
}
