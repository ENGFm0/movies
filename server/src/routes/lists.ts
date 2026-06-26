import { Router } from "express";
import { z } from "zod";
import { prisma } from "../prisma";
import { requireAuth, AuthedRequest } from "../middleware/auth";

export const listsRouter = Router();

const listInput = z.object({
  title: z.string().trim().min(1).max(100),
  description: z.string().trim().max(500).optional(),
  isPublic: z.boolean().optional(),
});

const itemInput = z.object({
  tmdbId: z.number().int().positive(),
  mediaType: z.enum(["movie", "tv"]),
  title: z.string().trim().min(1).max(300),
  posterPath: z.string().trim().nullable().optional(),
  note: z.string().trim().max(300).optional(),
});

// --- Public: view a shared list by its share id (no auth needed) ---
listsRouter.get("/shared/:shareId", async (req, res) => {
  const list = await prisma.movieList.findUnique({
    where: { shareId: req.params.shareId },
    include: {
      items: { orderBy: { addedAt: "desc" } },
      user: { select: { name: true } },
    },
  });
  if (!list || !list.isPublic) {
    return res.status(404).json({ error: "List not found or not public" });
  }
  return res.json({
    id: list.id,
    title: list.title,
    description: list.description,
    owner: list.user.name,
    shareId: list.shareId,
    items: list.items,
  });
});

// Everything below requires a logged-in user.
listsRouter.use(requireAuth);

// All of my lists, with item counts.
listsRouter.get("/", async (req: AuthedRequest, res) => {
  const lists = await prisma.movieList.findMany({
    where: { userId: req.userId },
    orderBy: { updatedAt: "desc" },
    include: { _count: { select: { items: true } } },
  });
  res.json(
    lists.map((l) => ({
      id: l.id,
      title: l.title,
      description: l.description,
      isPublic: l.isPublic,
      shareId: l.shareId,
      itemCount: l._count.items,
      updatedAt: l.updatedAt,
    }))
  );
});

listsRouter.post("/", async (req: AuthedRequest, res) => {
  const parsed = listInput.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid input" });
  const list = await prisma.movieList.create({
    data: { ...parsed.data, userId: req.userId! },
  });
  res.status(201).json(list);
});

// Full list with items — only the owner can fetch the private view.
listsRouter.get("/:id", async (req: AuthedRequest, res) => {
  const list = await prisma.movieList.findFirst({
    where: { id: req.params.id, userId: req.userId },
    include: { items: { orderBy: { addedAt: "desc" } } },
  });
  if (!list) return res.status(404).json({ error: "List not found" });
  res.json(list);
});

listsRouter.patch("/:id", async (req: AuthedRequest, res) => {
  const parsed = listInput.partial().safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid input" });
  const result = await prisma.movieList.updateMany({
    where: { id: req.params.id, userId: req.userId },
    data: parsed.data,
  });
  if (result.count === 0) return res.status(404).json({ error: "List not found" });
  const list = await prisma.movieList.findUnique({ where: { id: req.params.id } });
  res.json(list);
});

listsRouter.delete("/:id", async (req: AuthedRequest, res) => {
  const result = await prisma.movieList.deleteMany({
    where: { id: req.params.id, userId: req.userId },
  });
  if (result.count === 0) return res.status(404).json({ error: "List not found" });
  res.status(204).end();
});

// Add a title to a list (idempotent on listId+tmdbId+mediaType).
listsRouter.post("/:id/items", async (req: AuthedRequest, res) => {
  const parsed = itemInput.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid input" });

  const list = await prisma.movieList.findFirst({
    where: { id: req.params.id, userId: req.userId },
  });
  if (!list) return res.status(404).json({ error: "List not found" });

  const data = parsed.data;
  const item = await prisma.listItem.upsert({
    where: {
      listId_tmdbId_mediaType: {
        listId: list.id,
        tmdbId: data.tmdbId,
        mediaType: data.mediaType,
      },
    },
    create: { ...data, posterPath: data.posterPath ?? null, listId: list.id },
    update: { note: data.note },
  });
  await prisma.movieList.update({ where: { id: list.id }, data: { updatedAt: new Date() } });
  res.status(201).json(item);
});

listsRouter.delete("/:id/items/:itemId", async (req: AuthedRequest, res) => {
  const list = await prisma.movieList.findFirst({
    where: { id: req.params.id, userId: req.userId },
  });
  if (!list) return res.status(404).json({ error: "List not found" });
  await prisma.listItem.deleteMany({ where: { id: req.params.itemId, listId: list.id } });
  res.status(204).end();
});
