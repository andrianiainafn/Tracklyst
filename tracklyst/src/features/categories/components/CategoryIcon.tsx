import { Radius } from "@/constants/theme";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import React from "react";
import { StyleProp, StyleSheet, View, ViewStyle } from "react-native";
import {
  CategoryIconName,
  DEFAULT_CATEGORY_COLOR,
  resolveCategoryIcon,
} from "../constants/categoryIcons";

type CategoryLike = {
  icon?: string | null;
  name?: string | null;
  color?: string | null;
  type?: "income" | "expense";
};

/**
 * Pastille d'icône teintée à la couleur de la catégorie.
 * `icon` force une icône précise (ex : déduite du nom d'un abonnement).
 */
export function CategoryIcon({
  category,
  icon,
  color,
  size = 40,
  filled = false,
  style,
}: {
  category?: CategoryLike | null;
  icon?: CategoryIconName | null;
  color?: string | null;
  size?: number;
  /** Fond plein + icône blanche (état sélectionné). */
  filled?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const tint = color ?? category?.color ?? DEFAULT_CATEGORY_COLOR;
  const name = icon ?? resolveCategoryIcon(category);

  return (
    <View
      style={[
        styles.tile,
        {
          width: size,
          height: size,
          borderRadius: size >= 40 ? Radius.md : Radius.sm,
          backgroundColor: filled ? tint : tint + "1F",
        },
        style,
      ]}
    >
      <MaterialCommunityIcons
        name={name}
        size={Math.round(size * 0.5)}
        color={filled ? "#fff" : tint}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  tile: { alignItems: "center", justifyContent: "center" },
});
