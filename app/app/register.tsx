import { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
} from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "@/context/AuthContext";
import { colors, radius } from "@/theme";

export default function RegisterScreen() {
  const router = useRouter();
  const { register } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    setError(null);
    if (password.length < 6) {
      setError("كلمة المرور لازم تكون ٦ أحرف على الأقل");
      return;
    }
    setBusy(true);
    try {
      await register(name.trim(), email.trim(), password);
      router.back();
    } catch (e) {
      setError(e instanceof Error ? e.message : "تعذّر إنشاء الحساب");
    } finally {
      setBusy(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <Text style={styles.title}>حساب جديد 🎬</Text>
      <Text style={styles.subtitle}>سجّل وابدأ تسوي قوائمك وتقيّم أفلامك</Text>

      <TextInput
        value={name}
        onChangeText={setName}
        placeholder="الاسم"
        placeholderTextColor={colors.textMuted}
        style={styles.input}
      />
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
        placeholder="كلمة المرور (٦ أحرف فأكثر)"
        placeholderTextColor={colors.textMuted}
        secureTextEntry
        style={styles.input}
      />

      {error && <Text style={styles.error}>{error}</Text>}

      <Pressable style={[styles.btn, busy && styles.disabled]} disabled={busy} onPress={submit}>
        {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>إنشاء الحساب</Text>}
      </Pressable>

      <Pressable onPress={() => router.replace("/login")} style={styles.linkBtn}>
        <Text style={styles.link}>عندك حساب؟ سجّل دخولك</Text>
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
