import { redirect } from "next/navigation";
import { AcFolderCard, ProfileForm } from "@/components/settings-forms";
import { PageHeader } from "@/components/ui";
import { getMe } from "@/lib/data";

export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  const me = await getMe();
  if (!me) redirect("/login?next=/settings");
  return (
    <div className="mx-auto max-w-xl space-y-6">
      <PageHeader title="Settings" />
      <ProfileForm id={me.id} displayName={me.display_name} bio={me.bio ?? ""} />
      <AcFolderCard />
    </div>
  );
}
