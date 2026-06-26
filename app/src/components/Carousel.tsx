import React from "react";
import { FlatList, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { colors } from "@/theme";
import { PosterCard } from "./PosterCard";
import { resolveMediaType, TitleSummary } from "@/api/tmdb";

interface Props {
  title: string;
  data: TitleSummary[];
  fallbackType?: "movie" | "tv";
  ranked?: boolean; // show numbered "top" badges (1, 2, 3, ...)
}

// A titled, horizontally-scrolling row of poster cards.
export function Carousel({ title, data, fallbackType = "movie", ranked }: Props) {
  const router = useRouter();
  if (!data.length) return null;
  return (
    <View style={styles.section}>
      <Text style={styles.heading}>{title}</Text>
      <FlatList
        horizontal
        showsHorizontalScrollIndicator={false}
        data={data}
        keyExtractor={(item, i) => `${item.id}-${i}`}
        contentContainerStyle={styles.list}
        renderItem={({ item, index }) => (
          <PosterCard
            item={item}
            rank={ranked ? index + 1 : undefined}
            onPress={() => {
              const type = resolveMediaType(item, fallbackType);
              router.push(`/title/${type}/${item.id}`);
            }}
          />
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  section: { marginTop: 22 },
  heading: {
    color: colors.text,
    fontSize: 19,
    fontWeight: "800",
    marginBottom: 12,
    paddingHorizontal: 16,
    textAlign: "right",
  },
  list: { paddingHorizontal: 16 },
});
