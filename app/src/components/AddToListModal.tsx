import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  FlatList,
  Alert,
} from "react-native";
import { api } from "@/api/client";
import { colors, radius } from "@/theme";
import { MediaType } from "@/api/tmdb";

interface ListSummary {
  id: string;
  title: string;
  itemCount: number;
}

interface Props {
  visible: boolean;
  onClose: () => void;
  title: { tmdbId: number; mediaType: MediaType; name: string; posterPath?: string | null };
}

// Bottom-sheet style modal to add the given title to one of the user's lists,
// or to quickly create a new list.
export function AddToListModal({ visible, onClose, title }: Props) {
  const [lists, setLists] = useState<ListSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setLoading(true);
    api<ListSummary[]>("/api/lists")
      .then(setLists)
      .catch(() => setLists([]))
      .finally(() => setLoading(false));
  }, [visible]);

  async function addTo(listId: string) {
    setBusy(true);
    try {
      await api(`/api/lists/${listId}/items`, {
        method: "POST",
        body: {
          tmdbId: title.tmdbId,
          mediaType: title.mediaType,
          title: title.name,
          posterPath: title.posterPath ?? null,
        },
      });
      onClose();
      Alert.alert("تمت الإضافة", `أُضيف "${title.name}" إلى القائمة`);
    } catch (e) {
      Alert.alert("خطأ", e instanceof Error ? e.message : "تعذّر الإضافة");
    } finally {
      setBusy(false);
    }
  }

  async function createAndAdd() {
    if (!newTitle.trim()) return;
    setBusy(true);
    try {
      const list = await api<{ id: string }>("/api/lists", {
        method: "POST",
        body: { title: newTitle.trim() },
      });
      setNewTitle("");
      await addTo(list.id);
    } catch (e) {
      Alert.alert("خطأ", e instanceof Error ? e.message : "تعذّر الإنشاء");
      setBusy(false);
    }
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={styles.sheet}>
        <View style={styles.handle} />
        <Text style={styles.heading}>أضف إلى قائمة</Text>

        {loading ? (
          <ActivityIndicator color={colors.primary} style={{ marginVertical: 20 }} />
        ) : (
          <FlatList
            data={lists}
            keyExtractor={(l) => l.id}
            style={{ maxHeight: 260 }}
            ListEmptyComponent={
              <Text style={styles.empty}>ما عندك قوائم بعد — سوِّ وحدة جديدة تحت 👇</Text>
            }
            renderItem={({ item }) => (
              <Pressable style={styles.listRow} disabled={busy} onPress={() => addTo(item.id)}>
                <Text style={styles.listTitle}>{item.title}</Text>
                <Text style={styles.listCount}>{item.itemCount} عنصر</Text>
              </Pressable>
            )}
          />
        )}

        <View style={styles.createRow}>
          <TextInput
            value={newTitle}
            onChangeText={setNewTitle}
            placeholder="اسم قائمة جديدة"
            placeholderTextColor={colors.textMuted}
            style={styles.input}
          />
          <Pressable
            style={[styles.createBtn, (!newTitle.trim() || busy) && styles.disabled]}
            disabled={!newTitle.trim() || busy}
            onPress={createAndAdd}
          >
            <Text style={styles.createBtnText}>إنشاء</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)" },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: 20,
    paddingBottom: 36,
  },
  handle: {
    width: 44,
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.border,
    alignSelf: "center",
    marginBottom: 14,
  },
  heading: { color: colors.text, fontSize: 18, fontWeight: "800", textAlign: "right", marginBottom: 12 },
  empty: { color: colors.textMuted, textAlign: "center", paddingVertical: 18 },
  listRow: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  listTitle: { color: colors.text, fontSize: 16, fontWeight: "600" },
  listCount: { color: colors.textMuted, fontSize: 13 },
  createRow: { flexDirection: "row-reverse", gap: 10, marginTop: 16, alignItems: "center" },
  input: {
    flex: 1,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: colors.text,
    textAlign: "right",
  },
  createBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  createBtnText: { color: "#fff", fontWeight: "800" },
  disabled: { opacity: 0.4 },
});
