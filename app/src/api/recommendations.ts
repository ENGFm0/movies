import { MediaType } from "./tmdb";

export interface Recommendation {
  id: string;
  tmdbId: number;
  mediaType: MediaType;
  title: string;
  posterPath?: string | null;
  note?: string | null;
  createdAt: string;
  recommender: string;
  recommenderId: string;
  likes: number;
  dislikes: number;
  score: number;
  commentCount: number;
  myVote: number; // 1, -1, or 0
}

export type RecRange = "today" | "week" | "all";
