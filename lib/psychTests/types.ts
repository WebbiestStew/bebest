// A "structured" test is one the app can score itself: the psychologist
// picks an option per item and the app computes subscale scores and an
// interpretation instantly, instead of the therapist doing it by hand in a
// separate .xlsx. Every item's scoring is fully explicit per option — no
// shared "reverse flag" — because several of these instruments (Barratt,
// EHS) score some items on a completely different point curve than others,
// and a flag-based shortcut invites exactly the kind of transcription bug
// this file exists to avoid.

export interface TestOption {
  label: string;
  points: number;
}

export interface TestItem {
  id: number;
  text?: string;
  options: TestOption[];
}

export interface TestSubscale {
  id: string;
  label: string;
  itemIds: number[];
  min: number;
  max: number;
  // CRI-A's global norm converts a raw sum to a T-score: T = (raw-mean)/sd*10+50.
  transform?: { mean: number; sd: number };
  highText?: string;
  lowText?: string;
  // Per-subscale override for PsychTestDefinition.bands below — SCID-II
  // needs this since each of its 12 styles has its own DSM-criteria cutoff
  // (e.g. Avoidant needs >4 of 7, Dependent needs >5 of 8), not a shared
  // percent-of-range scheme every other digitized test here uses.
  bands?: ScoreBand[];
}

export interface ScoreBand {
  // Inclusive upper bound on percent-of-range (0-1) for this band.
  max: number;
  label: string;
}

export interface PsychTestDefinition {
  id: string;
  name: string;
  reference?: string;
  note?: string;
  items: TestItem[];
  subscales: TestSubscale[];
  // Percent-of-(max-min) bands applied per subscale and to the total,
  // ascending order, last entry should have max: 1.
  bands?: ScoreBand[];
  // When present, a synthetic "total" subscale is computed over exactly
  // these item ids (usually all of them) and shown alongside the named
  // subscales above.
  totalItemIds?: number[];
  totalLabel?: string;
}

export type TestResponses = Record<number, number>; // itemId -> option index

export interface SubscaleResult {
  id: string;
  label: string;
  raw: number;
  min: number;
  max: number;
  percent: number; // 0-1, of (max-min)
  tScore?: number;
  band?: string;
  highText?: string;
  lowText?: string;
}

export interface TestResult {
  subscales: SubscaleResult[];
  total?: SubscaleResult;
  complete: boolean; // every item has a response
  summary: string; // human-readable paragraph, same shape as a hand-typed interpretación
}
