import { Gallery, type GalleryItem } from "@/components/gallery";
import { PageHeader } from "@/components/ui";
import { getCatalog, getComboRecords } from "@/lib/data";
import { trackLabel } from "@/lib/time";

export const metadata = { title: "Tracks" };

export default async function Page() {
  const [catalog, records] = await Promise.all([getCatalog(), getComboRecords()]);
  const items: GalleryItem[] = catalog.tracks
    .map((e) => {
      const recs = records.filter((r) => r.track_id === e.id);
      const best = recs[0]; // records arrive fastest first
      return {
        id: e.id,
        name: trackLabel(e),
        image_url: e.image_url,
        sub: e.country,
        group: e.country,
        best: best?.time_ms ?? null,
        count: recs.length,
        footer: best ? `${recs.length} ${recs.length === 1 ? "car" : "cars"} · fastest: ${best.car.name} (${best.driver.display_name})` : "No laps yet. Be the first.",
      };
    })
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  return (
    <>
      <PageHeader eyebrow={`${items.length} in the catalogue`} title="Tracks" />
      <Gallery kind="track" items={items} groupLabel="All countries" />
    </>
  );
}
