export type InputDevice = "wheel" | "controller" | "keyboard";
export type FileKind = "ghost" | "setup" | "replay" | "screenshot" | "other";

export type Profile = {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  bio: string | null;
  is_placeholder: boolean;
  is_admin: boolean;
  created_at: string;
};
export type DriverLite = Pick<Profile, "id" | "username" | "display_name" | "is_placeholder">;

export type Sim = { id: number; slug: string; name: string; sort: number };

export type Track = {
  id: number;
  sim_id: number;
  name: string;
  layout: string;
  country: string | null;
  length_m: number | null;
  ac_folder: string | null;
  ac_layout: string | null;
  is_mod: boolean;
  download_url: string | null;
  image_url: string | null;
  image_credit: string | null;
  image_source_url: string | null;
  created_by: string | null;
};
export type Car = {
  id: number;
  sim_id: number;
  name: string;
  brand: string | null;
  class: string | null;
  ac_folder: string | null;
  is_mod: boolean;
  download_url: string | null;
  image_url: string | null;
  image_credit: string | null;
  image_source_url: string | null;
  created_by: string | null;
};

export type Lap = {
  id: number;
  driver_id: string;
  track_id: number;
  car_id: number;
  time_ms: number;
  s1_ms: number | null;
  s2_ms: number | null;
  s3_ms: number | null;
  set_on: string | null;
  input_device: InputDevice | null;
  tyre: string | null;
  assist_tc: boolean;
  assist_abs: boolean;
  assist_sc: boolean;
  assist_line: boolean;
  assist_auto: boolean;
  track_temp_c: number | null;
  notes: string | null;
  proof_url: string | null;
  has_files: boolean;
  is_verified: boolean;
  is_hidden: boolean;
  created_at: string;
};
export type LapFull = Lap & { driver: DriverLite; track: Track; car: Car };

export type LapFile = {
  id: number;
  lap_id: number;
  kind: FileKind;
  storage_path: string;
  filename: string;
  size_bytes: number;
  uploaded_by: string;
  created_at: string;
};

export type ComboRecord = {
  track_id: number;
  car_id: number;
  lap_id: number;
  driver_id: string;
  time_ms: number;
  set_on: string | null;
  is_verified: boolean;
  driver_count: number;
  driver: DriverLite;
  track: Track;
  car: Car;
};

export type Crew = { id: number; slug: string; name: string; owner_id: string; created_at: string };

/** purple = combo record, green = driver's personal best, amber = anything slower */
export type LapStatus = "record" | "pb" | "slow";

export const ASSISTS = [
  { key: "assist_tc", label: "Traction control", short: "TC" },
  { key: "assist_abs", label: "ABS", short: "ABS" },
  { key: "assist_sc", label: "Stability control", short: "SC" },
  { key: "assist_line", label: "Racing line", short: "Line" },
  { key: "assist_auto", label: "Auto gearbox", short: "Auto" },
] as const;
export type AssistKey = (typeof ASSISTS)[number]["key"];
