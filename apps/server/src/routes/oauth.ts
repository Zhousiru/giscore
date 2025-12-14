import { Hono } from "hono";
import { env } from "hono/adapter";
import { HTTPException } from "hono/http-exception";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import type { Env } from "../env";
import { encodeState, decodeState, encodeSession } from "../lib/encryption";

const GITHUB_OAUTH_URL = "https://github.com/login/oauth";

const app = new Hono();

const authorizeQuery = z.object({
  redirect_uri: z.string(),
});

const callbackQuery = z.object({
  code: z.string().optional(),
  state: z.string(),
  error: z.string().optional(),
});

const tokenBody = z.object({
  session: z.string(),
});

const routes = app
  .get("/authorize", zValidator("query", authorizeQuery), async (c) => {
    const { redirect_uri } = c.req.valid("query");
    const { GITHUB_CLIENT_ID, ENCRYPTION_PASSWORD } = env<Env>(c);

    const state = await encodeState(redirect_uri, ENCRYPTION_PASSWORD);

    const params = new URLSearchParams({
      client_id: GITHUB_CLIENT_ID,
      scope: "public_repo",
      state,
    });

    return c.redirect(`${GITHUB_OAUTH_URL}/authorize?${params.toString()}`);
  })
  .get("/callback", zValidator("query", callbackQuery), async (c) => {
    const { code, state, error } = c.req.valid("query");
    const { GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET, ENCRYPTION_PASSWORD } =
      env<Env>(c);

    let returnUrl: string;
    try {
      returnUrl = await decodeState(state, ENCRYPTION_PASSWORD);
    } catch (err) {
      throw new HTTPException(400, {
        message: err instanceof Error ? err.message : "Invalid state",
      });
    }

    const url = new URL(returnUrl);

    // User denied authorization
    if (error === "access_denied") {
      url.searchParams.set("giscore_error", "access_denied");
      return c.redirect(url.toString());
    }

    if (!code) {
      throw new HTTPException(400, { message: "Authorization code required" });
    }

    const response = await fetch(`${GITHUB_OAUTH_URL}/access_token`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        client_id: GITHUB_CLIENT_ID,
        client_secret: GITHUB_CLIENT_SECRET,
        code,
      }),
    });

    if (!response.ok) {
      throw new HTTPException(500, { message: "Failed to exchange code" });
    }

    const data = (await response.json()) as {
      access_token?: string;
      error?: string;
      error_description?: string;
    };

    if (data.error || !data.access_token) {
      throw new HTTPException(400, {
        message: data.error_description ?? data.error ?? "No access token",
      });
    }

    // Encrypt the token as a session
    const session = await encodeSession(data.access_token, ENCRYPTION_PASSWORD);

    url.searchParams.set("giscore", session);
    return c.redirect(url.toString());
  })
  .post("/token", zValidator("json", tokenBody), async (c) => {
    const { session } = c.req.valid("json");
    const { ENCRYPTION_PASSWORD } = env<Env>(c);

    let token: string;
    try {
      token = await decodeState(session, ENCRYPTION_PASSWORD);
    } catch (err) {
      throw new HTTPException(400, {
        message: err instanceof Error ? err.message : "Invalid session",
      });
    }

    return c.json({ token });
  });

export const oauth = routes;
export type OAuthRoutes = typeof routes;
