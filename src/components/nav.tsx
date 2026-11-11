"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Flag, Home, LogOut, Moon, Plus, Settings, Shield, Sun, Swords, Trophy, User, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Me = { username: string; display_name: string; is_admin: boolean } | null;

const LINKS = [
  { href: "/leaderboards", label: "Leaderboards", icon: Trophy },
  { href: "/drivers", label: "Drivers", icon: Flag },
  { href: "/h2h", label: "Head to head", icon: Swords },
  { href: "/crews", label: "Crews", icon: Users },
];

function ThemeToggle() {
  const [theme, setTheme] = useState<string | null>(null);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reading the DOM after hydration
    setTheme(document.documentElement.dataset.theme ?? "dark");
  }, []);
  const flip = () => {
    const next = theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem("theme", next);
    } catch {}
    setTheme(next);
  };
  return (
    <button onClick={flip} className="btn btn-ghost btn-sm !px-2.5" aria-label="Switch between dark and light mode">
      {theme === "light" ? <Moon size={18} /> : <Sun size={18} />}
    </button>
  );
}

export function Nav({ me }: { me: Me }) {
  const pathname = usePathname();
  const router = useRouter();
  const [menu, setMenu] = useState(false);
  const active = (href: string) => pathname === href || pathname.startsWith(href + "/");

  const signOut = async () => {
    await createClient().auth.signOut();
    setMenu(false);
    router.push("/");
    router.refresh();
  };

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-line bg-bg/85 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-5xl items-center gap-3 px-4">
          <Link href="/" className="font-display text-lg font-extrabold tracking-tight">
            LAP<span className="text-accent">TIMES</span>
          </Link>
          <nav className="ml-4 hidden items-center gap-1 sm:flex">
            {LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors ${
                  active(l.href) ? "bg-surface-2 text-ink" : "text-muted hover:text-ink"
                }`}
              >
                {l.label}
              </Link>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <ThemeToggle />
            {me ? (
              <>
                <Link href="/log" className="btn btn-primary btn-sm hidden sm:inline-flex">
                  <Plus size={16} strokeWidth={3} /> Log a lap
                </Link>
                <div className="relative">
                  <button
                    onClick={() => setMenu((m) => !m)}
                    className="btn btn-ghost btn-sm !px-2.5"
                    aria-label="Account menu"
                    aria-expanded={menu}
                  >
                    <User size={18} />
                  </button>
                  {menu && (
                    <>
                      <button className="fixed inset-0 z-40 cursor-default" aria-hidden onClick={() => setMenu(false)} />
                      <div className="card rise absolute right-0 z-50 mt-2 w-52 p-1.5 text-sm">
                        <div className="px-3 py-2 font-bold">{me.display_name}</div>
                        <MenuLink href={`/drivers/${me.username}`} icon={User} label="My profile" close={setMenu} />
                        <MenuLink href="/settings" icon={Settings} label="Settings" close={setMenu} />
                        {me.is_admin && <MenuLink href="/admin" icon={Shield} label="Admin" close={setMenu} />}
                        <button onClick={signOut} className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left hover:bg-surface-2">
                          <LogOut size={16} /> Sign out
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </>
            ) : (
              <Link href="/login" className="btn btn-primary btn-sm">
                Sign in
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Phone: thumb-reach tab bar with the main action in the middle */}
      <nav
        className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/95 backdrop-blur sm:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="grid grid-cols-5 items-end">
          <Tab href="/" label="Home" icon={Home} on={pathname === "/"} />
          <Tab href="/leaderboards" label="Boards" icon={Trophy} on={active("/leaderboards") || active("/combo")} />
          <Link href={me ? "/log" : "/login?next=/log"} className="flex flex-col items-center pb-1.5" aria-label="Log a lap">
            <span className="-mt-5 grid h-14 w-14 place-items-center rounded-full bg-accent text-accent-ink shadow-card transition-transform active:scale-90">
              <Plus size={28} strokeWidth={3} />
            </span>
            <span className="mt-0.5 text-[10px] font-bold">Log lap</span>
          </Link>
          <Tab href="/h2h" label="H2H" icon={Swords} on={active("/h2h")} />
          <Tab href="/crews" label="Crews" icon={Users} on={active("/crews")} />
        </div>
      </nav>
    </>
  );
}

function MenuLink({ href, icon: Icon, label, close }: { href: string; icon: typeof User; label: string; close: (v: boolean) => void }) {
  return (
    <Link href={href} onClick={() => close(false)} className="flex items-center gap-2 rounded-lg px-3 py-2.5 hover:bg-surface-2">
      <Icon size={16} /> {label}
    </Link>
  );
}

function Tab({ href, label, icon: Icon, on }: { href: string; label: string; icon: typeof User; on: boolean }) {
  return (
    <Link href={href} className={`flex min-h-[56px] flex-col items-center justify-center gap-0.5 text-[10px] font-bold ${on ? "text-accent" : "text-muted"}`}>
      <Icon size={20} />
      {label}
    </Link>
  );
}
