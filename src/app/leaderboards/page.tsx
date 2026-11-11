import { CombosBrowser } from "@/components/combos-browser";
import { PageHeader } from "@/components/ui";
import { getComboRecords } from "@/lib/data";

export const metadata = { title: "Leaderboards" };

export default async function LeaderboardsPage() {
  const records = await getComboRecords();
  return (
    <>
      <PageHeader eyebrow="Every track and car" title="Leaderboards" />
      <CombosBrowser records={records} />
    </>
  );
}
