import Link from "next/link";
import { PageHeader } from "@/components/ui";
import { getCatalog } from "@/lib/data";
import { trackLabel } from "@/lib/time";

export const metadata = { title: "Image credits" };

export default async function CreditsPage() {
  const { tracks, cars } = await getCatalog();
  const rows = [
    ...tracks.filter((t) => t.image_credit).map((t) => ({ key: `t${t.id}`, href: `/tracks/${t.id}`, name: trackLabel(t), credit: t.image_credit!, src: t.image_source_url })),
    ...cars.filter((c) => c.image_credit).map((c) => ({ key: `c${c.id}`, href: `/cars/${c.id}`, name: c.name, credit: c.image_credit!, src: c.image_source_url })),
  ];
  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader eyebrow="Thank you" title="Image credits" />
      <p className="mb-4 text-sm text-muted">
        Track maps and car photos come from Wikimedia Commons and are used under the licence shown. They have been resized, and track maps are shown with inverted colours in dark mode. Follow a link for the original file and full licence terms.
      </p>
      <ul className="card divide-y divide-line">
        {rows.map((r) => (
          <li key={r.key} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5 px-4 py-2.5 text-sm">
            <Link href={r.href} className="font-bold hover:text-accent">{r.name}</Link>
            {r.src ? <a href={r.src} target="_blank" rel="noopener noreferrer" className="text-muted underline hover:text-ink">{r.credit}</a> : <span className="text-muted">{r.credit}</span>}
          </li>
        ))}
        {rows.length === 0 && <li className="p-6 text-center text-muted">No credited images yet.</li>}
      </ul>
    </div>
  );
}
