export interface PopupLoginOptions {
  serverUrl: string;
  redirectUri?: string;
  width?: number;
  height?: number;
  onSuccess?: (token: string) => void;
  onError?: (error: Error) => void;
}

const POPUP_WIDTH = 500;
const POPUP_HEIGHT = 700;

function getPopupPosition(width: number, height: number) {
  const left = window.screenX + (window.outerWidth - width) / 2;
  const top = window.screenY + (window.outerHeight - height) / 2;
  return { left, top };
}

export function openLoginPopup(options: PopupLoginOptions): Window | null {
  const {
    serverUrl,
    redirectUri = window.location.origin + "/oauth/callback",
    width = POPUP_WIDTH,
    height = POPUP_HEIGHT,
  } = options;

  const { left, top } = getPopupPosition(width, height);
  const params = new URLSearchParams({ redirect_uri: redirectUri });
  const url = `${serverUrl}/oauth/authorize?${params}`;

  const popup = window.open(
    url,
    "giscore-login",
    `width=${width},height=${height},left=${left},top=${top},popup=yes`
  );

  return popup;
}

export async function exchangeSession(serverUrl: string): Promise<string> {
  const response = await fetch(`${serverUrl}/oauth/token`, {
    method: "GET",
    credentials: "include",
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(
      (error as { msg?: string }).msg || "Failed to exchange session"
    );
  }

  const data = (await response.json()) as { data: { token: string } };
  return data.data.token;
}

export function parseCallbackParams(): {
  error: string | null;
} {
  const params = new URLSearchParams(window.location.search);
  return {
    error: params.get("giscore_error"),
  };
}

export type LoginResult = { success: true } | { success: false; error: string };

export function createLoginHandler(
  serverUrl: string,
  onResult: (result: LoginResult) => void
): () => void {
  const redirectUri = window.location.origin + "/oauth/callback";

  const handleMessage = (event: MessageEvent) => {
    if (event.origin !== window.location.origin) return;

    const data = event.data as { type?: string; error?: string };
    if (data.type === "giscore-oauth-callback") {
      if (data.error) {
        onResult({ success: false, error: data.error });
      } else {
        onResult({ success: true });
      }
    }
  };

  window.addEventListener("message", handleMessage);
  openLoginPopup({ serverUrl, redirectUri });

  return () => window.removeEventListener("message", handleMessage);
}
