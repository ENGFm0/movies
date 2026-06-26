import React from "react";
import { Pressable, Text, View, StyleSheet } from "react-native";
import { colors } from "@/theme";

interface Props {
  value: number; // 0..5 (supports halves for display)
  size?: number;
  onChange?: (stars: number) => void; // when provided, stars are tappable
}

// Star rating display + optional input. Tapping star N sets the rating to N.
export function Stars({ value, size = 22, onChange }: Props) {
  const stars = [1, 2, 3, 4, 5];
  return (
    <View style={styles.row}>
      {stars.map((n) => {
        const filled = value >= n;
        const half = !filled && value >= n - 0.5;
        const glyph = filled ? "★" : half ? "⯪" : "☆";
        const star = (
          <Text style={{ fontSize: size, color: colors.accent, marginHorizontal: 1 }}>
            {glyph}
          </Text>
        );
        if (!onChange) return <View key={n}>{star}</View>;
        return (
          <Pressable key={n} hitSlop={6} onPress={() => onChange(n)}>
            {star}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center" },
});
