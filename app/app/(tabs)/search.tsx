import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { api } from "@/api/client";
import {
  posterUrl,
  resolveMediaType,
  titleName,
  titleYear,
  TitleSummary,
} from "@/api/tmdb";
import { colors, radius } from "@/theme";

export default function SearchScreen() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<TitleSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounced search-as-you-type.
  useEffect(() => {
    if (debounce.current) clearTimeout(debounce.current);
    if (query.trim().length < 2) {
      setResults([]);
      setSearched(false);
      return;
    }
    debounce.current = setTimeout(async () => {
      setLoading(true);
      try {
        const data = await api<{ results: TitleSummary[] }>(
          `/api/tmdb/search?q=${encodeURIComponent(query.trim())}`,
          { auth: false }
        );
        // Keep only movies and tv shows (drop people).
        setResults(
          (data.results ?? []).filter(
            (r) => r.media_type === "movie" || r.media_type === "tv"
          )
        );
        setSearched(true);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 350);
    return () => {
      if (debounce.current) clearTimeout(debounce.current);
    };
  }, [query]);

  return (
    <View style={styles.container}>
      <View style={styles.searchBar}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="ابحث عن فيلم أو مسلسل..."
          placeholderTextColor={colors.textMuted}
          style={styles.input}
          autoCorrect={false}
          returnKeyType="search"
        />
        {query.length > 0 && (
          <Pressable onPress={() => setQuery("")} hitSlop={8}>
            <Text style={styles.clear}>✕</Text>
          </Pressable>
        )}
      </View>

      {loading && <ActivityIndicator color={colors.primary} style={{ marginTop: 24 }} />}

      <FlatList
        data={results}
        keyExtractor={(item, i) => `${item.id}-${i}`}
        contentContainerStyle={{ padding: 16 }}
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={
          !loading && searched ? (
            <Text style={styles.empty}>ما لقينا نتائج لـ "{query}"</Text>
          ) : !searched ? (
            <Text style={styles.empty}>اكتب اسم فيلم أو مسلسل للبحث</Text>
          ) : null
        }
        renderItem={({ item }) => {
          const type = resolveMediaType(item);
          const uri = posterUrl(item.poster_path, "w185");
          return (
            <Pressable
              style={styles.row}
              onPress={() => router.push(`/title/${type}/${item.id}`)}
            >
              {uri ? (
                <Image source={{ uri }} style={styles.thumb} />
              ) : (
                <View style={[styles.thumb, styles.thumbPlaceholder]}>
                  <Text style={{ fontSize: 22 }}>🎬</Text>
                </View>
              )}
              <View style={styles.rowText}>
                <Text style={styles.rowTitle} numberOfLines={2}>
                  {titleName(item)}
                </Text>
                <Text style={styles.rowMeta}>
                  {type === "tv" ? "مسلسل" : "فيلم"}
                  {titleYear(item) ? ` • ${titleYear(item)}` : ""}
                  {item.vote_average ? `  ★ ${item.vote_average.toFixed(1)}` : ""}
                </Text>
              </View>
            </Pressable>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  searchBar: {
    flexDirection: "row-reverse",
    alignItems: "center",
    backgroundColor: colors.surface,
    margin: 16,
    marginBottom: 0,
    borderRadius: radius.lg,
    paddingHorizontal: 14,
    gap: 8,
  },
  searchIcon: { fontSize: 16 },
  input: { flex: 1, color: colors.text, paddingVertical: 14, fontSize: 16, textAlign: "right" },
  clear: { color: colors.textMuted, fontSize: 16, paddingHorizontal: 4 },
  empty: { color: colors.textMuted, textAlign: "center", marginTop: 40, fontSize: 15 },
  row: {
    flexDirection: "row-reverse",
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  thumb: { width: 60, height: 90, borderRadius: radius.sm, backgroundColor: colors.surfaceAlt },
  thumbPlaceholder: { alignItems: "center", justifyContent: "center" },
  rowText: { flex: 1, justifyContent: "center" },
  rowTitle: { color: colors.text, fontSize: 16, fontWeight: "700", textAlign: "right" },
  rowMeta: { color: colors.textMuted, fontSize: 13, marginTop: 4, textAlign: "right" },
});
