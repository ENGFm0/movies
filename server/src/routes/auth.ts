import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "../prisma";
import { signToken, requireAuth, AuthedRequest } from "../middleware/auth";

export const authRouter = Router();

const registerSchema = z.object({
  name: z.string().trim().min(1).max(60),
  email: z.string().trim().email().toLowerCase(),
  password: z.string().min(6).max(100),
});

const loginSchema = z.object({
  email: z.string().trim().email().toLowerCase(),
  password: z.string().min(1),
});

function publicUser(user: { id: string; name: string; email: string }) {
  return { id: user.id, name: user.name, email: user.email };
}

authRouter.post("/register", async (req, res) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid input", details: parsed.error.flatten() });
  }
  const { name, email, password } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return res.status(409).json({ error: "Email already registered" });

  const hashed = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({ data: { name, email, password: hashed } });

  return res.status(201).json({ token: signToken(user.id), user: publicUser(user) });
});

authRouter.post("/login", async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid input" });
  const { email, password } = parsed.data;

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return res.status(401).json({ error: "Invalid email or password" });

  const ok = await bcrypt.compare(password, user.password);
  if (!ok) return res.status(401).json({ error: "Invalid email or password" });

  return res.json({ token: signToken(user.id), user: publicUser(user) });
});

authRouter.get("/me", requireAuth, async (req: AuthedRequest, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.userId } });
  if (!user) return res.status(404).json({ error: "User not found" });
  return res.json({ user: publicUser(user) });
});
