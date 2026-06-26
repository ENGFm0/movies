import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { api } from "@/api/client";
import { useAuth } from "@/context/AuthContext";
import { RecommendationCard } from "@/components/RecommendationCard";
import { Recommendation } from "@/api/recommendations";
import { colors, radius } from "@/theme";

interface Comment {
  id: string;
  body: string;
  author: string;
  authorId: string;
  createdAt: string;
}

export default function RecommendationDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const [rec, setRec] = useState<Recommendation | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState("");
  const [posting, setPosting] = useState(false);

  const load = useCallback(async () => {
    try {
      const [r, c] = await Promise.all([
        api<Recommendation>(`/api/recommendations/${id}`, { auth: true }),
        api<Comment[]>(`/api/recommendations/${id}/comments`, { auth: false }),
      ]);
      setRec(r);
      setComments(c);
    } catch {
      setRec(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  async function post() {
    if (!user) return router.push("/login");
    if (!text.trim()) return;
    setPosting(true);
    try {
      const c = await api<Comment>(`/api/recommendations/${id}/comments`, {
        method: "POST",
        body: { body: text.trim() },
      });
      setComments((prev) => [c, ...prev]);
      setText("");
    } finally {
      setPosting(false);
    }
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }
  if (!rec) {
    return (
      <View style={styles.center}>
        <Text style={styles.muted}>الترشيح غير موجود</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <FlatList
        data={comments}
        keyExtractor={(c) => c.id}
        contentContainerStyle={{ padding: 16 }}
        ListHeaderComponent={
          <View>
            <RecommendationCard rec={rec} />
            <Text style={styles.heading}>التعليقات ({comments.length})</Text>
            <View style={styles.inputRow}>
              <TextInput
                value={text}
                onChangeText={setText}
                placeholder={user ? "اكتب رأيك في الترشيح..." : "سجّل دخولك للتعليق"}
                placeholderTextColor={colors.textMuted}
                editable={!!user}
                multiline
                style={styles.input}
              />
              <Pressable
                style={[styles.sendBtn, (!text.trim() || posting) && styles.disabled]}
                disabled={!text.trim() || posting}
                onPress={post}
              >
                <Text style={styles.sendText}>نشر</Text>
              </Pressable>
            </View>
          </View>
        }
        ListEmptyComponent={<Text style={styles.noComments}>لا توجد تعليقات بعد.</Text>}
        renderItem={({ item }) => (
          <View style={styles.comment}>
            <View style={styles.commentHeader}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{item.author.charAt(0).toUpperCase()}</Text>
              </View>
              <Text style={styles.author}>{item.author}</Text>
            </View>
            <Text style={styles.body}>{item.body}</Text>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.bg },
  muted: { color: colors.textMuted },
  heading: { color: colors.text, fontSize: 18, fontWeight: "800", marginTop: 18, textAlign: "right" },
  inputRow: { flexDirection: "row-reverse", gap: 10, marginTop: 12, alignItems: "flex-end" },
  input: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: colors.text,
    minHeight: 46,
    maxHeight: 120,
    textAlign: "right",
  },
  sendBtn: { backgroundColor: colors.primary, borderRadius: radius.md, paddingHorizontal: 18, paddingVertical: 13 },
  sendText: { color: "#fff", fontWeight: "800" },
  disabled: { opacity: 0.4 },
  noComments: { color: colors.textMuted, textAlign: "center", marginTop: 20 },
  comment: { backgroundColor: colors.surface, borderRadius: radius.md, padding: 14, marginTop: 12 },
  commentHeader: { flexDirection: "row-reverse", alignItems: "center", gap: 8 },
  avatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { color: "#fff", fontWeight: "800" },
  author: { color: colors.text, fontWeight: "700" },
  body: { color: colors.textMuted, fontSize: 15, lineHeight: 24, marginTop: 8, textAlign: "right" },
});
