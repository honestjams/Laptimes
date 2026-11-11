import Link from "next/link";
import { CarPhoto, TrackMap } from "@/components/media";
import { TimeChip } from "@/components/ui";

/** Picture card for a track or car, used in the galleries and on the home page. */
export function CatalogCard({
  kind,
  id,
  name,
  image_url,
  sub,
  best,
  footer,
  eager = false,
}: {
  kind: "track" | "car";
  id: number;
  name: string;
  image_url: string | null;
  sub?: string | null;
  best?: number | null;
  footer?: string;
  eager?: boolean;
}) {
  const sizes = "(min-width: 1024px) 320px, (min-width: 640px) 45vw, 90vw";
  return (
    <Link href={`/${kind}s/${id}`} className="card group block overflow-hidden transition-transform duration-200 hover:-translate-y-1 active:scale-[0.98]">
      {kind === "track" ? (
        <TrackMap track={{ name, image_url }} sizes={sizes} eager={eager} className="aspect-[16/10] w-full" />
      ) : (
        <CarPhoto car={{ name, image_url }} sizes={sizes} eager={eager} className="aspect-[16/10] w-full" />
      )}
      <div className="border-t border-line p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="truncate font-bold group-hover:text-accent">{name}</div>
            {sub && <div className="truncate text-xs text-muted">{sub}</div>}
          </div>
          {best != null && <TimeChip ms={best} status="record" size="sm" />}
        </div>
        {footer && <div className="mt-2 truncate text-xs text-muted">{footer}</div>}
      </div>
    </Link>
  );
}
