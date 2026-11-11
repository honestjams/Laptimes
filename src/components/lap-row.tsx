import Link from "next/link";
import { Paperclip } from "lucide-react";
import { DriverLink, TimeChip, Verified } from "@/components/ui";
import { formatDate, trackLabel } from "@/lib/time";
import type { LapFull, LapStatus } from "@/lib/types";

/** One lap in a feed: who, where, in what, and the coloured time. */
export function LapRow({ lap, status, showDriver = true }: { lap: LapFull; status: LapStatus; showDriver?: boolean }) {
  return (
    <li className="flex items-center gap-3 px-4 py-3">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
          {showDriver && <DriverLink d={lap.driver} />}
          {status === "record" && <span className="tag !bg-record-bg !text-record">Record</span>}
          <Verified on={lap.is_verified} />
          {lap.has_files && <Paperclip size={13} className="text-muted" aria-label="Has files" />}
        </div>
        <Link href={`/combo/${lap.track_id}/${lap.car_id}`} className="block truncate text-sm text-muted hover:text-ink">
          {trackLabel(lap.track)} · {lap.car.name}
        </Link>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-0.5">
        <Link href={`/laps/${lap.id}`} aria-label="Open lap">
          <TimeChip ms={lap.time_ms} status={status} />
        </Link>
        <span className="text-[11px] text-muted">{formatDate(lap.set_on) || "Date unknown"}</span>
      </div>
    </li>
  );
}
