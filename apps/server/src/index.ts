import { Hono } from "hono";
import { cors } from "hono/cors";
import { HTTPException } from "hono/http-exception";
import { serve } from "@hono/node-server";
import { oauth } from "./routes/oauth";
import { discussion } from "./routes/discussion";

const app = new Hono();

app.use("*", cors({ origin: "*" }));

app.onError((err, c) => {
  const isDev = process.env.NODE_ENV !== "production";

  if (err instanceof HTTPException) {
    return c.json(
      {
        error: err.message,
        ...(isDev && { stack: err.stack }),
      },
      err.status
    );
  }

  console.error(err);

  return c.json(
    {
      error: isDev ? err.message : "Internal Server Error",
      ...(isDev && { stack: err.stack }),
    },
    500
  );
});

const routes = app
  .route("/oauth", oauth)
  .route("/discussion", discussion)
  .get("/", (c) => c.json({ status: "ok" }));

// Node.js local dev
if (process.env.NODE_ENV !== "production" || process.env.RUNTIME === "node") {
  const port = Number(process.env.PORT) || 4000;
  serve({ fetch: routes.fetch, port });
  console.log(`Server running on http://localhost:${port}`);
}

export default routes;
export type AppType = typeof routes;
