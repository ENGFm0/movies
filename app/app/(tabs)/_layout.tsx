import { Tabs } from "expo-router";
import { colors } from "@/theme";

// Text-only bottom tabs (no icons).
export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: colors.bg },
        headerTintColor: colors.text,
        headerTitleStyle: { fontWeight: "800" },
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          height: 56,
          paddingTop: 6,
          paddingBottom: 6,
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: { fontSize: 13, fontWeight: "700" },
        tabBarIconStyle: { display: "none" },
      }}
    >
      <Tabs.Screen name="index" options={{ title: "الرئيسية", tabBarLabel: "الرئيسية" }} />
      <Tabs.Screen name="cinema" options={{ title: "السينما", tabBarLabel: "السينما" }} />
      <Tabs.Screen name="recommend" options={{ title: "ترشيحات اليوم", tabBarLabel: "ترشيحات" }} />
      <Tabs.Screen name="search" options={{ title: "بحث", tabBarLabel: "بحث" }} />
      <Tabs.Screen name="lists" options={{ title: "قوائمي", tabBarLabel: "قوائمي" }} />
      <Tabs.Screen name="profile" options={{ title: "حسابي", tabBarLabel: "حسابي" }} />
    </Tabs>
  );
}
