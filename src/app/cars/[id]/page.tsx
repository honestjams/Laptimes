import { notFound } from "next/navigation";
import { EntityPage } from "@/components/entity-page";
import { getEntityData } from "@/lib/data";

export default async function Page({ params }: PageProps<"/cars/[id]">) {
  const n = Number((await params).id);
  if (!Number.isInteger(n)) notFound();
  return <EntityPage kind="car" id={n} />;
}

export async function generateMetadata({ params }: PageProps<"/cars/[id]">) {
  const { entity } = await getEntityData("car", Number((await params).id) || 0);
  return { title: entity?.name ?? "Not found" };
}
