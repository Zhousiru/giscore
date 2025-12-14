import { useEffect } from "react";
import { parseCallbackParams } from "@giscore/core";

export function OAuthCallback() {
  useEffect(() => {
    const { session, error } = parseCallbackParams();

    // Send message to opener (parent window)
    if (window.opener) {
      window.opener.postMessage(
        {
          type: "giscore-oauth-callback",
          session,
          error,
        },
        window.location.origin
      );
      window.close();
    } else {
      // If no opener (direct navigation), redirect to home with session
      const url = new URL("/", window.location.origin);
      if (session) {
        url.searchParams.set("giscore", session);
      }
      window.location.href = url.toString();
    }
  }, []);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <div className="mb-4 h-8 w-8 mx-auto animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
        <p className="text-gray-600">Completing sign in...</p>
      </div>
    </div>
  );
}
