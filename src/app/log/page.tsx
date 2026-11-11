import { redirect } from "next/navigation";
import { LogLapForm } from "@/components/log-lap-form";
import { PageHeader } from "@/components/ui";
import { getCatalog, getMe } from "@/lib/data";

export const metadata = { title: "Log a lap" };

export default async function LogPage({ searchParams }: PageProps<"/log">) {
  const [me, catalog, sp] = await Promise.all([getMe(), getCatalog(), searchParams]);
  if (!me) redirect("/login?next=/log");
  const num = (v: string | string[] | undefined) => (typeof v === "string" && Number.isInteger(Number(v)) ? Number(v) : null);
  return (
    <>
      <PageHeader eyebrow="Ten seconds, tops" title="Log a lap" />
      <LogLapForm userId={me.id} sims={catalog.sims} tracks={catalog.tracks} cars={catalog.cars} initialTrack={num(sp.track)} initialCar={num(sp.car)} />
    </>
  );
}
