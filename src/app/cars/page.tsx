import { Gallery, type GalleryItem } from "@/components/gallery";
import { PageHeader } from "@/components/ui";
import { getCatalog, getComboRecords } from "@/lib/data";
import { trackLabel } from "@/lib/time";

export const metadata = { title: "Cars" };

export default async function Page() {
  const [catalog, records] = await Promise.all([getCatalog(), getComboRecords()]);
  const items: GalleryItem[] = catalog.cars
    .map((e) => {
      const recs = records.filter((r) => r.car_id === e.id);
      const best = recs[0]; // records arrive fastest first
      return {
        id: e.id,
        name: e.name,
        image_url: e.image_url,
        sub: e.class,
        group: e.class,
        best: best?.time_ms ?? null,
        count: recs.length,
        footer: best ? `${recs.length} ${recs.length === 1 ? "track" : "tracks"} · fastest: ${trackLabel(best.track)} (${best.driver.display_name})` : "No laps yet. Be the first.",
      };
    })
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  return (
    <>
      <PageHeader eyebrow={`${items.length} in the catalogue`} title="Cars" />
      <Gallery kind="car" items={items} groupLabel="All classes" />
    </>
  );
}
