import {
  createContext,
  useContext,
  useMemo,
  useState,
  useCallback,
  useEffect,
  useRef,
  type ReactNode,
} from "react";
import {
  GiscoreClient,
  openLoginPopup,
  exchangeSession,
  saveSession,
  loadSession,
  clearSession,
  type GiscoreConfig,
} from "@giscore/core";

interface GiscoreContextValue {
  client: GiscoreClient;
  config: GiscoreConfig;
  token: string | undefined;
  session: string | undefined;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: () => void;
  logout: () => void;
  setToken: (token: string | undefined) => void;
}

const GiscoreContext = createContext<GiscoreContextValue | null>(null);

export interface GiscoreProviderProps {
  config: GiscoreConfig;
  children: ReactNode;
  persistSession?: boolean;
}

export function GiscoreProvider({
  config,
  children,
  persistSession = true,
}: GiscoreProviderProps) {
  const [token, setTokenState] = useState<string | undefined>(config.token);
  const [session, setSession] = useState<string | undefined>();
  const [isLoading, setIsLoading] = useState(false);
  const popupRef = useRef<Window | null>(null);
  const pollIntervalRef = useRef<number | undefined>(undefined);

  const client = useMemo(
    () => new GiscoreClient({ ...config, token }),
    [
      config.serverUrl,
      config.repo,
      config.category,
      config.term,
      config.strict,
      token,
    ]
  );

  // Restore session from localStorage on mount
  useEffect(() => {
    if (!persistSession || token) return;

    const savedSession = loadSession();
    if (savedSession) {
      setIsLoading(true);
      exchangeSession(config.serverUrl, savedSession)
        .then((t) => {
          setSession(savedSession);
          setTokenState(t);
        })
        .catch(() => {
          clearSession();
        })
        .finally(() => {
          setIsLoading(false);
        });
    }
  }, [config.serverUrl, persistSession, token]);

  const setToken = useCallback((newToken: string | undefined) => {
    setTokenState(newToken);
  }, []);

  const login = useCallback(() => {
    const redirectUri = `${window.location.origin}/oauth/callback`;

    popupRef.current = openLoginPopup({
      serverUrl: config.serverUrl,
      redirectUri,
    });

    if (!popupRef.current) {
      // Popup blocked, fall back to redirect
      const params = new URLSearchParams({ redirect_uri: window.location.href });
      window.location.href = `${config.serverUrl}/oauth/authorize?${params}`;
      return;
    }

    // Poll for popup closure and check for session in opener
    pollIntervalRef.current = window.setInterval(() => {
      if (popupRef.current?.closed) {
        window.clearInterval(pollIntervalRef.current);
        popupRef.current = null;
      }
    }, 500);
  }, [config.serverUrl]);

  const logout = useCallback(() => {
    setTokenState(undefined);
    setSession(undefined);
    if (persistSession) {
      clearSession();
    }
  }, [persistSession]);

  // Handle OAuth callback message from popup
  useEffect(() => {
    const handleMessage = async (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;

      const data = event.data as {
        type?: string;
        session?: string;
        error?: string;
      };

      if (data.type === "giscore-oauth-callback") {
        if (popupRef.current) {
          popupRef.current.close();
          popupRef.current = null;
        }
        if (pollIntervalRef.current) {
          window.clearInterval(pollIntervalRef.current);
        }

        if (data.session) {
          setIsLoading(true);
          try {
            const t = await exchangeSession(config.serverUrl, data.session);
            setSession(data.session);
            setTokenState(t);
            if (persistSession) {
              saveSession(data.session);
            }
          } catch {
            // Session exchange failed
          } finally {
            setIsLoading(false);
          }
        }
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [config.serverUrl, persistSession]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) {
        window.clearInterval(pollIntervalRef.current);
      }
    };
  }, []);

  const value = useMemo(
    () => ({
      client,
      config: { ...config, token },
      token,
      session,
      isAuthenticated: !!token,
      isLoading,
      login,
      logout,
      setToken,
    }),
    [client, config, token, session, isLoading, login, logout, setToken]
  );

  return (
    <GiscoreContext.Provider value={value}>{children}</GiscoreContext.Provider>
  );
}

export function useGiscore() {
  const context = useContext(GiscoreContext);
  if (!context) {
    throw new Error("useGiscore must be used within a GiscoreProvider");
  }
  return context;
}
