const DB = "1in8bn-local",
  STORE = "saves";
let expected: string | null | undefined;
export class SaveConflict extends Error {}
function db(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const r = indexedDB.open(DB, 1);
    r.onupgradeneeded = () => r.result.createObjectStore(STORE);
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
}
export async function readLocalSave(): Promise<string | null> {
  const d = await db();
  try {
    return await new Promise((resolve, reject) => {
      const r = d.transaction(STORE).objectStore(STORE).get("current");
      r.onsuccess = () => {
        expected = r.result ?? null;
        // Legacy localStorage is optional: embedded/private browsing can deny it
        // even when the current IndexedDB store is available.
        let legacy: string | null = null;
        if (r.result == null) {
          try { legacy = localStorage.getItem("1in8bn-save-v1"); } catch { /* No accessible legacy save. */ }
        }
        resolve(r.result ?? legacy);
      };
      r.onerror = () => reject(r.error);
    });
  } finally {
    d.close();
  }
}
export type MetadataChange = readonly [string, string | null];
async function persist(text: string, metadata:readonly MetadataChange[] = []) {
  const d = await db();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = d.transaction(STORE, "readwrite");
      const store = tx.objectStore(STORE);
      let failure: unknown;
      const applied: [string,string|null][]=[];
      const rollback=()=>{
        for (const [key,previous] of applied.reverse()) {
          if(previous===null)localStorage.removeItem(key);
          else localStorage.setItem(key,previous);
        }
        applied.length=0;
      };
      const current = store.get("current");
      current.onsuccess = () => {
        if (expected === undefined || (current.result ?? null) !== expected) {
          failure = new SaveConflict("Save changed in another tab");
          tx.abort();
          return;
        }
        try {
          // This runs only after the queued compare-and-swap check succeeds.
          // A later request/transaction failure restores the exact metadata values.
          const previous=metadata.map(([key])=>[key,localStorage.getItem(key)] as [string,string|null]);
          store.put(text, "current");
          metadata.forEach(([key,value],index)=>{
            if (value === null) localStorage.removeItem(key);
            else localStorage.setItem(key,value);
            applied.push(previous[index]);
          });
        } catch(error) { failure=error;tx.abort(); }
      };
      tx.oncomplete = () => {
        expected = text;
        resolve();
      };
      // Reject after abort has rolled the IndexedDB write back, and restore
      // metadata before the caller can show failure or resume the old life.
      tx.onabort = () => {
        try { rollback(); } catch(error) { reject(error);return; }
        reject(failure ?? tx.error ?? new Error("Save aborted"));
      };
    });
  } finally {
    d.close();
  }
}
let pending: Promise<void> = Promise.resolve();
export function writeLocalSave(text: string, metadata:readonly MetadataChange[] = []) {
  // Keep rapid timer updates, imports and navigation flushes in call order.
  const next = pending.then(
    () => persist(text,metadata),
    () => persist(text,metadata),
  );
  pending = next.catch(() => {});
  return next;
}
