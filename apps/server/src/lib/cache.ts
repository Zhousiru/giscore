import { createStorage, type Storage, type Driver } from "unstorage";
import memoryDriver from "unstorage/drivers/memory";

export interface TokenCacheEntry {
  installationId: number;
  token: string;
  expiresAt: string;
}

let storage: Storage<TokenCacheEntry>;

export function initTokenCache(driver?: Driver): void {
  storage = createStorage<TokenCacheEntry>({
    driver: driver ?? memoryDriver(),
  });
}

function getStorage(): Storage<TokenCacheEntry> {
  if (!storage) {
    initTokenCache();
  }
  return storage;
}

function getCacheKey(installationId: number): string {
  return `token:${installationId}`;
}

export async function getCachedToken(
  installationId: number,
): Promise<string | null> {
  const entry = await getStorage().getItem(getCacheKey(installationId));
  if (!entry) return null;

  const expiresAt = new Date(entry.expiresAt).getTime();
  const now = Date.now();
  const buffer = 5 * 60 * 1000; // 5 minutes buffer

  if (now >= expiresAt - buffer) {
    await getStorage().removeItem(getCacheKey(installationId));
    return null;
  }

  return entry.token;
}

export async function setCachedToken(entry: TokenCacheEntry): Promise<void> {
  const expiresAt = new Date(entry.expiresAt).getTime();
  const now = Date.now();
  const ttl = Math.floor((expiresAt - now) / 1000);

  if (ttl <= 0) return;

  await getStorage().setItem(getCacheKey(entry.installationId), entry, { ttl });
}
