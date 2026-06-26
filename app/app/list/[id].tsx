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
import * as Linking from "expo-linking";
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

  async function share() {
    if (!list) return;
    if (!list.isPublic) {
      Alert.alert("القائمة خاصة", "فعّل المشاركة أولاً عشان تقدر ترسل الرابط.");
      return;
    }
    const url = Linking.createURL(`/shared/${list.shareId}`);
    await Share.share({
      message: `شف قائمة أفلامي "${list.title}" 🎬\n${url}`,
    });
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
        numColumns={3}
        columnWrapperStyle={{ gap: 10, paddingHorizontal: 16 }}
        contentContainerStyle={{ paddingBottom: 30, gap: 14 }}
        ListHeaderComponent={
          <View style={styles.header}>
            {list.description ? <Text style={styles.desc}>{list.description}</Text> : null}
            <View style={styles.controlRow}>
              <View style={styles.shareToggle}>
                <Text style={styles.toggleLabel}>مشاركة عامة</Text>
                <Switch
                  value={list.isPublic}
                  onValueChange={togglePublic}
                  trackColor={{ true: colors.primary, false: colors.border }}
                  thumbColor="#fff"
                />
              </View>
              <Pressable style={styles.shareBtn} onPress={share}>
                <Text style={styles.shareBtnText}>↗ مشاركة</Text>
              </Pressable>
            </View>
            <Pressable onPress={confirmDeleteList} style={styles.deleteListBtn}>
              <Text style={styles.deleteListText}>حذف القائمة</Text>
            </Pressable>
            <Text style={styles.countLabel}>{list.items.length} عنصر</Text>
          </View>
        }
        ListEmptyComponent={
          <Text style={styles.empty}>القائمة فاضية. أضف أفلام من صفحة الفيلم 🎬</Text>
        }
        renderItem={({ item }) => (
          <Pressable
            style={styles.tile}
            onPress={() => router.push(`/title/${item.mediaType}/${item.tmdbId}`)}
            onLongPress={() =>
              Alert.alert(item.title, "حذف من القائمة؟", [
                { text: "إلغاء", style: "cancel" },
                { text: "حذف", style: "destructive", onPress: () => removeItem(item.id) },
              ])
            }
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
  desc: { color: colors.textMuted, fontSize: 15, lineHeight: 24, marginBottom: 14, textAlign: "right" },
  controlRow: { flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between" },
  shareToggle: { flexDirection: "row-reverse", alignItems: "center", gap: 10 },
  toggleLabel: { color: colors.text, fontSize: 15, fontWeight: "600" },
  shareBtn: { backgroundColor: colors.surface, borderRadius: radius.md, paddingHorizontal: 18, paddingVertical: 10 },
  shareBtnText: { color: colors.text, fontWeight: "700" },
  deleteListBtn: { marginTop: 14, alignSelf: "flex-end" },
  deleteListText: { color: colors.primary, fontSize: 14 },
  countLabel: { color: colors.textMuted, fontSize: 13, marginTop: 14, textAlign: "right" },
  empty: { color: colors.textMuted, textAlign: "center", marginTop: 50, paddingHorizontal: 24 },
  tile: { flex: 1 / 3, maxWidth: "31%" },
  tilePoster: { width: "100%", aspectRatio: 2 / 3, borderRadius: radius.md, backgroundColor: colors.surfaceAlt },
  tilePlaceholder: { alignItems: "center", justifyContent: "center" },
  tileTitle: { color: colors.text, fontSize: 12, fontWeight: "600", marginTop: 6, textAlign: "center" },
});
