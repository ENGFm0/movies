import { Router } from "express";
import { z } from "zod";
import { prisma } from "../prisma";
import { config } from "../config";
import { requireAuth, optionalAuth, AuthedRequest } from "../middleware/auth";

// Ratings (stars) and comments for a title, aggregated across all app users.
// A "title" is identified by mediaType ("movie"|"tv") + tmdbId.
export const titlesRouter = Router();

// IMDb rating via OMDb (optional). Returns { configured, imdbRating, imdbVotes }.
// imdbId looks like "tt1234567". Registered before the /:mediaType routes.
titlesRouter.get("/imdb/:imdbId", async (req, res) => {
  const imdbId = req.params.imdbId;
  if (!/^tt\d+$/.test(imdbId)) return res.status(400).json({ error: "Invalid IMDb id" });
  if (!config.omdbApiKey) return res.json({ configured: false });
  try {
    const r = await fetch(
      `https://www.omdbapi.com/?apikey=${config.omdbApiKey}&i=${imdbId}`
    );
    const data = (await r.json()) as { imdbRating?: string; imdbVotes?: string };
    res.json({
      configured: true,
      imdbRating: data.imdbRating && data.imdbRating !== "N/A" ? data.imdbRating : null,
      imdbVotes: data.imdbVotes && data.imdbVotes !== "N/A" ? data.imdbVotes : null,
    });
  } catch {
    res.json({ configured: true, imdbRating: null, imdbVotes: null });
  }
});

function parseParams(req: AuthedRequest) {
  const mediaType = req.params.mediaType === "tv" ? "tv" : "movie";
  const tmdbId = Number(req.params.tmdbId);
  return { mediaType, tmdbId, valid: Number.isInteger(tmdbId) && tmdbId > 0 };
}

const ratingInput = z.object({ stars: z.number().int().min(1).max(5) });
const commentInput = z.object({ body: z.string().trim().min(1).max(1000) });

// Aggregated rating summary + the current user's own rating (if logged in).
titlesRouter.get(
  "/:mediaType/:tmdbId/summary",
  optionalAuth,
  async (req: AuthedRequest, res) => {
    const { mediaType, tmdbId, valid } = parseParams(req);
    if (!valid) return res.status(400).json({ error: "Invalid title id" });

    const agg = await prisma.rating.aggregate({
      where: { mediaType, tmdbId },
      _avg: { stars: true },
      _count: { stars: true },
    });

    let myStars: number | null = null;
    if (req.userId) {
      const mine = await prisma.rating.findUnique({
        where: { userId_tmdbId_mediaType: { userId: req.userId, tmdbId, mediaType } },
      });
      myStars = mine?.stars ?? null;
    }

    const commentCount = await prisma.comment.count({ where: { mediaType, tmdbId } });

    res.json({
      average: agg._avg.stars ? Number(agg._avg.stars.toFixed(2)) : 0,
      count: agg._count.stars,
      commentCount,
      myStars,
    });
  }
);

// Set or update the current user's star rating for a title.
titlesRouter.put(
  "/:mediaType/:tmdbId/rating",
  requireAuth,
  async (req: AuthedRequest, res) => {
    const { mediaType, tmdbId, valid } = parseParams(req);
    if (!valid) return res.status(400).json({ error: "Invalid title id" });
    const parsed = ratingInput.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "stars must be 1..5" });

    const rating = await prisma.rating.upsert({
      where: { userId_tmdbId_mediaType: { userId: req.userId!, tmdbId, mediaType } },
      create: { userId: req.userId!, tmdbId, mediaType, stars: parsed.data.stars },
      update: { stars: parsed.data.stars },
    });
    res.json(rating);
  }
);

// List comments for a title, newest first, with author names.
titlesRouter.get("/:mediaType/:tmdbId/comments", async (req: AuthedRequest, res) => {
  const { mediaType, tmdbId, valid } = parseParams(req);
  if (!valid) return res.status(400).json({ error: "Invalid title id" });

  const comments = await prisma.comment.findMany({
    where: { mediaType, tmdbId },
    orderBy: { createdAt: "desc" },
    include: { user: { select: { id: true, name: true } } },
    take: 100,
  });
  res.json(
    comments.map((c) => ({
      id: c.id,
      body: c.body,
      createdAt: c.createdAt,
      author: c.user.name,
      authorId: c.user.id,
    }))
  );
});

titlesRouter.post(
  "/:mediaType/:tmdbId/comments",
  requireAuth,
  async (req: AuthedRequest, res) => {
    const { mediaType, tmdbId, valid } = parseParams(req);
    if (!valid) return res.status(400).json({ error: "Invalid title id" });
    const parsed = commentInput.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "Comment cannot be empty" });

    const comment = await prisma.comment.create({
      data: { userId: req.userId!, tmdbId, mediaType, body: parsed.data.body },
      include: { user: { select: { id: true, name: true } } },
    });
    res.status(201).json({
      id: comment.id,
      body: comment.body,
      createdAt: comment.createdAt,
      author: comment.user.name,
      authorId: comment.user.id,
    });
  }
);

titlesRouter.delete(
  "/:mediaType/:tmdbId/comments/:commentId",
  requireAuth,
  async (req: AuthedRequest, res) => {
    const result = await prisma.comment.deleteMany({
      where: { id: req.params.commentId, userId: req.userId },
    });
    if (result.count === 0) return res.status(404).json({ error: "Comment not found" });
    res.status(204).end();
  }
);
