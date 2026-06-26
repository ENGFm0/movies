import { Tabs } from "expo-router";
import { Text } from "react-native";
import { colors } from "@/theme";

// Simple emoji-based tab icons keep the bundle light (no icon font wiring needed).
function TabIcon({ glyph, color }: { glyph: string; color: string }) {
  return <Text style={{ fontSize: 20, color }}>{glyph}</Text>;
}

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
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "الرئيسية",
          tabBarLabel: "الرئيسية",
          tabBarIcon: ({ color }) => <TabIcon glyph="🏠" color={color} />,
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: "بحث",
          tabBarLabel: "بحث",
          tabBarIcon: ({ color }) => <TabIcon glyph="🔍" color={color} />,
        }}
      />
      <Tabs.Screen
        name="lists"
        options={{
          title: "قوائمي",
          tabBarLabel: "قوائمي",
          tabBarIcon: ({ color }) => <TabIcon glyph="📁" color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "حسابي",
          tabBarLabel: "حسابي",
          tabBarIcon: ({ color }) => <TabIcon glyph="👤" color={color} />,
        }}
      />
    </Tabs>
  );
}
