"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Plus } from "lucide-react";

export type Option = { id: number; label: string; hint?: string | null };

/** Type-to-filter pick-list, with an "add new" row when nothing matches. */
export function Combobox({
  label,
  options,
  value,
  onChange,
  onCreate,
  placeholder,
}: {
  label: string;
  options: Option[];
  value: number | null;
  onChange: (id: number | null) => void;
  onCreate?: (text: string) => void;
  placeholder?: string;
}) {
  const id = useId();
  const wrap = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [hi, setHi] = useState(0);
  const selected = options.find((o) => o.id === value) ?? null;

  const matches = useMemo(() => {
    const q = text.trim().toLowerCase();
    const words = q.split(/\s+/).filter(Boolean);
    // Name matches beat matches on the hint (country, class), and "starts with" beats "contains".
    const rank = (o: Option) => {
      const label = o.label.toLowerCase();
      if (label.startsWith(q)) return 0;
      if (words.every((w) => label.includes(w))) return 1;
      return 2;
    };
    return options
      .filter((o) => words.every((w) => `${o.label} ${o.hint ?? ""}`.toLowerCase().includes(w)))
      .map((o) => ({ o, r: rank(o) }))
      .sort((a, b) => a.r - b.r)
      .map((x) => x.o)
      .slice(0, 50);
  }, [options, text]);
  const canCreate = !!onCreate && text.trim().length >= 2 && !options.some((o) => o.label.toLowerCase() === text.trim().toLowerCase());
  const total = matches.length + (canCreate ? 1 : 0);

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (!wrap.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const choose = (i: number) => {
    if (i < matches.length) onChange(matches[i].id);
    else if (canCreate) onCreate!(text.trim());
    setOpen(false);
    setText("");
  };

  return (
    <div ref={wrap} className="relative">
      <label className="label" htmlFor={id}>{label}</label>
      <div className="relative">
        <input
          id={id}
          role="combobox"
          aria-expanded={open}
          aria-controls={`${id}-list`}
          aria-autocomplete="list"
          autoComplete="off"
          className="field !pr-10"
          placeholder={selected ? selected.label : placeholder}
          value={open ? text : (selected?.label ?? "")}
          onFocus={() => {
            setOpen(true);
            setText("");
            setHi(0);
          }}
          onChange={(e) => {
            setText(e.target.value);
            setOpen(true);
            setHi(0);
          }}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setOpen(true);
              setHi((h) => Math.min(h + 1, total - 1));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setHi((h) => Math.max(h - 1, 0));
            } else if (e.key === "Enter" && open && total > 0) {
              e.preventDefault();
              choose(hi);
            }
            else if (e.key === "Escape") setOpen(false);
          }}
        />
        <ChevronDown size={18} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted" />
      </div>
      {open && (
        <ul id={`${id}-list`} role="listbox" className="card absolute z-30 mt-1 max-h-64 w-full overflow-auto p-1">
          {matches.map((o, i) => (
            <li
              key={o.id}
              role="option"
              aria-selected={o.id === value}
              onMouseDown={(e) => (e.preventDefault(), choose(i))}
              onMouseEnter={() => setHi(i)}
              className={`flex min-h-[44px] cursor-pointer items-center gap-2 rounded-lg px-3 py-2 ${hi === i ? "bg-surface-2" : ""}`}
            >
              <span className="min-w-0 flex-1">
                <span className="block truncate font-semibold">{o.label}</span>
                {o.hint && <span className="block truncate text-xs text-muted">{o.hint}</span>}
              </span>
              {o.id === value && <Check size={16} className="text-accent" />}
            </li>
          ))}
          {canCreate && (
            <li
              role="option"
              aria-selected={false}
              onMouseDown={(e) => (e.preventDefault(), choose(matches.length))}
              onMouseEnter={() => setHi(matches.length)}
              className={`flex min-h-[44px] cursor-pointer items-center gap-2 rounded-lg px-3 py-2 font-bold text-accent ${hi === matches.length ? "bg-surface-2" : ""}`}
            >
              <Plus size={16} strokeWidth={3} /> Add “{text.trim()}”
            </li>
          )}
          {total === 0 && <li className="px-3 py-3 text-sm text-muted">No matches. Keep typing to add a new one.</li>}
        </ul>
      )}
    </div>
  );
}
