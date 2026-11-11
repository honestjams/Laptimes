"use client";

import dynamic from "next/dynamic";

// The charting library is the heaviest thing on the site, so it only downloads on profile pages, after the rest has painted.
export const ProfileCharts = dynamic(() => import("@/components/profile-charts").then((m) => m.ProfileCharts), {
  ssr: false,
  loading: () => <div className="card h-96 animate-pulse bg-surface-2" aria-hidden />,
});
