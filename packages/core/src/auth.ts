export interface PopupLoginOptions {
  serverUrl: string;
  redirectUri?: string;
  width?: number;
  height?: number;
  onSuccess?: (token: string) => void;
  onError?: (error: Error) => void;
}

export interface AuthState {
  session: string | null;
  token: string | null;
}

const POPUP_WIDTH = 500;
const POPUP_HEIGHT = 700;
const STORAGE_KEY = "giscore_session";

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

export async function exchangeSession(
  serverUrl: string,
  session: string
): Promise<string> {
  const response = await fetch(`${serverUrl}/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ session }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(
      (error as { message?: string }).message || "Failed to exchange session"
    );
  }

  const data = (await response.json()) as { token: string };
  return data.token;
}

export function saveSession(session: string): void {
  try {
    localStorage.setItem(STORAGE_KEY, session);
  } catch {
    // localStorage not available
  }
}

export function loadSession(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

export function clearSession(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // localStorage not available
  }
}

export function parseCallbackParams(): {
  session: string | null;
  error: string | null;
} {
  const params = new URLSearchParams(window.location.search);
  return {
    session: params.get("giscore"),
    error: params.get("giscore_error"),
  };
}

export type LoginResult =
  | { success: true; session: string }
  | { success: false; error: string };

export function createLoginHandler(
  serverUrl: string,
  onResult: (result: LoginResult) => void
): () => void {
  const redirectUri = window.location.origin + "/oauth/callback";

  const handleMessage = (event: MessageEvent) => {
    if (event.origin !== window.location.origin) return;

    const data = event.data as { type?: string; session?: string; error?: string };
    if (data.type === "giscore-oauth-callback") {
      if (data.session) {
        onResult({ success: true, session: data.session });
      } else if (data.error) {
        onResult({ success: false, error: data.error });
      }
    }
  };

  window.addEventListener("message", handleMessage);
  openLoginPopup({ serverUrl, redirectUri });

  return () => window.removeEventListener("message", handleMessage);
}
