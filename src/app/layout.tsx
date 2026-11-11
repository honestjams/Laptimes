import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Figtree, JetBrains_Mono, Unbounded } from "next/font/google";
import "./globals.css";
import { Nav } from "@/components/nav";
import { getMe } from "@/lib/data";

const figtree = Figtree({ variable: "--font-figtree", subsets: ["latin"] });
const unbounded = Unbounded({ variable: "--font-unbounded", subsets: ["latin"], weight: ["600", "800"] });
const jetbrains = JetBrains_Mono({ variable: "--font-jetbrains", subsets: ["latin"] });

export const metadata: Metadata = {
  title: { default: "Laptimes", template: "%s · Laptimes" },
  description: "Log sim racing lap times, chase your mates, and share ghosts and setups.",
};
export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#0e0f13" },
    { media: "(prefers-color-scheme: light)", color: "#f6f4ef" },
  ],
};

// Runs before first paint so the saved theme never flashes the wrong way.
const themeScript = `try{var t=localStorage.getItem('theme');if(t!=='light'&&t!=='dark'){t=matchMedia('(prefers-color-scheme: light)').matches?'light':'dark'}document.documentElement.dataset.theme=t}catch(e){document.documentElement.dataset.theme='dark'}`;

// The signed-in user is looked up separately so the rest of the page never waits for it.
async function NavWithUser() {
  const me = await getMe();
  return <Nav me={me ? { username: me.username, display_name: me.display_name, is_admin: me.is_admin } : null} />;
}

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      data-theme="dark"
      suppressHydrationWarning
      className={`${figtree.variable} ${unbounded.variable} ${jetbrains.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-full flex flex-col">
        <Suspense fallback={<Nav me={null} pending />}>
          <NavWithUser />
        </Suspense>
        <main className="mx-auto w-full max-w-5xl flex-1 px-4 pt-5 pb-8">{children}</main>
        <footer className="mx-auto w-full max-w-5xl px-4 pb-28 pt-4 text-xs text-muted sm:pb-8">
          <div className="kerb mb-4 opacity-40" />
          Track maps and car photos are from Wikimedia Commons contributors. <Link href="/credits" className="underline hover:text-ink">Image credits</Link>
        </footer>
      </body>
    </html>
  );
}
