export interface UnlivedLife {
  id: string;
  name: string;
  country: string;
  age: number;
  at: number;
  kind: 'abandoned' | 'early_loss';
}

export const UNLIVED_STORAGE_KEY = '1in8bn.unlived.v1';
export const UNLIVED_HIDDEN_KEY = '1in8bn.unlived.hidden';
export const MAX_UNLIVED = 100;

export function getUnlivedLives(): UnlivedLife[] {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') return [];
  try {
    const raw = localStorage.getItem(UNLIVED_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item): item is UnlivedLife =>
        item &&
        typeof item.name === 'string' &&
        typeof item.country === 'string' &&
        typeof item.age === 'number'
    );
  } catch {
    return [];
  }
}

export function addUnlivedLife(entry: {
  name: string;
  country: string;
  age: number;
  kind?: 'abandoned' | 'early_loss';
}): UnlivedLife[] {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') return [];
  try {
    const existing = getUnlivedLives();
    const item: UnlivedLife = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      name: entry.name.trim() || 'Anonymous',
      country: entry.country,
      age: Math.max(0, Math.floor(entry.age)),
      at: Date.now(),
      kind: entry.kind || 'abandoned',
    };
    const updated = [item, ...existing].slice(0, MAX_UNLIVED);
    localStorage.setItem(UNLIVED_STORAGE_KEY, JSON.stringify(updated));
    return updated;
  } catch {
    return [];
  }
}

export function clearUnlivedLives(): void {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') return;
  try {
    localStorage.removeItem(UNLIVED_STORAGE_KEY);
  } catch {}
}

export function isStonesHidden(): boolean {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') return false;
  try {
    return localStorage.getItem(UNLIVED_HIDDEN_KEY) === 'true';
  } catch {
    return false;
  }
}

export function setStonesHidden(hidden: boolean): void {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') return;
  try {
    if (hidden) localStorage.setItem(UNLIVED_HIDDEN_KEY, 'true');
    else localStorage.removeItem(UNLIVED_HIDDEN_KEY);
  } catch {}
}
