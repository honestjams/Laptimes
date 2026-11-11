import Link from "next/link";
import { CrewForms } from "@/components/crew-forms";
import { Empty, PageHeader } from "@/components/ui";
import { getMe, getMyCrews } from "@/lib/data";

export const metadata = { title: "Crews" };

export default async function CrewsPage() {
  const me = await getMe();
  const crews = await getMyCrews(me?.id);
  return (
    <>
      <PageHeader eyebrow="Private leaderboards for your mates" title="Crews" />
      {!me ? (
        <Empty title="Race your mates">
          A crew is a private group with its own records and bragging rights. <Link href="/login?next=/crews" className="font-bold text-accent">Sign in</Link> to start or join one.
        </Empty>
      ) : (
        <div className="space-y-6">
          {crews.length > 0 && (
            <ul className="grid gap-3 sm:grid-cols-2">
              {crews.map((c) => (
                <li key={c.id}>
                  <Link href={`/crews/${c.slug}`} className="card block p-4 transition-transform hover:-translate-y-0.5">
                    <div className="font-display text-lg font-bold">{c.name}</div>
                    <div className="text-sm text-muted">{c.memberIds.length} {c.memberIds.length === 1 ? "driver" : "drivers"}</div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
          <CrewForms meId={me.id} />
          <p className="text-sm text-muted">Once you&apos;re in a crew, every leaderboard gets a filter to show just your crew.</p>
        </div>
      )}
    </>
  );
}
