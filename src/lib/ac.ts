"use client";
// "Install to my Assetto Corsa folder", using the browser's File System Access API
// (Chrome and Edge on desktop). The user picks their "Documents/Assetto Corsa"
// folder once; the browser remembers the handle in IndexedDB on this device only.
import type { FileKind } from "@/lib/types";

type DirHandle = FileSystemDirectoryHandle & {
  queryPermission?: (o: { mode: "readwrite" }) => Promise<PermissionState>;
  requestPermission?: (o: { mode: "readwrite" }) => Promise<PermissionState>;
};

const DB = "laptimes";
const STORE = "handles";
const KEY = "ac-documents";

export function supportsFolderAccess(): boolean {
  return typeof window !== "undefined" && "showDirectoryPicker" in window;
}

function idb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
async function idbOp<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await idb();
  return new Promise((resolve, reject) => {
    const req = fn(db.transaction(STORE, mode).objectStore(STORE));
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function getAcFolder(): Promise<DirHandle | null> {
  if (!supportsFolderAccess()) return null;
  try {
    return ((await idbOp("readonly", (s) => s.get(KEY))) as DirHandle | undefined) ?? null;
  } catch {
    return null;
  }
}

export async function forgetAcFolder() {
  await idbOp("readwrite", (s) => s.delete(KEY));
}

/** Opens the folder picker. Returns the folder and whether it looks like the right one. */
export async function pickAcFolder(): Promise<{ name: string; looksRight: boolean }> {
  const picker = (window as unknown as { showDirectoryPicker: (o: object) => Promise<DirHandle> }).showDirectoryPicker;
  const handle = await picker({ id: "ac-documents", mode: "readwrite", startIn: "documents" });
  await idbOp("readwrite", (s) => s.put(handle, KEY));
  let looksRight = false;
  for (const probe of ["setups", "cfg", "replay", "ghostcar"]) {
    try {
      await handle.getDirectoryHandle(probe);
      looksRight = true;
      break;
    } catch {}
  }
  return { name: handle.name, looksRight };
}

/**
 * Where a file belongs inside "Documents/Assetto Corsa".
 * Returns null when we can't place it (missing folder names, or a kind AC doesn't load from Documents).
 */
export function installPath(kind: FileKind, trackFolder: string | null, carFolder: string | null): string[] | null {
  if (kind === "setup") return trackFolder && carFolder ? ["setups", carFolder, trackFolder] : null;
  if (kind === "ghost") return trackFolder ? ["ghostcar", trackFolder] : null;
  if (kind === "replay") return ["replay"];
  return null;
}

/** Writes the file into the chosen folder and returns the path it ended up at. */
export async function installToAc(blob: Blob, filename: string, dirs: string[]): Promise<string> {
  const root = await getAcFolder();
  if (!root) throw new Error("Choose your Assetto Corsa folder in Settings first.");
  if ((await root.queryPermission?.({ mode: "readwrite" })) !== "granted") {
    if ((await root.requestPermission?.({ mode: "readwrite" })) !== "granted") throw new Error("The browser was not given permission to write to that folder.");
  }
  let dir: FileSystemDirectoryHandle = root;
  for (const d of dirs) dir = await dir.getDirectoryHandle(d, { create: true });
  const safe = filename.replace(/[\\/:*?"<>|]/g, "_");
  const file = await dir.getFileHandle(safe, { create: true });
  const w = await file.createWritable();
  await w.write(blob);
  await w.close();
  return [root.name, ...dirs, safe].join("/");
}

export function guessKind(filename: string): FileKind {
  const ext = filename.toLowerCase().split(".").pop() ?? "";
  if (ext === "ghost") return "ghost";
  if (ext === "ini") return "setup";
  if (ext === "acreplay") return "replay";
  if (["png", "jpg", "jpeg", "webp", "gif"].includes(ext)) return "screenshot";
  return "other";
}

export const MAX_FILE_BYTES = 50 * 1024 * 1024;

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}
