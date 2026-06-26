import { Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "@/context/AuthContext";
import { colors, radius } from "@/theme";

export default function ProfileScreen() {
  const router = useRouter();
  const { user, logout } = useAuth();

  if (!user) {
    return (
      <View style={styles.center}>
        <Text style={styles.emoji}>👤</Text>
        <Text style={styles.muted}>سجّل دخولك للوصول إلى قوائمك وتقييماتك</Text>
        <Pressable style={styles.primaryBtn} onPress={() => router.push("/login")}>
          <Text style={styles.primaryBtnText}>تسجيل الدخول</Text>
        </Pressable>
        <Pressable style={styles.linkBtn} onPress={() => router.push("/register")}>
          <Text style={styles.linkText}>ما عندك حساب؟ سجّل الآن</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{user.name.charAt(0).toUpperCase()}</Text>
      </View>
      <Text style={styles.name}>{user.name}</Text>
      <Text style={styles.email}>{user.email}</Text>

      <Pressable style={styles.logoutBtn} onPress={logout}>
        <Text style={styles.logoutText}>تسجيل الخروج</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg, alignItems: "center", paddingTop: 50 },
  center: { flex: 1, backgroundColor: colors.bg, alignItems: "center", justifyContent: "center", padding: 24 },
  emoji: { fontSize: 50, marginBottom: 16 },
  muted: { color: colors.textMuted, fontSize: 16, textAlign: "center", marginBottom: 22, lineHeight: 26 },
  primaryBtn: { backgroundColor: colors.primary, paddingHorizontal: 30, paddingVertical: 13, borderRadius: radius.md },
  primaryBtnText: { color: "#fff", fontWeight: "800", fontSize: 16 },
  linkBtn: { marginTop: 16 },
  linkText: { color: colors.textMuted, fontSize: 14 },
  avatar: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  avatarText: { color: "#fff", fontSize: 40, fontWeight: "900" },
  name: { color: colors.text, fontSize: 24, fontWeight: "800" },
  email: { color: colors.textMuted, fontSize: 15, marginTop: 4 },
  logoutBtn: {
    marginTop: 40,
    borderWidth: 1,
    borderColor: colors.primary,
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: radius.md,
  },
  logoutText: { color: colors.primary, fontWeight: "800", fontSize: 16 },
});
