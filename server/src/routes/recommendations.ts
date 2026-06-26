import { Router } from "express";
import { z } from "zod";
import { prisma } from "../prisma";
import { requireAuth, optionalAuth, AuthedRequest } from "../middleware/auth";

// Community recommendations feed ("ترشيحات اليوم" / movie of the night).
export const recommendationsRouter = Router();

const createInput = z.object({
  tmdbId: z.number().int().positive(),
  mediaType: z.enum(["movie", "tv"]),
  title: z.string().trim().min(1).max(300),
  posterPath: z.string().trim().nullable().optional(),
  note: z.string().trim().max(500).optional(),
});

type RecWithRelations = {
  id: string;
  tmdbId: number;
  mediaType: string;
  title: string;
  posterPath: string | null;
  note: string | null;
  createdAt: Date;
  user: { id: string; name: string };
  votes: { value: number; userId: string }[];
  _count: { comments: number };
};

function shapeRec(rec: RecWithRelations, userId?: string) {
  let likes = 0;
  let dislikes = 0;
  let myVote = 0;
  for (const v of rec.votes) {
    if (v.value > 0) likes++;
    else if (v.value < 0) dislikes++;
    if (userId && v.userId === userId) myVote = v.value;
  }
  return {
    id: rec.id,
    tmdbId: rec.tmdbId,
    mediaType: rec.mediaType,
    title: rec.title,
    posterPath: rec.posterPath,
    note: rec.note,
    createdAt: rec.createdAt,
    recommender: rec.user.name,
    recommenderId: rec.user.id,
    likes,
    dislikes,
    score: likes - dislikes,
    commentCount: rec._count.comments,
    myVote,
  };
}

const recInclude = {
  user: { select: { id: true, name: true } },
  votes: { select: { value: true, userId: true } },
  _count: { select: { comments: true } },
} as const;

function rangeStart(range?: string): Date | undefined {
  const now = new Date();
  if (range === "today") {
    const d = new Date(now);
    d.setHours(0, 0, 0, 0);
    return d;
  }
  if (range === "week") return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  return undefined; // "all"
}

// Feed: list recommendations, most-loved first. range = today | week | all.
recommendationsRouter.get("/", optionalAuth, async (req: AuthedRequest, res) => {
  const after = rangeStart(String(req.query.range ?? "today"));
  const recs = await prisma.recommendation.findMany({
    where: after ? { createdAt: { gte: after } } : undefined,
    orderBy: { createdAt: "desc" },
    include: recInclude,
    take: 100,
  });
  const shaped = recs.map((r) => shapeRec(r, req.userId));
  // Highest score first, then newest.
  shaped.sort((a, b) => b.score - a.score || +new Date(b.createdAt) - +new Date(a.createdAt));
  res.json(shaped);
});

recommendationsRouter.post("/", requireAuth, async (req: AuthedRequest, res) => {
  const parsed = createInput.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid input" });
  const d = parsed.data;
  const rec = await prisma.recommendation.upsert({
    where: {
      userId_tmdbId_mediaType: {
        userId: req.userId!,
        tmdbId: d.tmdbId,
        mediaType: d.mediaType,
      },
    },
    create: { ...d, posterPath: d.posterPath ?? null, userId: req.userId! },
    update: { note: d.note, createdAt: new Date() },
    include: recInclude,
  });
  res.status(201).json(shapeRec(rec, req.userId));
});

recommendationsRouter.get("/:id", optionalAuth, async (req: AuthedRequest, res) => {
  const rec = await prisma.recommendation.findUnique({
    where: { id: req.params.id },
    include: recInclude,
  });
  if (!rec) return res.status(404).json({ error: "Recommendation not found" });
  res.json(shapeRec(rec, req.userId));
});

recommendationsRouter.delete("/:id", requireAuth, async (req: AuthedRequest, res) => {
  const result = await prisma.recommendation.deleteMany({
    where: { id: req.params.id, userId: req.userId },
  });
  if (result.count === 0) return res.status(404).json({ error: "Not found" });
  res.status(204).end();
});

// Up/down vote. value: 1 = like, -1 = dislike, 0 = clear my vote.
recommendationsRouter.put("/:id/vote", requireAuth, async (req: AuthedRequest, res) => {
  const parsed = z.object({ value: z.number().int().min(-1).max(1) }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "value must be -1, 0 or 1" });

  const rec = await prisma.recommendation.findUnique({ where: { id: req.params.id } });
  if (!rec) return res.status(404).json({ error: "Not found" });

  if (parsed.data.value === 0) {
    await prisma.recommendationVote.deleteMany({
      where: { recommendationId: rec.id, userId: req.userId },
    });
  } else {
    await prisma.recommendationVote.upsert({
      where: { recommendationId_userId: { recommendationId: rec.id, userId: req.userId! } },
      create: { recommendationId: rec.id, userId: req.userId!, value: parsed.data.value },
      update: { value: parsed.data.value },
    });
  }

  const updated = await prisma.recommendation.findUnique({
    where: { id: rec.id },
    include: recInclude,
  });
  res.json(shapeRec(updated as RecWithRelations, req.userId));
});

recommendationsRouter.get("/:id/comments", async (req, res) => {
  const comments = await prisma.recommendationComment.findMany({
    where: { recommendationId: req.params.id },
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

recommendationsRouter.post("/:id/comments", requireAuth, async (req: AuthedRequest, res) => {
  const parsed = z.object({ body: z.string().trim().min(1).max(1000) }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Comment cannot be empty" });

  const rec = await prisma.recommendation.findUnique({ where: { id: req.params.id } });
  if (!rec) return res.status(404).json({ error: "Not found" });

  const c = await prisma.recommendationComment.create({
    data: { recommendationId: rec.id, userId: req.userId!, body: parsed.data.body },
    include: { user: { select: { id: true, name: true } } },
  });
  res.status(201).json({
    id: c.id,
    body: c.body,
    createdAt: c.createdAt,
    author: c.user.name,
    authorId: c.user.id,
  });
});
