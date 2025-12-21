import {
  getCachedInstallationAccessToken,
  setCachedInstallationAccessToken,
} from './cache'
import { App } from 'octokit'

interface GitHubAppConfig {
  appId: string
  privateKey: string
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
  const {
    data: { id: installationId },
  } = await octokit.rest.apps.getRepoInstallation({
    owner,
    repo,
  })

  const cached = await getCachedInstallationAccessToken(installationId)
  if (cached) return cached

  const { data } = await octokit.rest.apps.createInstallationAccessToken({
    installation_id: installationId,
  })

  await setCachedInstallationAccessToken({
    installationId,
    token: data.token,
    expiresAt: data.expires_at,
  })

  return data.token
}
