import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  Modal,
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
import { backdropUrl, posterUrl, providerDeepLink, MediaType } from "@/api/tmdb";
import { colors, radius } from "@/theme";

interface Provider {
  provider_id: number;
  provider_name: string;
  logo_path: string;
}
interface Translation {
  iso_639_1: string;
  data?: { title?: string; name?: string };
}
interface Details {
  id: number;
  title?: string;
  name?: string;
  original_title?: string;
  original_name?: string;
  overview?: string;
  poster_path?: string | null;
  backdrop_path?: string | null;
  vote_average?: number;
  release_date?: string;
  first_air_date?: string;
  runtime?: number;
  genres?: { id: number; name: string }[];
  credits?: { cast?: { id: number; name: string; profile_path?: string | null; character?: string }[] };
  "watch/providers"?: {
    results?: Record<
      string,
      { link?: string; flatrate?: Provider[]; rent?: Provider[]; buy?: Provider[] }
    >;
  };
  external_ids?: { imdb_id?: string | null };
  translations?: { translations?: Translation[] };
}

interface ImdbInfo {
  configured: boolean;
  imdbRating?: string | null;
  imdbVotes?: string | null;
}

// Pick the English title from TMDB translations, falling back to the original title.
function englishTitle(d: Details): string | null {
  const en = d.translations?.translations?.find((t) => t.iso_639_1 === "en");
  const fromTranslation = en?.data?.title || en?.data?.name;
  const candidate = fromTranslation || d.original_title || d.original_name || "";
  const localized = d.title || d.name || "";
  return candidate && candidate !== localized ? candidate : null;
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
  const [imdb, setImdb] = useState<ImdbInfo | null>(null);
  const [imdbId, setImdbId] = useState<string | null>(null);
  const [showRecommend, setShowRecommend] = useState(false);
  const [recNote, setRecNote] = useState("");
  const [recommending, setRecommending] = useState(false);

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
        const imdb_id = d.external_ids?.imdb_id ?? null;
        setImdbId(imdb_id);
        if (imdb_id) {
          api<ImdbInfo>(`/api/titles/imdb/${imdb_id}`, { auth: false })
            .then(setImdb)
            .catch(() => {});
        }
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

  async function submitRecommendation() {
    if (!user) return router.push("/login");
    if (!details) return;
    setRecommending(true);
    try {
      await api("/api/recommendations", {
        method: "POST",
        body: {
          tmdbId,
          mediaType: type,
          title: details.title ?? details.name ?? "",
          posterPath: details.poster_path ?? null,
          note: recNote.trim() || undefined,
        },
      });
      setShowRecommend(false);
      setRecNote("");
      Alert.alert("تم الترشيح 🎯", "ترشيحك ظهر في ترشيحات اليوم");
    } catch (e) {
      Alert.alert("خطأ", e instanceof Error ? e.message : "تعذّر الترشيح");
    } finally {
      setRecommending(false);
    }
  }

  function openImdb() {
    if (imdbId) Linking.openURL(`https://www.imdb.com/title/${imdbId}/`);
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
  const english = englishTitle(details);
  const year = (details.release_date ?? details.first_air_date ?? "").slice(0, 4);
  const providersByRegion = details["watch/providers"]?.results ?? {};
  const regionProviders = providersByRegion[REGION] ?? providersByRegion["US"];
  const justWatchLink = regionProviders?.link ?? null;
  const watchOn = [
    ...(regionProviders?.flatrate ?? []),
    ...(regionProviders?.rent ?? []),
    ...(regionProviders?.buy ?? []),
  ];
  // de-dup providers by id
  const uniqueProviders = Array.from(
    new Map(watchOn.map((p) => [p.provider_id, p])).values()
  );

  // Open the title on the tapped platform; fall back to the JustWatch page.
  const openProvider = (providerName: string) => {
    const url = providerDeepLink(providerName, name) ?? justWatchLink;
    if (url) Linking.openURL(url);
  };
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
          {english ? <Text style={styles.englishTitle}>{english}</Text> : null}
          <Text style={styles.meta}>
            {type === "tv" ? "مسلسل" : "فيلم"}
            {year ? ` • ${year}` : ""}
            {details.runtime ? ` • ${details.runtime} د` : ""}
          </Text>
          <View style={styles.scoreRow}>
            {typeof details.vote_average === "number" && details.vote_average > 0 && (
              <Text style={styles.tmdbScore}>TMDB ★ {details.vote_average.toFixed(1)}</Text>
            )}
            {imdbId && (
              <Pressable onPress={openImdb} style={styles.imdbChip}>
                <Text style={styles.imdbText}>
                  IMDb{imdb?.imdbRating ? ` ★ ${imdb.imdbRating}` : " ↗"}
                </Text>
              </Pressable>
            )}
          </View>
          <View style={styles.genres}>
            {details.genres?.slice(0, 3).map((g) => (
              <View key={g.id} style={styles.genreChip}>
                <Text style={styles.genreText}>{g.name}</Text>
              </View>
            ))}
          </View>
        </View>
      </View>

      <View style={styles.actionRow}>
        <Pressable
          style={styles.addBtn}
          onPress={() => (user ? setShowAdd(true) : router.push("/login"))}
        >
          <Text style={styles.addBtnText}>＋ أضف إلى قائمة</Text>
        </Pressable>
        <Pressable
          style={styles.recBtn}
          onPress={() => (user ? setShowRecommend(true) : router.push("/login"))}
        >
          <Text style={styles.recBtnText}>🎯 رشّح للسهرة</Text>
        </Pressable>
      </View>

      {/* Where to watch — tap a platform to open the title there */}
      {uniqueProviders.length > 0 ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📍 وين تشوفه</Text>
          <Text style={styles.sectionHint}>اضغط المنصة عشان تفتح العمل عليها</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 10 }}>
            {uniqueProviders.map((p) => (
              <Pressable
                key={p.provider_id}
                style={styles.provider}
                onPress={() => openProvider(p.provider_name)}
              >
                <Image
                  source={{ uri: `https://image.tmdb.org/t/p/w92${p.logo_path}` }}
                  style={styles.providerLogo}
                />
                <Text style={styles.providerName} numberOfLines={1}>
                  {p.provider_name}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
          {justWatchLink && (
            <Pressable style={styles.allPlatforms} onPress={() => Linking.openURL(justWatchLink)}>
              <Text style={styles.allPlatformsText}>كل المنصات والأسعار ↗</Text>
            </Pressable>
          )}
        </View>
      ) : justWatchLink ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📍 وين تشوفه</Text>
          <Pressable style={styles.allPlatforms} onPress={() => Linking.openURL(justWatchLink)}>
            <Text style={styles.allPlatformsText}>اعرف وين يُعرض ↗</Text>
          </Pressable>
        </View>
      ) : null}

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

      <Modal visible={showRecommend} transparent animationType="slide" onRequestClose={() => setShowRecommend(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setShowRecommend(false)} />
        <View style={styles.modalSheet}>
          <View style={styles.modalHandle} />
          <Text style={styles.modalHeading}>🎯 رشّح "{name}" للسهرة</Text>
          <Text style={styles.modalSub}>أضف سبب الترشيح (اختياري) ليشوفه الناس</Text>
          <TextInput
            value={recNote}
            onChangeText={setRecNote}
            placeholder="مثلاً: فيلم أكشن خفيف يناسب سهرة الويكند"
            placeholderTextColor={colors.textMuted}
            multiline
            style={styles.modalInput}
          />
          <Pressable
            style={[styles.modalBtn, recommending && styles.disabled]}
            disabled={recommending}
            onPress={submitRecommendation}
          >
            <Text style={styles.modalBtnText}>{recommending ? "..." : "انشر الترشيح"}</Text>
          </Pressable>
        </View>
      </Modal>
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
  englishTitle: { color: colors.textMuted, fontSize: 14, fontWeight: "600", marginTop: 2, textAlign: "right" },
  meta: { color: colors.textMuted, fontSize: 14, marginTop: 6, textAlign: "right" },
  scoreRow: { flexDirection: "row-reverse", alignItems: "center", gap: 10, marginTop: 8 },
  tmdbScore: { color: colors.accent, fontSize: 14, fontWeight: "700", textAlign: "right" },
  imdbChip: {
    backgroundColor: "#f5c518",
    borderRadius: radius.sm,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  imdbText: { color: "#1a1a1a", fontSize: 13, fontWeight: "900" },
  genres: { flexDirection: "row-reverse", flexWrap: "wrap", gap: 6, marginTop: 10 },
  genreChip: { backgroundColor: colors.surface, borderRadius: radius.sm, paddingHorizontal: 10, paddingVertical: 4 },
  genreText: { color: colors.textMuted, fontSize: 12 },
  actionRow: { flexDirection: "row-reverse", gap: 10, marginHorizontal: 16 },
  addBtn: {
    flex: 1,
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: 14,
    alignItems: "center",
  },
  addBtnText: { color: "#fff", fontWeight: "800", fontSize: 15 },
  recBtn: {
    flex: 1,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.accent,
    borderRadius: radius.md,
    paddingVertical: 14,
    alignItems: "center",
  },
  recBtnText: { color: colors.accent, fontWeight: "800", fontSize: 15 },
  modalBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)" },
  modalSheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: 20,
    paddingBottom: 36,
  },
  modalHandle: {
    width: 44,
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.border,
    alignSelf: "center",
    marginBottom: 14,
  },
  modalHeading: { color: colors.text, fontSize: 18, fontWeight: "800", textAlign: "right" },
  modalSub: { color: colors.textMuted, fontSize: 14, marginTop: 6, marginBottom: 14, textAlign: "right" },
  modalInput: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: colors.text,
    minHeight: 70,
    textAlign: "right",
    textAlignVertical: "top",
  },
  modalBtn: {
    backgroundColor: colors.accent,
    borderRadius: radius.md,
    paddingVertical: 15,
    alignItems: "center",
    marginTop: 16,
  },
  modalBtnText: { color: "#1a1a1a", fontWeight: "900", fontSize: 16 },
  section: { paddingHorizontal: 16, marginTop: 26 },
  sectionTitle: { color: colors.text, fontSize: 18, fontWeight: "800", textAlign: "right" },
  sectionHint: { color: colors.textMuted, fontSize: 12, marginTop: 4, textAlign: "right" },
  allPlatforms: {
    marginTop: 12,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingVertical: 12,
    alignItems: "center",
  },
  allPlatformsText: { color: colors.text, fontWeight: "700", fontSize: 14 },
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
