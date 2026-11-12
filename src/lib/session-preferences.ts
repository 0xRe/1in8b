export function readSessionPreference(key: string): string | null {
  try { return sessionStorage.getItem(key); } catch { return null; }
}
