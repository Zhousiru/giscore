import { Hono } from "hono";
import { env } from "hono/adapter";
import { HTTPException } from "hono/http-exception";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import {
  GitHubClient,
  parseRepo,
  buildSearchQuery,
  sha1,
} from "@giscore/services";
import { getAppAccessToken } from "../lib/github-app";
import type { Env } from "../env";

const app = new Hono();

function getToken(c: {
  req: { header: (name: string) => string | undefined };
}): string | null {
  const auth = c.req.header("Authorization");
  return auth?.startsWith("Bearer ") ? auth.slice(7) : null;
}

const getQuery = z.object({
  repo: z.string(),
  term: z.string().optional(),
  number: z.string().optional(),
  category: z.string().optional(),
  strict: z.string().optional(),
  first: z.string().optional(),
  last: z.string().optional(),
  after: z.string().optional(),
  before: z.string().optional(),
  replyFirst: z.string().optional(),
});

const createJson = z.object({
  repo: z.string(),
  category: z.string(),
  title: z.string(),
  body: z.string(),
});

const repliesQuery = z.object({
  repo: z.string(),
  commentId: z.string(),
  first: z.string().optional(),
  last: z.string().optional(),
  after: z.string().optional(),
  before: z.string().optional(),
});

const routes = app
  .get("/", zValidator("query", getQuery), async (c) => {
    const {
      repo,
      term,
      number,
      category,
      strict,
      first,
      last,
      after,
      before,
      replyFirst,
    } = c.req.valid("query");

    const parsed = parseRepo(repo);
    if (!parsed) {
      throw new HTTPException(400, { message: "Invalid repo format" });
    }

    let token = getToken(c);
    if (!token) {
      const { GITHUB_APP_ID, GITHUB_APP_PRIVATE_KEY } = env<Env>(c);
      token = await getAppAccessToken(repo, {
        appId: GITHUB_APP_ID,
        privateKey: GITHUB_APP_PRIVATE_KEY,
      });
    }

    const client = new GitHubClient({ token });

    if (number) {
      const discussion = await client.getDiscussion({
        owner: parsed.owner,
        repo: parsed.name,
        number: parseInt(number, 10),
        first: first ? parseInt(first, 10) : undefined,
        last: last ? parseInt(last, 10) : undefined,
        after,
        before,
        replyFirst: replyFirst ? parseInt(replyFirst, 10) : undefined,
      });

      if (!discussion) {
        throw new HTTPException(404, { message: "Discussion not found" });
      }

      return c.json({ data: discussion });
    }

    if (!term) {
      throw new HTTPException(400, { message: "Missing term or number" });
    }

    const isStrict = strict === "true";
    const hash = isStrict ? await sha1(term) : undefined;
    const query = buildSearchQuery({
      repo,
      term,
      strict: isStrict,
      category,
      hash,
    });

    const result = await client.searchDiscussions({
      query,
      first: first ? parseInt(first, 10) : undefined,
      last: last ? parseInt(last, 10) : undefined,
      after,
      before,
    });

    return c.json({ data: result });
  })
  .post("/", zValidator("json", createJson), async (c) => {
    const { repo, category, title, body } = c.req.valid("json");

    const parsed = parseRepo(repo);
    if (!parsed) {
      throw new HTTPException(400, { message: "Invalid repo format" });
    }

    const { GITHUB_APP_ID, GITHUB_APP_PRIVATE_KEY } = env<Env>(c);
    const token = await getAppAccessToken(repo, {
      appId: GITHUB_APP_ID,
      privateKey: GITHUB_APP_PRIVATE_KEY,
    });

    const client = new GitHubClient({ token });

    const repository = await client.getRepository({
      owner: parsed.owner,
      repo: parsed.name,
    });

    if (!repository) {
      throw new HTTPException(404, { message: "Repository not found" });
    }

    const categoryInfo = repository.discussionCategories.nodes.find(
      (cat) => cat.slug === category || cat.name === category
    );

    if (!categoryInfo) {
      throw new HTTPException(404, { message: "Category not found" });
    }

    const hashTag = `<!-- sha1: ${await sha1(title)} -->`;

    const discussion = await client.createDiscussion({
      repositoryId: repository.id,
      categoryId: categoryInfo.id,
      title,
      body: `${body}\n\n${hashTag}`,
    });

    return c.json({ data: discussion });
  })
  .get("/replies", zValidator("query", repliesQuery), async (c) => {
    const { repo, commentId, first, last, after, before } =
      c.req.valid("query");

    const parsed = parseRepo(repo);
    if (!parsed) {
      throw new HTTPException(400, { message: "Invalid repo format" });
    }

    let token = getToken(c);
    if (!token) {
      const { GITHUB_APP_ID, GITHUB_APP_PRIVATE_KEY } = env<Env>(c);
      token = await getAppAccessToken(repo, {
        appId: GITHUB_APP_ID,
        privateKey: GITHUB_APP_PRIVATE_KEY,
      });
    }

    const client = new GitHubClient({ token });

    const replies = await client.getReplies({
      commentId,
      first: first ? parseInt(first, 10) : undefined,
      last: last ? parseInt(last, 10) : undefined,
      after,
      before,
    });

    if (!replies) {
      throw new HTTPException(404, { message: "Comment not found" });
    }

    return c.json({ data: replies });
  });

export const discussionRoutes = routes;
export type DiscussionRoutes = typeof routes;
