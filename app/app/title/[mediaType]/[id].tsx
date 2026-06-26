import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { api, ApiError } from "@/api/client";
import { useAuth } from "@/context/AuthContext";
import { Stars } from "@/components/Stars";
import { AddToListModal } from "@/components/AddToListModal";
import { backdropUrl, posterUrl, MediaType } from "@/api/tmdb";
import { colors, radius } from "@/theme";

interface Provider {
  provider_id: number;
  provider_name: string;
  logo_path: string;
}
interface Details {
  id: number;
  title?: string;
  name?: string;
  overview?: string;
  poster_path?: string | null;
  backdrop_path?: string | null;
  vote_average?: number;
  release_date?: string;
  first_air_date?: string;
  runtime?: number;
  genres?: { id: number; name: string }[];
  credits?: { cast?: { id: number; name: string; profile_path?: string | null; character?: string }[] };
  "watch/providers"?: { results?: Record<string, { flatrate?: Provider[]; rent?: Provider[]; buy?: Provider[] }> };
}

interface Summary {
  average: number;
  count: number;
  commentCount: number;
  myStars: number | null;
}
interface Comment {
  id: string;
  body: string;
  author: string;
  authorId: string;
  createdAt: string;
}

const REGION = "SA"; // matches the server default region

export default function TitleScreen() {
  const { mediaType, id } = useLocalSearchParams<{ mediaType: string; id: string }>();
  const type: MediaType = mediaType === "tv" ? "tv" : "movie";
  const tmdbId = Number(id);
  const router = useRouter();
  const { user } = useAuth();

  const [details, setDetails] = useState<Details | null>(null);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [posting, setPosting] = useState(false);

  const loadSocial = useCallback(async () => {
    const [s, c] = await Promise.all([
      api<Summary>(`/api/titles/${type}/${tmdbId}/summary`),
      api<Comment[]>(`/api/titles/${type}/${tmdbId}/comments`, { auth: false }),
    ]);
    setSummary(s);
    setComments(c);
  }, [type, tmdbId]);

  useEffect(() => {
    (async () => {
      try {
        const d = await api<Details>(`/api/tmdb/${type}/${tmdbId}`, { auth: false });
        setDetails(d);
        await loadSocial().catch(() => {});
      } catch (e) {
        setError(
          e instanceof ApiError && e.status === 503
            ? "مفتاح TMDB غير مضبوط في السيرفر."
            : "تعذّر تحميل التفاصيل."
        );
      } finally {
        setLoading(false);
      }
    })();
  }, [type, tmdbId, loadSocial]);

  async function rate(stars: number) {
    if (!user) return router.push("/login");
    setSummary((s) => (s ? { ...s, myStars: stars } : s));
    try {
      await api(`/api/titles/${type}/${tmdbId}/rating`, { method: "PUT", body: { stars } });
      await loadSocial();
    } catch {
      /* revert handled by reload on next focus */
    }
  }

  async function postComment() {
    if (!user) return router.push("/login");
    if (!commentText.trim()) return;
    setPosting(true);
    try {
      const c = await api<Comment>(`/api/titles/${type}/${tmdbId}/comments`, {
        method: "POST",
        body: { body: commentText.trim() },
      });
      setComments((prev) => [c, ...prev]);
      setCommentText("");
      setSummary((s) => (s ? { ...s, commentCount: s.commentCount + 1 } : s));
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
  if (error || !details) {
    return (
      <View style={styles.center}>
        <Text style={styles.muted}>{error ?? "غير موجود"}</Text>
      </View>
    );
  }

  const name = details.title ?? details.name ?? "";
  const year = (details.release_date ?? details.first_air_date ?? "").slice(0, 4);
  const providersByRegion = details["watch/providers"]?.results ?? {};
  const regionProviders = providersByRegion[REGION] ?? providersByRegion["US"];
  const watchOn = [
    ...(regionProviders?.flatrate ?? []),
    ...(regionProviders?.rent ?? []),
    ...(regionProviders?.buy ?? []),
  ];
  // de-dup providers by id
  const uniqueProviders = Array.from(
    new Map(watchOn.map((p) => [p.provider_id, p])).values()
  );
  const cast = details.credits?.cast?.slice(0, 12) ?? [];

  return (
    <ScrollView style={{ backgroundColor: colors.bg }} contentContainerStyle={{ paddingBottom: 40 }}>
      <Stack.Screen options={{ title: name, headerBackTitle: "رجوع" }} />

      {backdropUrl(details.backdrop_path) ? (
        <Image source={{ uri: backdropUrl(details.backdrop_path)! }} style={styles.backdrop} />
      ) : (
        <View style={[styles.backdrop, { backgroundColor: colors.surfaceAlt }]} />
      )}

      <View style={styles.headerRow}>
        {posterUrl(details.poster_path) && (
          <Image source={{ uri: posterUrl(details.poster_path)! }} style={styles.poster} />
        )}
        <View style={styles.headerText}>
          <Text style={styles.title}>{name}</Text>
          <Text style={styles.meta}>
            {type === "tv" ? "مسلسل" : "فيلم"}
            {year ? ` • ${year}` : ""}
            {details.runtime ? ` • ${details.runtime} د` : ""}
          </Text>
          {typeof details.vote_average === "number" && details.vote_average > 0 && (
            <Text style={styles.tmdbScore}>TMDB ★ {details.vote_average.toFixed(1)}</Text>
          )}
          <View style={styles.genres}>
            {details.genres?.slice(0, 3).map((g) => (
              <View key={g.id} style={styles.genreChip}>
                <Text style={styles.genreText}>{g.name}</Text>
              </View>
            ))}
          </View>
        </View>
      </View>

      <Pressable style={styles.addBtn} onPress={() => (user ? setShowAdd(true) : router.push("/login"))}>
        <Text style={styles.addBtnText}>+ أضف إلى قائمة</Text>
      </Pressable>

      {/* Where to watch */}
      {uniqueProviders.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📍 وين تشوفه</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 10 }}>
            {uniqueProviders.map((p) => (
              <View key={p.provider_id} style={styles.provider}>
                <Image
                  source={{ uri: `https://image.tmdb.org/t/p/w92${p.logo_path}` }}
                  style={styles.providerLogo}
                />
                <Text style={styles.providerName} numberOfLines={1}>
                  {p.provider_name}
                </Text>
              </View>
            ))}
          </ScrollView>
        </View>
      )}

      {details.overview ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>القصة</Text>
          <Text style={styles.overview}>{details.overview}</Text>
        </View>
      ) : null}

      {/* Community rating */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>تقييم المستخدمين</Text>
        <View style={styles.ratingSummary}>
          <Text style={styles.avgNumber}>{summary?.average?.toFixed(1) ?? "0.0"}</Text>
          <View>
            <Stars value={summary?.average ?? 0} size={18} />
            <Text style={styles.ratingCount}>
              {summary?.count ?? 0} تقييم • {summary?.commentCount ?? 0} تعليق
            </Text>
          </View>
        </View>

        <View style={styles.myRating}>
          <Text style={styles.myRatingLabel}>تقييمك:</Text>
          <Stars value={summary?.myStars ?? 0} size={30} onChange={rate} />
        </View>
      </View>

      {/* Comments */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>التعليقات</Text>
        <View style={styles.commentInputRow}>
          <TextInput
            value={commentText}
            onChangeText={setCommentText}
            placeholder={user ? "اكتب رأيك..." : "سجّل دخولك للتعليق"}
            placeholderTextColor={colors.textMuted}
            editable={!!user}
            multiline
            style={styles.commentInput}
          />
          <Pressable
            style={[styles.sendBtn, (!commentText.trim() || posting) && styles.disabled]}
            disabled={!commentText.trim() || posting}
            onPress={postComment}
          >
            <Text style={styles.sendBtnText}>نشر</Text>
          </Pressable>
        </View>

        {comments.length === 0 ? (
          <Text style={styles.noComments}>لا توجد تعليقات بعد. كن أول من يعلّق!</Text>
        ) : (
          comments.map((c) => (
            <View key={c.id} style={styles.comment}>
              <View style={styles.commentHeader}>
                <View style={styles.commentAvatar}>
                  <Text style={styles.commentAvatarText}>{c.author.charAt(0).toUpperCase()}</Text>
                </View>
                <Text style={styles.commentAuthor}>{c.author}</Text>
              </View>
              <Text style={styles.commentBody}>{c.body}</Text>
            </View>
          ))
        )}
      </View>

      {/* Cast */}
      {cast.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>طاقم العمل</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 10 }}>
            {cast.map((person) => (
              <View key={person.id} style={styles.castItem}>
                {person.profile_path ? (
                  <Image
                    source={{ uri: `https://image.tmdb.org/t/p/w185${person.profile_path}` }}
                    style={styles.castPhoto}
                  />
                ) : (
                  <View style={[styles.castPhoto, styles.castPlaceholder]}>
                    <Text style={{ fontSize: 24 }}>👤</Text>
                  </View>
                )}
                <Text style={styles.castName} numberOfLines={1}>
                  {person.name}
                </Text>
                {person.character ? (
                  <Text style={styles.castChar} numberOfLines={1}>
                    {person.character}
                  </Text>
                ) : null}
              </View>
            ))}
          </ScrollView>
        </View>
      )}

      <AddToListModal
        visible={showAdd}
        onClose={() => setShowAdd(false)}
        title={{ tmdbId, mediaType: type, name, posterPath: details.poster_path }}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.bg },
  muted: { color: colors.textMuted, fontSize: 15 },
  backdrop: { width: "100%", height: 210 },
  headerRow: { flexDirection: "row-reverse", padding: 16, marginTop: -50 },
  poster: { width: 110, height: 165, borderRadius: radius.md, backgroundColor: colors.surfaceAlt },
  headerText: { flex: 1, marginEnd: 14, marginTop: 50 },
  title: { color: colors.text, fontSize: 22, fontWeight: "900", textAlign: "right" },
  meta: { color: colors.textMuted, fontSize: 14, marginTop: 6, textAlign: "right" },
  tmdbScore: { color: colors.accent, fontSize: 14, fontWeight: "700", marginTop: 6, textAlign: "right" },
  genres: { flexDirection: "row-reverse", flexWrap: "wrap", gap: 6, marginTop: 10 },
  genreChip: { backgroundColor: colors.surface, borderRadius: radius.sm, paddingHorizontal: 10, paddingVertical: 4 },
  genreText: { color: colors.textMuted, fontSize: 12 },
  addBtn: {
    backgroundColor: colors.primary,
    marginHorizontal: 16,
    borderRadius: radius.md,
    paddingVertical: 14,
    alignItems: "center",
  },
  addBtnText: { color: "#fff", fontWeight: "800", fontSize: 16 },
  section: { paddingHorizontal: 16, marginTop: 26 },
  sectionTitle: { color: colors.text, fontSize: 18, fontWeight: "800", textAlign: "right" },
  overview: { color: colors.textMuted, fontSize: 15, lineHeight: 26, marginTop: 10, textAlign: "right" },
  provider: { alignItems: "center", marginEnd: 14, width: 64 },
  providerLogo: { width: 56, height: 56, borderRadius: radius.md, backgroundColor: colors.surfaceAlt },
  providerName: { color: colors.textMuted, fontSize: 11, marginTop: 6, textAlign: "center" },
  ratingSummary: { flexDirection: "row-reverse", alignItems: "center", gap: 14, marginTop: 12 },
  avgNumber: { color: colors.accent, fontSize: 44, fontWeight: "900" },
  ratingCount: { color: colors.textMuted, fontSize: 13, marginTop: 4, textAlign: "right" },
  myRating: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 12,
    marginTop: 18,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: 14,
  },
  myRatingLabel: { color: colors.text, fontSize: 15, fontWeight: "700" },
  commentInputRow: { flexDirection: "row-reverse", gap: 10, marginTop: 12, alignItems: "flex-end" },
  commentInput: {
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
  sendBtnText: { color: "#fff", fontWeight: "800" },
  disabled: { opacity: 0.4 },
  noComments: { color: colors.textMuted, marginTop: 16, textAlign: "center" },
  comment: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: 14,
    marginTop: 12,
  },
  commentHeader: { flexDirection: "row-reverse", alignItems: "center", gap: 8 },
  commentAvatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  commentAvatarText: { color: "#fff", fontWeight: "800" },
  commentAuthor: { color: colors.text, fontWeight: "700" },
  commentBody: { color: colors.textMuted, fontSize: 15, lineHeight: 24, marginTop: 8, textAlign: "right" },
  castItem: { width: 84, marginEnd: 12 },
  castPhoto: { width: 84, height: 110, borderRadius: radius.md, backgroundColor: colors.surfaceAlt },
  castPlaceholder: { alignItems: "center", justifyContent: "center" },
  castName: { color: colors.text, fontSize: 12, fontWeight: "600", marginTop: 6, textAlign: "center" },
  castChar: { color: colors.textMuted, fontSize: 11, textAlign: "center" },
});
