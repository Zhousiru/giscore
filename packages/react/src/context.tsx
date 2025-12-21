import {
  GiscoreClient,
  openLoginPopup,
  exchangeSession,
  type GiscoreConfig,
} from '@giscore/core'
import {
  createContext,
  useContext,
  useMemo,
  useState,
  useCallback,
  useEffect,
  useRef,
  type ReactNode,
} from 'react'

interface GiscoreContextValue {
  client: GiscoreClient
  config: GiscoreConfig
  token: string | undefined
  isAuthenticated: boolean
  isLoading: boolean
  login: () => void
  logout: () => void
  setToken: (token: string | undefined) => void
}

const GiscoreContext = createContext<GiscoreContextValue | null>(null)

export interface GiscoreProviderProps {
  config: GiscoreConfig
  children: ReactNode
}

export function GiscoreProvider({ config, children }: GiscoreProviderProps) {
  const [token, setTokenState] = useState<string | undefined>(config.token)
  const [isLoading, setIsLoading] = useState(false)
  const popupRef = useRef<Window | null>(null)
  const pollIntervalRef = useRef<number | undefined>(undefined)

  const client = useMemo(
    () => new GiscoreClient({ ...config, token }),
    [config, token],
  )

  // Try to restore session from cookie on mount
  useEffect(() => {
    if (token) return

    setIsLoading(true)
    exchangeSession(config.serverUrl)
      .then((t) => {
        setTokenState(t)
      })
      .catch(() => {
        // No valid session cookie
      })
      .finally(() => {
        setIsLoading(false)
      })
  }, [config.serverUrl, token])

  const setToken = useCallback((newToken: string | undefined) => {
    setTokenState(newToken)
  }, [])

  const login = useCallback(() => {
    const redirectUri = `${window.location.origin}/oauth/callback`

    popupRef.current = openLoginPopup({
      serverUrl: config.serverUrl,
      redirectUri,
    })

    if (!popupRef.current) {
      // Popup blocked, fall back to redirect
      const params = new URLSearchParams({
        redirect_uri: window.location.href,
      })
      window.location.href = `${config.serverUrl}/oauth/authorize?${params}`
      return
    }

    // Poll for popup closure
    pollIntervalRef.current = window.setInterval(() => {
      if (popupRef.current?.closed) {
        window.clearInterval(pollIntervalRef.current)
        popupRef.current = null
      }
    }, 500)
  }, [config.serverUrl])

  const logout = useCallback(async () => {
    setTokenState(undefined)
    await fetch(`${config.serverUrl}/oauth/logout`, {
      method: 'POST',
      credentials: 'include',
    }).catch(() => {})
  }, [config.serverUrl])

  // Handle OAuth callback message from popup
  useEffect(() => {
    const handleMessage = async (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return

      const data = event.data as {
        type?: string
        error?: string
      }

      if (data.type === 'giscore-oauth-callback') {
        if (popupRef.current) {
          popupRef.current.close()
          popupRef.current = null
        }
        if (pollIntervalRef.current) {
          window.clearInterval(pollIntervalRef.current)
        }

        if (!data.error) {
          setIsLoading(true)
          try {
            const t = await exchangeSession(config.serverUrl)
            setTokenState(t)
          } catch {
            // Session exchange failed
          } finally {
            setIsLoading(false)
          }
        }
      }
    }

    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [config.serverUrl])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) {
        window.clearInterval(pollIntervalRef.current)
      }
    }
  }, [])

  const value = useMemo(
    () => ({
      client,
      config: { ...config, token },
      token,
      isAuthenticated: !!token,
      isLoading,
      login,
      logout,
      setToken,
    }),
    [client, config, token, isLoading, login, logout, setToken],
  )

  return (
    <GiscoreContext.Provider value={value}>{children}</GiscoreContext.Provider>
  )
}

export function useGiscore() {
  const context = useContext(GiscoreContext)
  if (!context) {
    throw new Error('useGiscore must be used within a GiscoreProvider')
  }
  return context
}
