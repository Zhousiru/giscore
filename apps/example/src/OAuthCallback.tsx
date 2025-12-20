import { useEffect } from "react";
import { parseCallbackParams } from "@giscore/core";

export function OAuthCallback() {
  useEffect(() => {
    const { error } = parseCallbackParams();

    // Send message to opener (parent window)
    if (window.opener) {
      window.opener.postMessage(
        {
          type: "giscore-oauth-callback",
          error,
        },
        window.location.origin
      );
      window.close();
    } else {
      // If no opener (direct navigation), redirect to home
      window.location.href = "/";
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
