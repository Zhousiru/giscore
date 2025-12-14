import { createJWT } from "./jwt";
import { getCachedToken, setCachedToken } from "./cache";

const GITHUB_API_HOST = "https://api.github.com";

interface AppConfig {
  appId: string;
  privateKey: string;
}

interface InstallationResponse {
  id?: number;
  message?: string;
}

interface AccessTokenResponse {
  token: string;
  expires_at: string;
  permissions: {
    discussions: string;
    metadata: string;
  };
  repository_selection: string;
}

async function getInstallationId(
  repoWithOwner: string,
  jwt: string
): Promise<number> {
  const response = await fetch(
    `${GITHUB_API_HOST}/repos/${repoWithOwner}/installation`,
    {
      headers: {
        Authorization: `Bearer ${jwt}`,
        Accept: "application/vnd.github.v3+json",
      },
    }
  );

  const data = (await response.json()) as InstallationResponse;

  if (!data.id) {
    throw new Error(
      data.message ?? "Giscore is not installed on this repository"
    );
  }

  return data.id;
}

export async function getAppAccessToken(
  repoWithOwner: string,
  config: AppConfig
): Promise<string> {
  const jwt = await createJWT(config.appId, config.privateKey);
  const installationId = await getInstallationId(repoWithOwner, jwt);

  const cached = await getCachedToken(installationId);
  if (cached) return cached;

  const response = await fetch(
    `${GITHUB_API_HOST}/app/installations/${installationId}/access_tokens`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${jwt}`,
        Accept: "application/vnd.github.v3+json",
      },
    }
  );

  if (!response.ok) {
    throw new Error("Failed to fetch access token");
  }

  const data = (await response.json()) as AccessTokenResponse;

  await setCachedToken({
    installationId,
    token: data.token,
    expiresAt: data.expires_at,
  });

  return data.token;
}
