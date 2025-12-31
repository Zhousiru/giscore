import {
  getCache,
  removeCache,
  setInstallationIdCache,
  setAccessTokenCache,
} from './cache'
import { App } from 'octokit'

interface GitHubAppConfig {
  appId: string
  privateKey: string
}

function repoKey(owner: string, repo: string): string {
  return `${owner}/${repo}`
}

export async function invalidateTokenCache(
  owner: string,
  repo: string,
): Promise<void> {
  const key = repoKey(owner, repo)
  await removeCache('installation-id', key)
  await removeCache('access-token', key)
}

export async function getAppAccessToken(
  owner: string,
  repo: string,
  config: GitHubAppConfig,
): Promise<string> {
  const { octokit } = new App({
    appId: config.appId,
    privateKey: config.privateKey,
  })
  const key = repoKey(owner, repo)

  let installationId = await getCache('installation-id', key)
  if (!installationId) {
    installationId = await fetchAndCacheInstallationId(octokit, owner, repo)
  }

  const cached = await getCache('access-token', key)
  if (cached) return cached

  try {
    return await fetchAndCacheAccessToken(octokit, key, installationId)
  } catch {
    await removeCache('installation-id', key)
    await removeCache('access-token', key)
    const freshId = await fetchAndCacheInstallationId(octokit, owner, repo)
    return await fetchAndCacheAccessToken(octokit, key, freshId)
  }
}

async function fetchAndCacheInstallationId(
  octokit: ReturnType<typeof App.prototype.octokit>,
  owner: string,
  repo: string,
): Promise<number> {
  const {
    data: { id },
  } = await octokit.rest.apps.getRepoInstallation({ owner, repo })
  await setInstallationIdCache({ key: repoKey(owner, repo), id })
  return id
}

async function fetchAndCacheAccessToken(
  octokit: ReturnType<typeof App.prototype.octokit>,
  key: string,
  installationId: number,
): Promise<string> {
  const { data } = await octokit.rest.apps.createInstallationAccessToken({
    installation_id: installationId,
  })
  await setAccessTokenCache({
    key,
    token: data.token,
    expiresAt: data.expires_at,
  })
  return data.token
}
