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
import { colors, radius } from "@/theme";

interface Item {
  id: string;
  tmdbId: number;
  mediaType: MediaType;
  title: string;
  posterPath?: string | null;
}
interface SharedList {
  title: string;
  description?: string | null;
  owner: string;
  items: Item[];
}

// Public, read-only view of a shared list (no auth required).
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
        numColumns={3}
        columnWrapperStyle={{ gap: 10, paddingHorizontal: 16 }}
        contentContainerStyle={{ paddingBottom: 30, gap: 14 }}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.owner}>قائمة {list.owner}</Text>
            {list.description ? <Text style={styles.desc}>{list.description}</Text> : null}
            <Text style={styles.count}>{list.items.length} عنصر</Text>
          </View>
        }
        renderItem={({ item }) => (
          <Pressable
            style={styles.tile}
            onPress={() => router.push(`/title/${item.mediaType}/${item.tmdbId}`)}
          >
            {posterUrl(item.posterPath) ? (
              <Image source={{ uri: posterUrl(item.posterPath)! }} style={styles.tilePoster} />
            ) : (
              <View style={[styles.tilePoster, styles.tilePlaceholder]}>
                <Text style={{ fontSize: 26 }}>🎬</Text>
              </View>
            )}
            <Text style={styles.tileTitle} numberOfLines={1}>
              {item.title}
            </Text>
          </Pressable>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.bg },
  muted: { color: colors.textMuted },
  header: { padding: 16 },
  owner: { color: colors.primary, fontSize: 14, fontWeight: "800", textAlign: "right" },
  desc: { color: colors.textMuted, fontSize: 15, lineHeight: 24, marginTop: 8, textAlign: "right" },
  count: { color: colors.textMuted, fontSize: 13, marginTop: 12, textAlign: "right" },
  tile: { flex: 1 / 3, maxWidth: "31%" },
  tilePoster: { width: "100%", aspectRatio: 2 / 3, borderRadius: radius.md, backgroundColor: colors.surfaceAlt },
  tilePlaceholder: { alignItems: "center", justifyContent: "center" },
  tileTitle: { color: colors.text, fontSize: 12, fontWeight: "600", marginTop: 6, textAlign: "center" },
});
