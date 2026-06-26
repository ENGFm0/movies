import dotenv from "dotenv";

dotenv.config();

export const config = {
  port: Number(process.env.PORT ?? 4000),
  jwtSecret: process.env.JWT_SECRET ?? "dev-insecure-secret-change-me",
  tmdb: {
    accessToken: process.env.TMDB_ACCESS_TOKEN ?? "",
    apiKey: process.env.TMDB_API_KEY ?? "",
    region: process.env.TMDB_REGION ?? "SA",
    language: process.env.TMDB_LANGUAGE ?? "ar-SA",
    baseUrl: "https://api.themoviedb.org/3",
    imageBaseUrl: "https://image.tmdb.org/t/p",
  },
};

export const hasTmdbCredentials = Boolean(
  config.tmdb.accessToken || config.tmdb.apiKey
);
