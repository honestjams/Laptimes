import { redirect } from "next/navigation";
import { LogLapForm } from "@/components/log-lap-form";
import { PageHeader } from "@/components/ui";
import { getMe } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";
import type { Car, Sim, Track } from "@/lib/types";

export const metadata = { title: "Log a lap" };

export default async function LogPage({ searchParams }: PageProps<"/log">) {
  const me = await getMe();
  if (!me) redirect("/login?next=/log");
  const sp = await searchParams;
  const supabase = await createClient();
  const [{ data: sims }, { data: tracks }, { data: cars }] = await Promise.all([
    supabase.from("sims").select("*").order("sort"),
    supabase.from("tracks").select("*").order("name").limit(5000),
    supabase.from("cars").select("*").order("name").limit(5000),
  ]);
  const num = (v: string | string[] | undefined) => (typeof v === "string" && Number.isInteger(Number(v)) ? Number(v) : null);
  return (
    <>
      <PageHeader eyebrow="Ten seconds, tops" title="Log a lap" />
      <LogLapForm userId={me.id} sims={(sims ?? []) as Sim[]} tracks={(tracks ?? []) as Track[]} cars={(cars ?? []) as Car[]} initialTrack={num(sp.track)} initialCar={num(sp.car)} />
    </>
  );
}
