import type { PlanBundle } from "../types";
import { mergeSeedFallback } from "./bundle-fallback";
import { createSeedBundle } from "./seed";

const STORAGE_KEY = "ta-journey-local-monthly-v1";
const CLOUD_CACHE_KEY = "ta-journey-cloud-monthly-v1";
let memoryFallback: string | null = null;

function getStorage() {
  try {
    if (typeof window !== "undefined" && window.localStorage) {
      return window.localStorage;
    }
  } catch {
    // Storage can be disabled by the browser.
  }
  return null;
}

export function loadLocalBundle(): PlanBundle {
  const storage = getStorage();
  const raw = storage?.getItem(STORAGE_KEY) ?? memoryFallback;
  const fallback = createSeedBundle();
  if (!raw) return fallback;

  try {
    const parsed = JSON.parse(raw) as PlanBundle;
    if (!parsed.plan || !Array.isArray(parsed.months)) {
      return fallback;
    }
    return mergeSeedFallback(parsed);
  } catch {
    return fallback;
  }
}

export function saveLocalBundle(bundle: PlanBundle) {
  const raw = JSON.stringify(bundle);
  memoryFallback = raw;
  const storage = getStorage();
  try {
    storage?.setItem(STORAGE_KEY, raw);
  } catch {
    // The in-memory copy keeps the current session working.
  }
}

export function loadCloudSnapshot(): PlanBundle | null {
  try {
    const raw = getStorage()?.getItem(CLOUD_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PlanBundle;
    if (!parsed.plan || !Array.isArray(parsed.months)) return null;
    return mergeSeedFallback(parsed);
  } catch {
    return null;
  }
}

export function saveCloudSnapshot(bundle: PlanBundle) {
  const storage = getStorage();
  try {
    storage?.setItem(CLOUD_CACHE_KEY, JSON.stringify(bundle));
  } catch {
    // Cloud data remains available from Supabase when local caching is blocked.
  }
}

export function resetLocalBundle() {
  const storage = getStorage();
  storage?.removeItem(STORAGE_KEY);
  memoryFallback = null;
  return createSeedBundle();
}
