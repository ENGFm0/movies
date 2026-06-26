import React from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { colors, radius } from "@/theme";
import { originalName, posterUrl, titleName, titleYear, TitleSummary } from "@/api/tmdb";

interface Props {
  item: TitleSummary;
  onPress: () => void;
  width?: number;
  rank?: number; // when set, shows a numbered "top" badge
}

// Vertical poster tile used in horizontal carousels and grids.
export function PosterCard({ item, onPress, width = 120, rank }: Props) {
  const uri = posterUrl(item.poster_path);
  const english = originalName(item);
  return (
    <Pressable style={[styles.card, { width }]} onPress={onPress}>
      <View style={[styles.posterWrap, { width, height: width * 1.5 }]}>
        {uri ? (
          <Image source={{ uri }} style={styles.poster} resizeMode="cover" />
        ) : (
          <View style={[styles.poster, styles.placeholder]}>
            <Text style={styles.placeholderText}>🎬</Text>
          </View>
        )}
        {typeof rank === "number" && (
          <View style={styles.rank}>
            <Text style={styles.rankText}>{rank}</Text>
          </View>
        )}
        {typeof item.vote_average === "number" && item.vote_average > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>★ {item.vote_average.toFixed(1)}</Text>
          </View>
        )}
      </View>
      <Text numberOfLines={1} style={styles.title}>
        {titleName(item)}
      </Text>
      {english ? (
        <Text numberOfLines={1} style={styles.english}>
          {english}
        </Text>
      ) : (
        !!titleYear(item) && <Text style={styles.year}>{titleYear(item)}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { marginEnd: 12 },
  posterWrap: {
    borderRadius: radius.md,
    overflow: "hidden",
    backgroundColor: colors.surfaceAlt,
  },
  poster: { width: "100%", height: "100%" },
  placeholder: { alignItems: "center", justifyContent: "center" },
  placeholderText: { fontSize: 34 },
  badge: {
    position: "absolute",
    top: 6,
    insetInlineStart: 6,
    backgroundColor: "rgba(0,0,0,0.75)",
    borderRadius: radius.sm,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  badgeText: { color: colors.accent, fontSize: 11, fontWeight: "700" },
  rank: {
    position: "absolute",
    bottom: 6,
    insetInlineEnd: 6,
    minWidth: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
  },
  rankText: { color: "#fff", fontSize: 13, fontWeight: "900" },
  title: { color: colors.text, marginTop: 6, fontSize: 13, fontWeight: "600", textAlign: "right" },
  english: { color: colors.textMuted, fontSize: 11, textAlign: "right" },
  year: { color: colors.textMuted, fontSize: 11, textAlign: "right" },
});
