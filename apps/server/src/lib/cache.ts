import { createStorage, type Storage, type Driver } from 'unstorage'
import memoryDriver from 'unstorage/drivers/memory'

export interface InstallationAccessTokenCacheItem {
  installationId: number
  token: string
  expiresAt: string
}

let storage: Storage<InstallationAccessTokenCacheItem>

export function initTokenCache(driver?: Driver): void {
  storage = createStorage<InstallationAccessTokenCacheItem>({
    driver: driver ?? memoryDriver(),
  })
}

function getStorage(): Storage<InstallationAccessTokenCacheItem> {
  if (!storage) {
    initTokenCache()
  }
  return storage
}

function getCachedInstallationAccessTokenKey(installationId: number): string {
  return `installation-access-token:${installationId}`
}

export async function getCachedInstallationAccessToken(
  installationId: number,
): Promise<string | null> {
  const entry = await getStorage().getItem(
    getCachedInstallationAccessTokenKey(installationId),
  )
  if (!entry) return null

  const expiresAt = new Date(entry.expiresAt).getTime()
  const now = Date.now()
  const buffer = 5 * 60 * 1000 // 5 minutes buffer

  if (now >= expiresAt - buffer) {
    await getStorage().removeItem(
      getCachedInstallationAccessTokenKey(installationId),
    )
    return null
  }

  return entry.token
}

export async function setCachedInstallationAccessToken(
  entry: InstallationAccessTokenCacheItem,
): Promise<void> {
  const expiresAt = new Date(entry.expiresAt).getTime()
  const now = Date.now()
  const ttl = Math.floor((expiresAt - now) / 1000)

  if (ttl <= 0) return

  await getStorage().setItem(
    getCachedInstallationAccessTokenKey(entry.installationId),
    entry,
    { ttl },
  )
}
