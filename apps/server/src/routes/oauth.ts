import { Hono } from "hono";
import { env } from "hono/adapter";
import { setCookie, getCookie, deleteCookie } from "hono/cookie";
import { HTTPException } from "hono/http-exception";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import type { Env } from "../env";
import { encodeState, decodeState, encodeSession } from "../lib/encryption";
import { IS_DEV } from "../lib/constants";
import { Ok } from "../lib/resp";

const GITHUB_OAUTH_URL = "https://github.com/login/oauth";
const STATE_COOKIE = "giscore_state";
const SESSION_COOKIE = "giscore_session";

const app = new Hono();

const authorizeQuery = z.object({
  redirect_uri: z.string(),
});

const callbackQuery = z.object({
  code: z.string().optional(),
  state: z.string(),
  error: z.string().optional(),
});

const routes = app
  .get("/authorize", zValidator("query", authorizeQuery), async (c) => {
    const { redirect_uri } = c.req.valid("query");
    const { GITHUB_CLIENT_ID, ENCRYPTION_PASSWORD } = env<Env>(c);

    const state = await encodeState(redirect_uri, ENCRYPTION_PASSWORD);

    setCookie(c, STATE_COOKIE, state, {
      httpOnly: true,
      secure: !IS_DEV,
      sameSite: "Lax",
      path: "/oauth",
      maxAge: 5 * 60,
    });

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

    const cookieState = getCookie(c, STATE_COOKIE);
    if (!cookieState || cookieState !== state) {
      throw new HTTPException(400, { message: "state mismatch" });
    }

    const returnUrl = await decodeState(state, ENCRYPTION_PASSWORD);

    const url = new URL(returnUrl);

    // User denied authorization
    if (error === "access_denied") {
      url.searchParams.set("giscore_error", "access_denied");
      return c.redirect(url.toString());
    }

    if (!code) {
      throw new HTTPException(400, { message: "authorization code required" });
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
      throw new HTTPException(500, { message: "failed to exchange code" });
    }

    const data = (await response.json()) as {
      access_token?: string;
      error?: string;
      error_description?: string;
    };

    if (data.error || !data.access_token) {
      throw new HTTPException(400, {
        message: data.error_description ?? data.error ?? "no access token",
      });
    }

    const session = await encodeSession(data.access_token, ENCRYPTION_PASSWORD);

    setCookie(c, SESSION_COOKIE, session, {
      httpOnly: true,
      secure: !IS_DEV,
      sameSite: "Strict",
      path: "/",
      maxAge: 365 * 24 * 60 * 60, // 1 year
    });

    return c.redirect(url.toString());
  })
  .get("/token", async (c) => {
    const session = getCookie(c, SESSION_COOKIE);
    if (!session) {
      throw new HTTPException(401, { message: "no session" });
    }

    const { ENCRYPTION_PASSWORD } = env<Env>(c);

    let token: string;
    try {
      token = await decodeState(session, ENCRYPTION_PASSWORD);
    } catch (err) {
      throw new HTTPException(400, {
        message: err instanceof Error ? err.message : "invalid session",
      });
    }

    return c.json(Ok({ token }));
  })
  .post("/logout", (c) => {
    deleteCookie(c, SESSION_COOKIE, { path: "/" });
    return c.json(Ok(null));
  });

export const oauthRoutes = routes;
export type OAuthRoutes = typeof routes;
