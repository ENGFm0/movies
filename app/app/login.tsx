import { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "@/context/AuthContext";
import { colors, radius } from "@/theme";

export default function LoginScreen() {
  const router = useRouter();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    setError(null);
    setBusy(true);
    try {
      await login(email.trim(), password);
      router.back();
    } catch (e) {
      setError(e instanceof Error ? e.message : "تعذّر تسجيل الدخول");
    } finally {
      setBusy(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <Text style={styles.title}>أهلاً من جديد 👋</Text>
      <Text style={styles.subtitle}>سجّل دخولك للوصول إلى قوائمك وتقييماتك</Text>

      <TextInput
        value={email}
        onChangeText={setEmail}
        placeholder="البريد الإلكتروني"
        placeholderTextColor={colors.textMuted}
        autoCapitalize="none"
        keyboardType="email-address"
        style={styles.input}
      />
      <TextInput
        value={password}
        onChangeText={setPassword}
        placeholder="كلمة المرور"
        placeholderTextColor={colors.textMuted}
        secureTextEntry
        style={styles.input}
      />

      {error && <Text style={styles.error}>{error}</Text>}

      <Pressable
        style={[styles.btn, busy && styles.disabled]}
        disabled={busy}
        onPress={submit}
      >
        {busy ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.btnText}>دخول</Text>
        )}
      </Pressable>

      <Pressable onPress={() => router.replace("/register")} style={styles.linkBtn}>
        <Text style={styles.link}>ما عندك حساب؟ سجّل الآن</Text>
      </Pressable>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg, padding: 24, justifyContent: "center" },
  title: { color: colors.text, fontSize: 28, fontWeight: "900", textAlign: "right" },
  subtitle: { color: colors.textMuted, fontSize: 15, marginTop: 8, marginBottom: 28, textAlign: "right" },
  input: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingHorizontal: 16,
    paddingVertical: 15,
    color: colors.text,
    fontSize: 16,
    marginBottom: 14,
    textAlign: "right",
  },
  error: { color: colors.primary, marginBottom: 12, textAlign: "right" },
  btn: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 6,
  },
  btnText: { color: "#fff", fontWeight: "800", fontSize: 17 },
  disabled: { opacity: 0.6 },
  linkBtn: { marginTop: 20, alignItems: "center" },
  link: { color: colors.textMuted, fontSize: 14 },
});
