// Shared TMDB-shaped types and image helpers used across screens.

export type MediaType = "movie" | "tv";

export interface TitleSummary {
  id: number;
  media_type?: MediaType;
  title?: string; // movies (localized)
  name?: string; // tv (localized)
  original_title?: string; // movies (original language, often English)
  original_name?: string; // tv (original language)
  original_language?: string;
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

// The original-language title (usually the English/international name). Returned
// only when it differs from the localized (Arabic) name, so the UI can show both.
export function originalName(t: TitleSummary): string | null {
  const original = t.original_title ?? t.original_name;
  if (!original) return null;
  return original === titleName(t) ? null : original;
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

// Build a "watch on this platform" deep link that lands the user on the title
// within the given streaming service. For known providers we open the service's
// search for the title; otherwise the caller falls back to the JustWatch link.
export function providerDeepLink(providerName: string, title: string): string | null {
  const q = encodeURIComponent(title);
  const n = providerName.toLowerCase();
  if (n.includes("netflix")) return `https://www.netflix.com/search?q=${q}`;
  if (n.includes("shahid") || n.includes("shahed") || n.includes("mbc"))
    return `https://shahid.mbc.net/ar/search?q=${q}`;
  if (n.includes("osn")) return `https://www.osnplus.com/ar-sa/search?q=${q}`;
  if (n.includes("starz")) return `https://www.starzplay.com/ar-sa/search?q=${q}`;
  if (n.includes("apple")) return `https://tv.apple.com/search?term=${q}`;
  if (n.includes("prime") || n.includes("amazon"))
    return `https://www.primevideo.com/search/?phrase=${q}`;
  if (n.includes("disney")) return `https://www.disneyplus.com/search?q=${q}`;
  if (n.includes("stc") || n.includes("jawwy")) return `https://stctv.com.sa/search?q=${q}`;
  if (n.includes("watch it") || n.includes("watchit")) return `https://www.watchit.com/search?q=${q}`;
  if (n.includes("youtube")) return `https://www.youtube.com/results?search_query=${q}`;
  if (n.includes("google play")) return `https://play.google.com/store/search?q=${q}&c=movies`;
  return null;
}
