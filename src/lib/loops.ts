export type SavedLoop = {
  id: string;
  name: string;
  bpm: number;
  bars: 4 | 8 | 12 | 16;
  steps: number[][];
  createdAt: string;
  visualSeed: number;
};

const STORAGE_KEY = 'aether:saved-loops:v1';

function safeParse(raw: string | null): SavedLoop[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as SavedLoop[];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((loop) => loop && Array.isArray(loop.steps));
  } catch {
    return [];
  }
}

export function getSavedLoops(): SavedLoop[] {
  if (typeof window === 'undefined') return [];
  return safeParse(window.localStorage.getItem(STORAGE_KEY)).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function saveLoop(loop: SavedLoop) {
  if (typeof window === 'undefined') return;
  const current = safeParse(window.localStorage.getItem(STORAGE_KEY));
  const next = [loop, ...current.filter((item) => item.id !== loop.id)].slice(0, 100);
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
}

export function deleteLoop(id: string) {
  if (typeof window === 'undefined') return;
  const current = safeParse(window.localStorage.getItem(STORAGE_KEY));
  const next = current.filter((item) => item.id !== id);
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
}
