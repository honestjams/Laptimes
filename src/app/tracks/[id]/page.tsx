import { notFound } from "next/navigation";
import { EntityPage } from "@/components/entity-page";
import { getEntityData } from "@/lib/data";
import { trackLabel } from "@/lib/time";
import type { Track } from "@/lib/types";

export default async function Page({ params }: PageProps<"/tracks/[id]">) {
  const n = Number((await params).id);
  if (!Number.isInteger(n)) notFound();
  return <EntityPage kind="track" id={n} />;
}

export async function generateMetadata({ params }: PageProps<"/tracks/[id]">) {
  const { entity } = await getEntityData("track", Number((await params).id) || 0);
  return { title: entity ? trackLabel(entity as Track) : "Not found" };
}
