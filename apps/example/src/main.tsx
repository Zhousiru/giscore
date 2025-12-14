import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { GiscoreProvider } from "@giscore/react";
import "./index.css";
import App from "./App";
import { OAuthCallback } from "./OAuthCallback";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60,
      retry: 1,
    },
  },
});

const giscoreConfig = {
  serverUrl: import.meta.env.VITE_GISCORE_SERVER_URL || "http://localhost:8787",
  repo: import.meta.env.VITE_GISCORE_REPO || "owner/repo",
  category: import.meta.env.VITE_GISCORE_CATEGORY,
  term: import.meta.env.VITE_GISCORE_TERM,
  strict: import.meta.env.VITE_GISCORE_STRICT === "true",
};

function Router() {
  const path = window.location.pathname;

  if (path === "/oauth/callback") {
    return <OAuthCallback />;
  }

  return <App />;
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <GiscoreProvider config={giscoreConfig}>
        <Router />
      </GiscoreProvider>
    </QueryClientProvider>
  </StrictMode>
);
