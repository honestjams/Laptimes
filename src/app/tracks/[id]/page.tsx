import { notFound } from "next/navigation";
import { EntityPage } from "@/components/entity-page";
import { createClient } from "@/lib/supabase/server";

export default async function Page({ params }: PageProps<"/tracks/[id]">) {
  const { id } = await params;
  const n = Number(id);
  if (!Number.isInteger(n)) notFound();
  const supabase = await createClient();
  const { data } = await supabase.from("tracks").select("*").eq("id", n).maybeSingle();
  if (!data) notFound();
  return <EntityPage kind="track" entity={data} />;
}
