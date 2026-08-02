import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { api, ApiError } from "@/api/client";
import { originalName, posterUrl, titleName, titleYear, TitleSummary } from "@/api/tmdb";
import { colors, radius } from "@/theme";

type Mode = "now" | "soon";

const COLS = 3;
const GAP = 12;
const H_PADDING = 16;
const TILE_W =
  (Dimensions.get("window").width - H_PADDING * 2 - GAP * (COLS - 1)) / COLS;

interface ListResp {
  results: TitleSummary[];
  page: number;
  total_pages: number;
}

export default function CinemaScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [mode, setMode] = useState<Mode>("now");
  const [items, setItems] = useState<TitleSummary[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const endpoint = mode === "now" ? "now-playing" : "upcoming";

  const fetchPage = useCallback(
    async (m: Mode, p: number) => {
      const path = `/api/tmdb/${m === "now" ? "now-playing" : "upcoming"}?page=${p}`;
      return api<ListResp>(path, { auth: false });
    },
    []
  );

  // Load the first page whenever the mode changes.
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setItems([]);
    fetchPage(mode, 1)
      .then((data) => {
        if (cancelled) return;
        setItems(data.results ?? []);
        setPage(1);
        setTotalPages(data.total_pages ?? 1);
      })
      .catch((e) => {
        if (cancelled) return;
        setError(
          e instanceof ApiError && e.status === 503
            ? "مفتاح TMDB غير مضبوط في السيرفر."
            : "تعذّر تحميل الأفلام. تأكد أن السيرفر شغّال."
        );
      })
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [mode, fetchPage]);

  // Append the next page when the user scrolls to the end.
  const loadMore = useCallback(async () => {
    if (loadingMore || loading || page >= totalPages) return;
    setLoadingMore(true);
    try {
      const next = page + 1;
      const data = await fetchPage(mode, next);
      setItems((prev) => {
        // de-dup by id in case pages overlap
        const seen = new Set(prev.map((i) => i.id));
        return [...prev, ...(data.results ?? []).filter((i) => !seen.has(i.id))];
      });
      setPage(next);
    } catch {
      /* ignore load-more errors */
    } finally {
      setLoadingMore(false);
    }
  }, [loadingMore, loading, page, totalPages, mode, fetchPage]);

  return (
    <View style={styles.container}>
      <View style={styles.tabs}>
        <Pressable
          style={[styles.tab, mode === "now" && styles.tabActive]}
          onPress={() => setMode("now")}
        >
          <Text style={[styles.tabText, mode === "now" && styles.tabTextActive]}>
            المعروضة الآن
          </Text>
        </Pressable>
        <Pressable
          style={[styles.tab, mode === "soon" && styles.tabActive]}
          onPress={() => setMode("soon")}
        >
          <Text style={[styles.tabText, mode === "soon" && styles.tabTextActive]}>
            قريباً
          </Text>
        </Pressable>
      </View>

      {loading ? (
        <ActivityIndicator color={colors.primary} size="large" style={{ marginTop: 40 }} />
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item, i) => `${item.id}-${i}`}
          numColumns={COLS}
          columnWrapperStyle={{ gap: GAP, paddingHorizontal: H_PADDING }}
          contentContainerStyle={{ paddingTop: 6, paddingBottom: insets.bottom + 24, gap: 16 }}
          onEndReached={loadMore}
          onEndReachedThreshold={0.6}
          ListFooterComponent={
            loadingMore ? (
              <ActivityIndicator color={colors.primary} style={{ marginVertical: 16 }} />
            ) : null
          }
          renderItem={({ item, index }) => {
            const english = originalName(item);
            const uri = posterUrl(item.poster_path);
            return (
              <Pressable
                style={{ width: TILE_W }}
                onPress={() => router.push(`/title/movie/${item.id}`)}
              >
                <View style={[styles.posterWrap, { width: TILE_W, height: TILE_W * 1.5 }]}>
                  {uri ? (
                    <Image source={{ uri }} style={styles.poster} />
                  ) : (
                    <View style={[styles.poster, styles.placeholder]}>
                      <Text style={{ fontSize: 30 }}>🎬</Text>
                    </View>
                  )}
                  {mode === "now" && (
                    <View style={styles.rank}>
                      <Text style={styles.rankText}>{index + 1}</Text>
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
                <Text numberOfLines={1} style={styles.sub}>
                  {english ?? titleYear(item)}
                </Text>
              </Pressable>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  errorText: { color: colors.textMuted, textAlign: "center", fontSize: 15, lineHeight: 24 },
  tabs: { flexDirection: "row-reverse", gap: 8, padding: 16, paddingBottom: 8 },
  tab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: radius.xl,
    backgroundColor: colors.surface,
    alignItems: "center",
  },
  tabActive: { backgroundColor: colors.primary },
  tabText: { color: colors.textMuted, fontWeight: "700" },
  tabTextActive: { color: "#fff" },
  posterWrap: { borderRadius: radius.md, overflow: "hidden", backgroundColor: colors.surfaceAlt },
  poster: { width: "100%", height: "100%" },
  placeholder: { alignItems: "center", justifyContent: "center" },
  rank: {
    position: "absolute",
    bottom: 6,
    insetInlineEnd: 6,
    minWidth: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
  },
  rankText: { color: "#fff", fontSize: 14, fontWeight: "900" },
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
  title: { color: colors.text, marginTop: 6, fontSize: 13, fontWeight: "600", textAlign: "right" },
  sub: { color: colors.textMuted, fontSize: 11, textAlign: "right" },
});
