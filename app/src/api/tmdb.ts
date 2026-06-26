// Shared TMDB-shaped types and image helpers used across screens.

export type MediaType = "movie" | "tv";

export interface TitleSummary {
  id: number;
  media_type?: MediaType;
  title?: string; // movies
  name?: string; // tv
  poster_path?: string | null;
  backdrop_path?: string | null;
  vote_average?: number;
  release_date?: string;
  first_air_date?: string;
  overview?: string;
}

const IMG_BASE = "https://image.tmdb.org/t/p";

export function posterUrl(path?: string | null, size: "w185" | "w342" | "w500" = "w342") {
  return path ? `${IMG_BASE}/${size}${path}` : null;
}

export function backdropUrl(path?: string | null, size: "w780" | "w1280" = "w1280") {
  return path ? `${IMG_BASE}/${size}${path}` : null;
}

// TMDB returns a different field for movies vs tv — normalize it.
export function titleName(t: TitleSummary): string {
  return t.title ?? t.name ?? "بدون عنوان";
}

export function titleYear(t: TitleSummary): string {
  const date = t.release_date ?? t.first_air_date;
  return date ? date.slice(0, 4) : "";
}

// A multi-search result may not carry media_type (e.g. inside movie lists).
export function resolveMediaType(t: TitleSummary, fallback: MediaType = "movie"): MediaType {
  if (t.media_type === "movie" || t.media_type === "tv") return t.media_type;
  // tv items expose `name`/`first_air_date`, movies expose `title`/`release_date`.
  if (t.name && !t.title) return "tv";
  return fallback;
}
