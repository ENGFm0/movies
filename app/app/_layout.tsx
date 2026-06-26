import { useEffect } from "react";
import { I18nManager } from "react-native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AuthProvider } from "@/context/AuthContext";
import { colors } from "@/theme";

// Force right-to-left layout for the Arabic UI.
I18nManager.allowRTL(true);
try {
  I18nManager.forceRTL(true);
} catch {
  /* no-op on web */
}

export default function RootLayout() {
  useEffect(() => {}, []);
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <StatusBar style="light" />
        <Stack
          screenOptions={{
            headerStyle: { backgroundColor: colors.bg },
            headerTintColor: colors.text,
            headerTitleStyle: { fontWeight: "800" },
            contentStyle: { backgroundColor: colors.bg },
          }}
        >
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="login" options={{ title: "تسجيل الدخول", presentation: "modal" }} />
          <Stack.Screen name="register" options={{ title: "حساب جديد", presentation: "modal" }} />
          <Stack.Screen name="title/[mediaType]/[id]" options={{ title: "" }} />
          <Stack.Screen name="list/[id]" options={{ title: "القائمة" }} />
          <Stack.Screen name="shared/[shareId]" options={{ title: "قائمة مشتركة" }} />
          <Stack.Screen name="recommendation/[id]" options={{ title: "الترشيح" }} />
        </Stack>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
