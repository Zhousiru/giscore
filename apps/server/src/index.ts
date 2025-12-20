import { Hono } from "hono";
import { cors } from "hono/cors";
import { HTTPException } from "hono/http-exception";
import { serve } from "@hono/node-server";
import { oauthRoutes } from "./routes/oauth";
import { discussionRoutes } from "./routes/discussion";
import { Fail, Ok } from "./lib/resp";

const app = new Hono();

app.use("*", cors({ origin: ["http://localhost:3000"], credentials: true }));

app.onError((err, c) => {
  console.error(err);

  if (err instanceof HTTPException) {
    return c.json(Fail(err.message), err.status);
  }

  return c.json(Fail("internal server error"), 500);
});

const routes = app
  .route("/oauth", oauthRoutes)
  .route("/discussion", discussionRoutes)
  .get("/health", (c) => c.json(Ok(null)));

const port = Number(process.env.PORT) || 4000;
serve({ fetch: routes.fetch, port });
console.log(`Server running on http://localhost:${port}`);

export type AppType = typeof routes;
