import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { api } from "@/api/client";
import { posterUrl, MediaType } from "@/api/tmdb";
import { Stars } from "@/components/Stars";
import { colors, radius } from "@/theme";

interface Item {
  id: string;
  tmdbId: number;
  mediaType: MediaType;
  title: string;
  posterPath?: string | null;
  rank: number;
  ownerStars?: number | null;
}
interface SharedList {
  title: string;
  description?: string | null;
  owner: string;
  items: Item[];
}

// Public, read-only view of a shared list — shown as the owner's ranked chart.
export default function SharedListScreen() {
  const { shareId } = useLocalSearchParams<{ shareId: string }>();
  const router = useRouter();
  const [list, setList] = useState<SharedList | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    api<SharedList>(`/api/lists/shared/${shareId}`, { auth: false })
      .then(setList)
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [shareId]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }
  if (notFound || !list) {
    return (
      <View style={styles.center}>
        <Text style={styles.muted}>القائمة غير موجودة أو غير مشتركة</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <Stack.Screen options={{ title: list.title }} />
      <FlatList
        data={list.items}
        keyExtractor={(i) => i.id}
        contentContainerStyle={{ padding: 16, paddingBottom: 30 }}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.owner}>ترتيب {list.owner} 🏆</Text>
            {list.description ? <Text style={styles.desc}>{list.description}</Text> : null}
            <Text style={styles.count}>{list.items.length} عمل — مرتّبة من الأول للأخير</Text>
          </View>
        }
        renderItem={({ item }) => (
          <Pressable
            style={styles.row}
            onPress={() => router.push(`/title/${item.mediaType}/${item.tmdbId}`)}
          >
            <Text style={styles.rank}>{item.rank}</Text>
            {posterUrl(item.posterPath, "w185") ? (
              <Image source={{ uri: posterUrl(item.posterPath, "w185")! }} style={styles.poster} />
            ) : (
              <View style={[styles.poster, styles.posterPlaceholder]}>
                <Text style={{ fontSize: 22 }}>🎬</Text>
              </View>
            )}
            <View style={styles.rowText}>
              <Text style={styles.rowTitle} numberOfLines={2}>
                {item.title}
              </Text>
              <Text style={styles.rowType}>{item.mediaType === "tv" ? "مسلسل" : "فيلم"}</Text>
              {item.ownerStars ? (
                <Stars value={item.ownerStars} size={14} />
              ) : (
                <Text style={styles.noRating}>بدون تقييم</Text>
              )}
            </View>
          </Pressable>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.bg },
  muted: { color: colors.textMuted },
  header: { marginBottom: 4 },
  owner: { color: colors.primary, fontSize: 16, fontWeight: "800", textAlign: "right" },
  desc: { color: colors.textMuted, fontSize: 15, lineHeight: 24, marginTop: 8, textAlign: "right" },
  count: { color: colors.textMuted, fontSize: 13, marginTop: 12, textAlign: "right" },
  row: {
    flexDirection: "row-reverse",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: 10,
    marginTop: 12,
    gap: 12,
  },
  rank: { color: colors.primary, fontSize: 22, fontWeight: "900", width: 34, textAlign: "center" },
  poster: { width: 52, height: 78, borderRadius: radius.sm, backgroundColor: colors.surfaceAlt },
  posterPlaceholder: { alignItems: "center", justifyContent: "center" },
  rowText: { flex: 1 },
  rowTitle: { color: colors.text, fontSize: 15, fontWeight: "700", textAlign: "right" },
  rowType: { color: colors.textMuted, fontSize: 12, marginVertical: 4, textAlign: "right" },
  noRating: { color: colors.textMuted, fontSize: 12, textAlign: "right" },
});
