import { Router } from "express";
import { tmdb, TmdbError } from "../lib/tmdb";

export const tmdbRouter = Router();

// Small helper so each handler stays a one-liner and TMDB errors map to HTTP.
function handle(fn: () => Promise<unknown>) {
  return async (_req: unknown, res: import("express").Response) => {
    try {
      res.json(await fn());
    } catch (err) {
      if (err instanceof TmdbError) {
        return res.status(err.status === 401 ? 502 : err.status).json({ error: err.message });
      }
      res.status(500).json({ error: "Failed to reach TMDB" });
    }
  };
}

// Top movies currently in cinemas (region-aware).
tmdbRouter.get("/now-playing", (req, res) =>
  handle(() => tmdb.getNowPlaying(Number(req.query.page) || 1))(req, res)
);

// Trending across all platforms (mixed movies + series).
tmdbRouter.get("/trending", (req, res) => {
  const window = req.query.window === "day" ? "day" : "week";
  return handle(() => tmdb.getTrending(window, Number(req.query.page) || 1))(req, res);
});

tmdbRouter.get("/popular/movies", (req, res) =>
  handle(() => tmdb.getPopularMovies(Number(req.query.page) || 1))(req, res)
);

tmdbRouter.get("/popular/tv", (req, res) =>
  handle(() => tmdb.getPopularTv(Number(req.query.page) || 1))(req, res)
);

tmdbRouter.get("/top-rated/movies", (req, res) =>
  handle(() => tmdb.getTopRatedMovies(Number(req.query.page) || 1))(req, res)
);

tmdbRouter.get("/search", (req, res) => {
  const query = String(req.query.q ?? "").trim();
  if (!query) return res.json({ page: 1, results: [], total_pages: 0, total_results: 0 });
  return handle(() => tmdb.searchMulti(query, Number(req.query.page) || 1))(req, res);
});

// Full details for a single title. mediaType must be "movie" or "tv".
tmdbRouter.get("/:mediaType/:id", (req, res) => {
  const mediaType = req.params.mediaType === "tv" ? "tv" : "movie";
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: "Invalid title id" });
  }
  return handle(() => tmdb.getDetails(mediaType, id))(req, res);
});
