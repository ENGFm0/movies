import { config, hasTmdbCredentials } from "../config";

/**
 * Thin wrapper around the TMDB v3 REST API.
 *
 * Auth: prefers a v4 access token (Bearer header); falls back to a v3 api_key
 * query param. All requests default to the configured language/region so the
 * app gets Arabic metadata and Saudi cinema/streaming availability out of the box.
 */

export class TmdbError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = "TmdbError";
  }
}

function buildUrl(path: string, params: Record<string, string | number | undefined>) {
  const url = new URL(`${config.tmdb.baseUrl}${path}`);
  url.searchParams.set("language", config.tmdb.language);
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") url.searchParams.set(key, String(value));
  }
  if (!config.tmdb.accessToken && config.tmdb.apiKey) {
    url.searchParams.set("api_key", config.tmdb.apiKey);
  }
  return url.toString();
}

async function tmdbGet<T>(
  path: string,
  params: Record<string, string | number | undefined> = {}
): Promise<T> {
  if (!hasTmdbCredentials) {
    throw new TmdbError(
      503,
      "TMDB credentials are not configured. Set TMDB_ACCESS_TOKEN or TMDB_API_KEY in the server .env."
    );
  }

  const headers: Record<string, string> = { accept: "application/json" };
  if (config.tmdb.accessToken) {
    headers.Authorization = `Bearer ${config.tmdb.accessToken}`;
  }

  const res = await fetch(buildUrl(path, params), { headers });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new TmdbError(res.status, `TMDB request failed (${res.status}): ${text}`);
  }
  return (await res.json()) as T;
}

export interface TmdbListResponse<T> {
  page: number;
  total_pages: number;
  total_results: number;
  results: T[];
}

// Movies currently showing in cinemas for the configured region.
export function getNowPlaying(page = 1) {
  return tmdbGet<TmdbListResponse<unknown>>("/movie/now_playing", {
    page,
    region: config.tmdb.region,
  });
}

// Movies releasing soon in cinemas for the configured region.
export function getUpcoming(page = 1) {
  return tmdbGet<TmdbListResponse<unknown>>("/movie/upcoming", {
    page,
    region: config.tmdb.region,
  });
}

// Top trending titles across all platforms (mixed movies + tv).
export function getTrending(window: "day" | "week" = "week", page = 1) {
  return tmdbGet<TmdbListResponse<unknown>>(`/trending/all/${window}`, { page });
}

export function getPopularMovies(page = 1) {
  return tmdbGet<TmdbListResponse<unknown>>("/movie/popular", {
    page,
    region: config.tmdb.region,
  });
}

export function getPopularTv(page = 1) {
  return tmdbGet<TmdbListResponse<unknown>>("/tv/popular", { page });
}

export function getTopRatedMovies(page = 1) {
  return tmdbGet<TmdbListResponse<unknown>>("/movie/top_rated", { page });
}

export function searchMulti(query: string, page = 1) {
  return tmdbGet<TmdbListResponse<unknown>>("/search/multi", {
    query,
    page,
    include_adult: "false",
  });
}

// Full details for one title, including credits, videos, similar and the
// streaming/cinema providers (where it can be watched) for the region.
export function getDetails(mediaType: "movie" | "tv", id: number) {
  return tmdbGet<Record<string, unknown>>(`/${mediaType}/${id}`, {
    // external_ids -> imdb_id; translations -> English title alongside Arabic.
    append_to_response:
      "credits,videos,watch/providers,similar,release_dates,external_ids,translations",
  });
}

export const tmdb = {
  getNowPlaying,
  getUpcoming,
  getTrending,
  getPopularMovies,
  getPopularTv,
  getTopRatedMovies,
  searchMulti,
  getDetails,
};
