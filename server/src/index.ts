import express from "express";
import cors from "cors";
import { config, hasTmdbCredentials } from "./config";
import { authRouter } from "./routes/auth";
import { tmdbRouter } from "./routes/tmdb";
import { listsRouter } from "./routes/lists";
import { titlesRouter } from "./routes/titles";
import { recommendationsRouter } from "./routes/recommendations";

const app = express();

app.use(cors());
app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, tmdbConfigured: hasTmdbCredentials });
});

app.use("/api/auth", authRouter);
app.use("/api/tmdb", tmdbRouter);
app.use("/api/lists", listsRouter);
app.use("/api/titles", titlesRouter);
app.use("/api/recommendations", recommendationsRouter);

// Fallback 404 for unknown API routes.
app.use((_req, res) => res.status(404).json({ error: "Not found" }));

app.listen(config.port, () => {
  console.log(`🎬 Movies API listening on http://localhost:${config.port}`);
  if (!hasTmdbCredentials) {
    console.warn(
      "⚠️  TMDB credentials missing — /api/tmdb/* will return 503 until you set TMDB_ACCESS_TOKEN or TMDB_API_KEY."
    );
  }
});
