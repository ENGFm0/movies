import React, { useState } from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { api } from "@/api/client";
import { useAuth } from "@/context/AuthContext";
import { Recommendation } from "@/api/recommendations";
import { posterUrl } from "@/api/tmdb";
import { colors, radius } from "@/theme";

interface Props {
  rec: Recommendation;
  rank?: number;
  // Notifies parent of an updated copy after voting, so lists can re-sort.
  onChange?: (rec: Recommendation) => void;
}

// A single recommendation in the feed: poster, bilingual title, who recommended
// it, a like/dislike control, and a tap-through to the title's rating page.
export function RecommendationCard({ rec, rank, onChange }: Props) {
  const router = useRouter();
  const { user } = useAuth();
  const [local, setLocal] = useState(rec);
  const [busy, setBusy] = useState(false);

  async function vote(value: 1 | -1) {
    if (!user) return router.push("/login");
    const next = local.myVote === value ? 0 : value; // tapping again clears
    setBusy(true);
    try {
      const updated = await api<Recommendation>(`/api/recommendations/${local.id}/vote`, {
        method: "PUT",
        body: { value: next },
      });
      setLocal(updated);
      onChange?.(updated);
    } catch {
      /* ignore */
    } finally {
      setBusy(false);
    }
  }

  const goToTitle = () => router.push(`/title/${local.mediaType}/${local.tmdbId}`);
  const uri = posterUrl(local.posterPath, "w185");

  return (
    <View style={styles.card}>
      {typeof rank === "number" && (
        <View style={styles.rankBadge}>
          <Text style={styles.rankText}>{rank}</Text>
        </View>
      )}
      <Pressable style={styles.body} onPress={goToTitle}>
        {uri ? (
          <Image source={{ uri }} style={styles.poster} />
        ) : (
          <View style={[styles.poster, styles.posterPlaceholder]}>
            <Text style={{ fontSize: 22 }}>🎬</Text>
          </View>
        )}
        <View style={styles.info}>
          <Text style={styles.title} numberOfLines={2}>
            {local.title}
          </Text>
          <Text style={styles.meta}>
            {local.mediaType === "tv" ? "مسلسل" : "فيلم"} • رشّحه {local.recommender}
          </Text>
          {local.note ? (
            <Text style={styles.note} numberOfLines={3}>
              “{local.note}”
            </Text>
          ) : null}
        </View>
      </Pressable>

      <View style={styles.actions}>
        <Pressable
          style={[styles.voteBtn, local.myVote === 1 && styles.voteActiveUp]}
          disabled={busy}
          onPress={() => vote(1)}
        >
          <Text style={[styles.voteText, local.myVote === 1 && styles.voteTextActive]}>
            👍 {local.likes}
          </Text>
        </Pressable>
        <Pressable
          style={[styles.voteBtn, local.myVote === -1 && styles.voteActiveDown]}
          disabled={busy}
          onPress={() => vote(-1)}
        >
          <Text style={[styles.voteText, local.myVote === -1 && styles.voteTextActive]}>
            👎 {local.dislikes}
          </Text>
        </Pressable>
        <Pressable
          style={styles.commentBtn}
          onPress={() => router.push(`/recommendation/${local.id}`)}
        >
          <Text style={styles.commentText}>💬 {local.commentCount}</Text>
        </Pressable>
        <Pressable style={styles.rateBtn} onPress={goToTitle}>
          <Text style={styles.rateText}>قيّمه ★</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: 12,
    marginBottom: 14,
  },
  rankBadge: {
    position: "absolute",
    top: 10,
    insetInlineStart: 10,
    zIndex: 2,
    minWidth: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
  },
  rankText: { color: "#fff", fontWeight: "900", fontSize: 13 },
  body: { flexDirection: "row-reverse", gap: 12 },
  poster: { width: 64, height: 96, borderRadius: radius.sm, backgroundColor: colors.surfaceAlt },
  posterPlaceholder: { alignItems: "center", justifyContent: "center" },
  info: { flex: 1 },
  title: { color: colors.text, fontSize: 16, fontWeight: "800", textAlign: "right" },
  meta: { color: colors.textMuted, fontSize: 13, marginTop: 4, textAlign: "right" },
  note: { color: colors.text, fontSize: 14, marginTop: 8, fontStyle: "italic", textAlign: "right" },
  actions: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 8,
    marginTop: 12,
  },
  voteBtn: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  voteActiveUp: { backgroundColor: "#1f3a24", borderWidth: 1, borderColor: colors.success },
  voteActiveDown: { backgroundColor: "#3a1f1f", borderWidth: 1, borderColor: colors.primary },
  voteText: { color: colors.textMuted, fontWeight: "700", fontSize: 14 },
  voteTextActive: { color: colors.text },
  commentBtn: { paddingHorizontal: 8, paddingVertical: 8 },
  commentText: { color: colors.textMuted, fontWeight: "700", fontSize: 14 },
  rateBtn: {
    marginStart: "auto",
    backgroundColor: colors.accent,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  rateText: { color: "#1a1a1a", fontWeight: "900", fontSize: 13 },
});
