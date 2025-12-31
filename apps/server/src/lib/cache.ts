import { createStorage, type Storage, type Driver } from 'unstorage'
import memoryDriver from 'unstorage/drivers/memory'

type CacheType = 'installation-id' | 'access-token'

interface CacheTypeMap {
  'installation-id': number
  'access-token': string
}

let storage: Storage<CacheTypeMap[CacheType]>

export function initCache(driver?: Driver): void {
  storage = createStorage({ driver: driver ?? memoryDriver() })
}

function getStorage(): Storage<CacheTypeMap[CacheType]> {
  if (!storage) initCache()
  return storage
}

function buildKey(type: CacheType, key: string): string {
  return `${type}:${key}`
}

export async function getCache<T extends CacheType>(
  type: T,
  key: string,
): Promise<CacheTypeMap[T] | null> {
  return (await getStorage().getItem(buildKey(type, key))) as
    | CacheTypeMap[T]
    | null
}

export async function setCache<T extends CacheType>(
  type: T,
  key: string,
  value: CacheTypeMap[T],
  ttl?: number,
): Promise<void> {
  await getStorage().setItem(buildKey(type, key), value, {
    ttl,
  })
}

export async function removeCache(type: CacheType, key: string): Promise<void> {
  await getStorage().removeItem(buildKey(type, key))
}

export async function setInstallationIdCache(options: {
  key: string
  id: number
}): Promise<void> {
  await setCache('installation-id', options.key, options.id)
}

export async function setAccessTokenCache(options: {
  key: string
  token: string
  expiresAt: string
}): Promise<void> {
  const buffer = 5 * 60 * 1000
  const ttl = Math.floor(
    (new Date(options.expiresAt).getTime() - Date.now() - buffer) / 1000,
  )
  if (ttl <= 0) return
  await setCache('access-token', options.key, options.token, ttl)
}
