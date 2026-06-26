import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { api, ApiError } from "@/api/client";
import { Carousel } from "@/components/Carousel";
import { backdropUrl, resolveMediaType, titleName, TitleSummary } from "@/api/tmdb";
import { colors, radius } from "@/theme";

interface ListResp {
  results: TitleSummary[];
}

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [nowPlaying, setNowPlaying] = useState<TitleSummary[]>([]);
  const [trending, setTrending] = useState<TitleSummary[]>([]);
  const [popularTv, setPopularTv] = useState<TitleSummary[]>([]);
  const [topRated, setTopRated] = useState<TitleSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [np, tr, tv, top] = await Promise.all([
        api<ListResp>("/api/tmdb/now-playing", { auth: false }),
        api<ListResp>("/api/tmdb/trending", { auth: false }),
        api<ListResp>("/api/tmdb/popular/tv", { auth: false }),
        api<ListResp>("/api/tmdb/top-rated/movies", { auth: false }),
      ]);
      setNowPlaying(np.results ?? []);
      setTrending(tr.results ?? []);
      setPopularTv(tv.results ?? []);
      setTopRated(top.results ?? []);
    } catch (e) {
      setError(
        e instanceof ApiError && e.status === 503
          ? "السيرفر شغّال بس مفتاح TMDB غير مضبوط. أضف TMDB_ACCESS_TOKEN في إعدادات السيرفر."
          : "تعذّر تحميل البيانات. تأكد أن السيرفر شغّال وأن رابط API صحيح."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const hero = trending[0];

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.center, { padding: 24 }]}>
        <Text style={styles.errorText}>{error}</Text>
        <Pressable style={styles.retry} onPress={load}>
          <Text style={styles.retryText}>إعادة المحاولة</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <ScrollView
      style={{ backgroundColor: colors.bg }}
      contentContainerStyle={{ paddingBottom: insets.bottom + 30 }}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
      }
    >
      {hero && (
        <Pressable
          style={styles.hero}
          onPress={() =>
            router.push(`/title/${resolveMediaType(hero)}/${hero.id}`)
          }
        >
          {backdropUrl(hero.backdrop_path) ? (
            <Image source={{ uri: backdropUrl(hero.backdrop_path)! }} style={styles.heroImg} />
          ) : (
            <View style={[styles.heroImg, { backgroundColor: colors.surfaceAlt }]} />
          )}
          <View style={styles.heroOverlay}>
            <Text style={styles.heroBadge}>الأكثر رواجاً</Text>
            <Text style={styles.heroTitle} numberOfLines={2}>
              {titleName(hero)}
            </Text>
          </View>
        </Pressable>
      )}

      <Carousel title="🎬 الأعلى في السينما الآن" data={nowPlaying} fallbackType="movie" />
      <Carousel title="🔥 رائج على كل المنصات" data={trending} />
      <Carousel title="📺 مسلسلات شائعة" data={popularTv} fallbackType="tv" />
      <Carousel title="⭐ الأعلى تقييماً" data={topRated} fallbackType="movie" />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.bg },
  errorText: { color: colors.textMuted, textAlign: "center", fontSize: 15, lineHeight: 24 },
  retry: {
    marginTop: 18,
    backgroundColor: colors.primary,
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: radius.md,
  },
  retryText: { color: "#fff", fontWeight: "800" },
  hero: { height: 230, justifyContent: "flex-end" },
  heroImg: { ...StyleSheet.absoluteFillObject, width: "100%", height: "100%" },
  heroOverlay: {
    padding: 18,
    backgroundColor: "rgba(11,11,18,0.55)",
  },
  heroBadge: {
    color: colors.accent,
    fontWeight: "800",
    fontSize: 13,
    marginBottom: 6,
    textAlign: "right",
  },
  heroTitle: { color: "#fff", fontSize: 26, fontWeight: "900", textAlign: "right" },
});
