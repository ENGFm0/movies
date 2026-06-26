import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { api, ApiError } from "@/api/client";
import { RecommendationCard } from "@/components/RecommendationCard";
import { Recommendation, RecRange } from "@/api/recommendations";
import { colors, radius } from "@/theme";

const RANGES: { key: RecRange; label: string }[] = [
  { key: "today", label: "اليوم" },
  { key: "week", label: "الأسبوع" },
  { key: "all", label: "الكل" },
];

export default function RecommendScreen() {
  const router = useRouter();
  const [range, setRange] = useState<RecRange>("today");
  const [recs, setRecs] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (r: RecRange) => {
    setError(null);
    try {
      setRecs(await api<Recommendation[]>(`/api/recommendations?range=${r}`, { auth: true }));
    } catch (e) {
      setError(
        e instanceof ApiError ? e.message : "تعذّر تحميل الترشيحات. تأكد أن السيرفر شغّال."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load(range);
    }, [load, range])
  );

  function changeRange(r: RecRange) {
    setRange(r);
    setLoading(true);
    load(r);
  }

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load(range);
    setRefreshing(false);
  }, [load, range]);

  // Keep the feed sorted by score after a vote changes a card.
  const onChange = useCallback((updated: Recommendation) => {
    setRecs((prev) =>
      prev
        .map((r) => (r.id === updated.id ? updated : r))
        .sort((a, b) => b.score - a.score)
    );
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.tabs}>
        {RANGES.map((r) => (
          <Pressable
            key={r.key}
            style={[styles.tab, range === r.key && styles.tabActive]}
            onPress={() => changeRange(r.key)}
          >
            <Text style={[styles.tabText, range === r.key && styles.tabTextActive]}>
              {r.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {loading ? (
        <ActivityIndicator color={colors.primary} size="large" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={recs}
          keyExtractor={(r) => r.id}
          contentContainerStyle={{ padding: 16, paddingTop: 6 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyEmoji}>🎯</Text>
              <Text style={styles.emptyText}>
                {error ?? "ما فيه ترشيحات بعد. كن أول من يرشّح فيلم السهرة!"}
              </Text>
            </View>
          }
          renderItem={({ item, index }) => (
            <RecommendationCard rec={item} rank={index + 1} onChange={onChange} />
          )}
        />
      )}

      <Pressable style={styles.fab} onPress={() => router.push("/search")}>
        <Text style={styles.fabText}>＋ رشّح فيلم</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  tabs: { flexDirection: "row-reverse", gap: 8, padding: 16, paddingBottom: 8 },
  tab: {
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: radius.xl,
    backgroundColor: colors.surface,
  },
  tabActive: { backgroundColor: colors.primary },
  tabText: { color: colors.textMuted, fontWeight: "700" },
  tabTextActive: { color: "#fff" },
  empty: { alignItems: "center", marginTop: 60, paddingHorizontal: 30 },
  emptyEmoji: { fontSize: 46, marginBottom: 14 },
  emptyText: { color: colors.textMuted, fontSize: 15, textAlign: "center", lineHeight: 24 },
  fab: {
    position: "absolute",
    bottom: 24,
    insetInlineStart: 20,
    backgroundColor: colors.primary,
    borderRadius: radius.xl,
    paddingHorizontal: 22,
    paddingVertical: 14,
    shadowColor: "#000",
    shadowOpacity: 0.4,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  fabText: { color: "#fff", fontWeight: "900", fontSize: 15 },
});
