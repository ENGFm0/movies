import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Pressable,
  Share,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";
import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import * as Clipboard from "expo-clipboard";
import { api, API_URL } from "@/api/client";
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
interface ListDetail {
  id: string;
  title: string;
  description?: string | null;
  isPublic: boolean;
  shareId: string;
  items: Item[];
}

export default function ListDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [list, setList] = useState<ListDetail | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      setList(await api<ListDetail>(`/api/lists/${id}`));
    } catch {
      setList(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  async function togglePublic(value: boolean) {
    if (!list) return;
    setList({ ...list, isPublic: value });
    try {
      await api(`/api/lists/${id}`, { method: "PATCH", body: { isPublic: value } });
    } catch {
      setList({ ...list, isPublic: !value });
    }
  }

  // A public, browser-openable link served by the backend.
  const shareUrl = list ? `${API_URL}/s/${list.shareId}` : "";

  function ensurePublic(): boolean {
    if (!list?.isPublic) {
      Alert.alert("القائمة خاصة", "فعّل «مشاركة عامة» أولاً عشان تقدر ترسل الرابط.");
      return false;
    }
    return true;
  }

  async function share() {
    if (!list || !ensurePublic()) return;
    await Share.share({ message: `شف قائمة أفلامي "${list.title}" 🎬\n${shareUrl}` });
  }

  async function copyLink() {
    if (!list || !ensurePublic()) return;
    await Clipboard.setStringAsync(shareUrl);
    Alert.alert("تم نسخ الرابط ✅", shareUrl);
  }

  // Move an item up/down one slot and persist the new order.
  async function move(index: number, dir: -1 | 1) {
    if (!list) return;
    const target = index + dir;
    if (target < 0 || target >= list.items.length) return;
    const items = [...list.items];
    [items[index], items[target]] = [items[target], items[index]];
    const reRanked = items.map((it, i) => ({ ...it, rank: i + 1 }));
    setList({ ...list, items: reRanked });
    await api(`/api/lists/${id}/order`, {
      method: "PUT",
      body: { itemIds: reRanked.map((i) => i.id) },
    }).catch(() => load());
  }

  async function removeItem(itemId: string) {
    if (!list) return;
    setList({ ...list, items: list.items.filter((i) => i.id !== itemId) });
    await api(`/api/lists/${id}/items/${itemId}`, { method: "DELETE" }).catch(() => load());
  }

  function confirmDeleteList() {
    Alert.alert("حذف القائمة", "متأكد تبي تحذف القائمة كاملة؟", [
      { text: "إلغاء", style: "cancel" },
      {
        text: "حذف",
        style: "destructive",
        onPress: async () => {
          await api(`/api/lists/${id}`, { method: "DELETE" });
          router.back();
        },
      },
    ]);
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }
  if (!list) {
    return (
      <View style={styles.center}>
        <Text style={styles.muted}>القائمة غير موجودة</Text>
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
            {list.description ? <Text style={styles.desc}>{list.description}</Text> : null}
            <View style={styles.shareToggle}>
              <Text style={styles.toggleLabel}>مشاركة عامة</Text>
              <Switch
                value={list.isPublic}
                onValueChange={togglePublic}
                trackColor={{ true: colors.primary, false: colors.border }}
                thumbColor="#fff"
              />
            </View>
            <View style={styles.shareButtons}>
              <Pressable style={styles.copyBtn} onPress={copyLink}>
                <Text style={styles.copyBtnText}>🔗 نسخ الرابط</Text>
              </Pressable>
              <Pressable style={styles.shareBtn} onPress={share}>
                <Text style={styles.shareBtnText}>↗ مشاركة</Text>
              </Pressable>
            </View>
            <View style={styles.subRow}>
              <Text style={styles.countLabel}>{list.items.length} عمل • مرتّبة بترتيبك</Text>
              <Pressable onPress={confirmDeleteList}>
                <Text style={styles.deleteListText}>حذف القائمة</Text>
              </Pressable>
            </View>
          </View>
        }
        ListEmptyComponent={
          <Text style={styles.empty}>القائمة فاضية. أضف أعمال من صفحة الفيلم 🎬</Text>
        }
        renderItem={({ item, index }) => (
          <View style={styles.row}>
            <Text style={styles.rank}>{item.rank}</Text>
            <Pressable
              style={styles.rowMain}
              onPress={() => router.push(`/title/${item.mediaType}/${item.tmdbId}`)}
            >
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
            <View style={styles.reorder}>
              <Pressable hitSlop={6} onPress={() => move(index, -1)} disabled={index === 0}>
                <Text style={[styles.arrow, index === 0 && styles.arrowDisabled]}>▲</Text>
              </Pressable>
              <Pressable
                hitSlop={6}
                onPress={() => move(index, 1)}
                disabled={index === list.items.length - 1}
              >
                <Text
                  style={[styles.arrow, index === list.items.length - 1 && styles.arrowDisabled]}
                >
                  ▼
                </Text>
              </Pressable>
              <Pressable
                hitSlop={6}
                onPress={() =>
                  Alert.alert(item.title, "حذف من القائمة؟", [
                    { text: "إلغاء", style: "cancel" },
                    { text: "حذف", style: "destructive", onPress: () => removeItem(item.id) },
                  ])
                }
              >
                <Text style={styles.removeX}>✕</Text>
              </Pressable>
            </View>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.bg },
  muted: { color: colors.textMuted },
  header: { marginBottom: 8 },
  desc: { color: colors.textMuted, fontSize: 15, lineHeight: 24, marginBottom: 14, textAlign: "right" },
  shareToggle: { flexDirection: "row-reverse", alignItems: "center", gap: 10, justifyContent: "space-between" },
  toggleLabel: { color: colors.text, fontSize: 15, fontWeight: "600" },
  shareButtons: { flexDirection: "row-reverse", gap: 10, marginTop: 12 },
  copyBtn: {
    flex: 1,
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: 11,
    alignItems: "center",
  },
  copyBtnText: { color: "#fff", fontWeight: "800" },
  shareBtn: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingVertical: 11,
    alignItems: "center",
  },
  shareBtnText: { color: colors.text, fontWeight: "700" },
  subRow: { flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between", marginTop: 14 },
  countLabel: { color: colors.textMuted, fontSize: 13, textAlign: "right" },
  deleteListText: { color: colors.primary, fontSize: 14 },
  empty: { color: colors.textMuted, textAlign: "center", marginTop: 50, paddingHorizontal: 24 },
  row: {
    flexDirection: "row-reverse",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: 10,
    marginTop: 12,
  },
  rank: {
    color: colors.primary,
    fontSize: 22,
    fontWeight: "900",
    width: 34,
    textAlign: "center",
  },
  rowMain: { flex: 1, flexDirection: "row-reverse", alignItems: "center", gap: 12 },
  poster: { width: 52, height: 78, borderRadius: radius.sm, backgroundColor: colors.surfaceAlt },
  posterPlaceholder: { alignItems: "center", justifyContent: "center" },
  rowText: { flex: 1 },
  rowTitle: { color: colors.text, fontSize: 15, fontWeight: "700", textAlign: "right" },
  rowType: { color: colors.textMuted, fontSize: 12, marginVertical: 4, textAlign: "right" },
  noRating: { color: colors.textMuted, fontSize: 12, textAlign: "right" },
  reorder: { alignItems: "center", gap: 8, paddingHorizontal: 4 },
  arrow: { color: colors.text, fontSize: 16 },
  arrowDisabled: { color: colors.border },
  removeX: { color: colors.textMuted, fontSize: 15, marginTop: 2 },
});
