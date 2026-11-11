import Link from "next/link";
import { notFound } from "next/navigation";
import { Plus } from "lucide-react";
import { Leaderboard } from "@/components/leaderboard";
import { CarPhoto, TrackMap } from "@/components/media";
import { Legend } from "@/components/ui";
import { getComboData, getMe, getMyCrews } from "@/lib/data";
import { trackLabel } from "@/lib/time";

export default async function ComboPage({ params }: PageProps<"/combo/[trackId]/[carId]">) {
  const { trackId, carId } = await params;
  const tid = Number(trackId);
  const cid = Number(carId);
  if (!Number.isInteger(tid) || !Number.isInteger(cid)) notFound();

  const [{ track: t, car: c, laps }, me] = await Promise.all([getComboData(tid, cid), getMe()]);
  if (!t || !c) notFound();
  const crews = await getMyCrews(me?.id);

  return (
    <>
      <section className="card mb-5 grid overflow-hidden sm:grid-cols-2">
        <Link href={`/tracks/${t.id}`} className="group relative block">
          <TrackMap track={t} sizes="(min-width: 640px) 480px, 100vw" eager className="aspect-[16/9] w-full" />
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 to-transparent p-3 pt-8 text-white">
            <div className="text-[10px] font-extrabold uppercase tracking-widest opacity-80">Track</div>
            <h1 className="truncate font-display text-xl font-extrabold group-hover:underline">{trackLabel(t)}</h1>
          </div>
        </Link>
        <Link href={`/cars/${c.id}`} className="group relative block border-t border-line sm:border-l sm:border-t-0">
          <CarPhoto car={c} sizes="(min-width: 640px) 480px, 100vw" eager className="aspect-[16/9] w-full" />
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 to-transparent p-3 pt-8 text-white">
            <div className="text-[10px] font-extrabold uppercase tracking-widest opacity-80">Car{c.class ? ` · ${c.class}` : ""}</div>
            <div className="truncate font-display text-xl font-extrabold group-hover:underline">{c.name}</div>
          </div>
        </Link>
      </section>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-display text-lg font-bold">Leaderboard</h2>
        <Link href={`/log?track=${t.id}&car=${c.id}`} className="btn btn-primary btn-sm">
          <Plus size={16} strokeWidth={3} /> Log a lap here
        </Link>
      </div>
      <Leaderboard laps={laps} meId={me?.id ?? null} crews={crews} />
      <div className="mt-4">
        <Legend />
      </div>
    </>
  );
}

export async function generateMetadata({ params }: PageProps<"/combo/[trackId]/[carId]">) {
  const { trackId, carId } = await params;
  const { track, car } = await getComboData(Number(trackId) || 0, Number(carId) || 0);
  return { title: track && car ? `${trackLabel(track)} · ${car.name}` : "Leaderboard" };
}
