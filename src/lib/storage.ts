// SSR-safe localStorage access. A blocked storage (private mode, cookies off)
// must degrade to an in-memory session, never throw — otherwise the script
// dies on load. Mirrors readStore/writeStore + readRaw/writeRaw from old main.js.

const memory = new Map<string, string>();

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof localStorage !== "undefined";
}

export function readStore<T>(key: string, fallback: T): T {
  try {
    if (!isBrowser()) return memory.has(key) ? (JSON.parse(memory.get(key)!) as T) : fallback;
    const raw = localStorage.getItem(key);
    return raw === null ? fallback : (JSON.parse(raw) as T);
  } catch {
    return fallback;
  }
}

export function writeStore(key: string, value: unknown): boolean {
  try {
    const raw = JSON.stringify(value);
    if (!isBrowser()) {
      memory.set(key, raw);
      return true;
    }
    localStorage.setItem(key, raw);
    return true;
  } catch {
    return false;
  }
}

export function readRaw(key: string, fallback: string | null = null): string | null {
  try {
    if (!isBrowser()) return memory.has(key) ? memory.get(key)! : fallback;
    const raw = localStorage.getItem(key);
    return raw === null ? fallback : raw;
  } catch {
    return fallback;
  }
}

export function writeRaw(key: string, value: string): boolean {
  try {
    if (!isBrowser()) {
      memory.set(key, value);
      return true;
    }
    localStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}
