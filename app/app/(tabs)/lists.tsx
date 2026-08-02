import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { api } from "@/api/client";
import { useAuth } from "@/context/AuthContext";
import { colors, radius } from "@/theme";

interface ListSummary {
  id: string;
  title: string;
  description?: string | null;
  isPublic: boolean;
  itemCount: number;
}

export default function ListsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [lists, setLists] = useState<ListSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [newTitle, setNewTitle] = useState("");
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    try {
      setLists(await api<ListSummary[]>("/api/lists"));
    } catch {
      setLists([]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Refresh whenever the tab regains focus (e.g. after adding items elsewhere).
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  async function create() {
    if (!newTitle.trim()) return;
    setCreating(true);
    try {
      await api("/api/lists", { method: "POST", body: { title: newTitle.trim() } });
      setNewTitle("");
      await load();
    } catch (e) {
      Alert.alert("خطأ", e instanceof Error ? e.message : "تعذّر الإنشاء");
    } finally {
      setCreating(false);
    }
  }

  if (!user) {
    return (
      <View style={styles.center}>
        <Text style={styles.gateEmoji}>📁</Text>
        <Text style={styles.gateText}>سجّل دخولك عشان تسوي قوائمك الخاصة وتشاركها</Text>
        <Pressable style={styles.gateBtn} onPress={() => router.push("/login")}>
          <Text style={styles.gateBtnText}>تسجيل الدخول</Text>
        </Pressable>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.createRow}>
        <TextInput
          value={newTitle}
          onChangeText={setNewTitle}
          placeholder="اسم قائمة جديدة (مثلاً: أشوفها لاحقاً)"
          placeholderTextColor={colors.textMuted}
          style={styles.input}
        />
        <Pressable
          style={[styles.createBtn, (!newTitle.trim() || creating) && styles.disabled]}
          disabled={!newTitle.trim() || creating}
          onPress={create}
        >
          <Text style={styles.createBtnText}>+</Text>
        </Pressable>
      </View>

      <FlatList
        data={lists}
        keyExtractor={(l) => l.id}
        contentContainerStyle={{ padding: 16, paddingTop: 6 }}
        ListEmptyComponent={
          <Text style={styles.empty}>ما عندك قوائم بعد. سوِّ وحدة من فوق 👆</Text>
        }
        renderItem={({ item }) => (
          <Pressable style={styles.card} onPress={() => router.push(`/list/${item.id}`)}>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>{item.title}</Text>
              <Text style={styles.cardMeta}>
                {item.itemCount} عنصر • {item.isPublic ? "مشتركة" : "خاصة"}
              </Text>
            </View>
            <Text style={styles.chevron}>‹</Text>
          </Pressable>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.bg, padding: 24 },
  gateEmoji: { fontSize: 48, marginBottom: 14 },
  gateText: { color: colors.textMuted, fontSize: 16, textAlign: "center", lineHeight: 26, marginBottom: 20 },
  gateBtn: { backgroundColor: colors.primary, paddingHorizontal: 26, paddingVertical: 13, borderRadius: radius.md },
  gateBtnText: { color: "#fff", fontWeight: "800", fontSize: 16 },
  createRow: { flexDirection: "row-reverse", gap: 10, padding: 16, alignItems: "center" },
  input: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: colors.text,
    textAlign: "right",
  },
  createBtn: {
    backgroundColor: colors.primary,
    width: 46,
    height: 46,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  createBtnText: { color: "#fff", fontWeight: "900", fontSize: 26, lineHeight: 30 },
  disabled: { opacity: 0.4 },
  empty: { color: colors.textMuted, textAlign: "center", marginTop: 40, fontSize: 15 },
  card: {
    flexDirection: "row-reverse",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: 16,
    marginBottom: 12,
  },
  cardTitle: { color: colors.text, fontSize: 17, fontWeight: "700", textAlign: "right" },
  cardMeta: { color: colors.textMuted, fontSize: 13, marginTop: 4, textAlign: "right" },
  chevron: { color: colors.textMuted, fontSize: 28, marginHorizontal: 4 },
});
