import React from "react";
import { StyleProp, View, ViewStyle } from "react-native";
import Svg, { Circle } from "react-native-svg";

/**
 * Anneau de progression (0..1) : piste discrète + arc arrondi.
 * Le contenu (pourcentage, icône…) se place au centre via `children`.
 */
export function ProgressRing({
  progress,
  size = 56,
  stroke = 6,
  color,
  trackColor,
  children,
  style,
}: {
  progress: number;
  size?: number;
  stroke?: number;
  color: string;
  trackColor: string;
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(1, progress));

  return (
    <View style={[{ width: size, height: size, alignItems: "center", justifyContent: "center" }, style]}>
      <Svg width={size} height={size} style={{ position: "absolute" }}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={trackColor} strokeWidth={stroke} fill="none" />
        {clamped > 0 && (
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            stroke={color}
            strokeWidth={stroke}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={`${circumference} ${circumference}`}
            strokeDashoffset={circumference * (1 - clamped)}
            // Départ en haut (12 h) plutôt qu'à 3 h.
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        )}
      </Svg>
      {children}
    </View>
  );
}
