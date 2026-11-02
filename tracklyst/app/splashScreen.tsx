import { Colors } from "@/constants/theme";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useColorScheme,
} from "react-native";

type FeatherIconName = React.ComponentProps<typeof Feather>["name"];

interface OnboardingSlide {
  id: number;
  title: string;
  description: string;
  icon: FeatherIconName;
}

const SLIDES: OnboardingSlide[] = [
  {
    id: 1,
    title: "Gérez vos finances",
    description:
      "Suivez vos revenus et dépenses en temps réel. Gardez le contrôle total sur votre argent.",
    icon: "trending-up",
  },
  {
    id: 2,
    title: "Organisez vos transactions",
    description:
      "Catégorisez automatiquement vos dépenses et revenus. Visualisez où va votre argent.",
    icon: "layers",
  },
  {
    id: 3,
    title: "Atteignez vos objectifs",
    description:
      "Définissez des objectifs financiers et suivez vos progrès. Économisez pour ce qui compte vraiment.",
    icon: "target",
  },
  {
    id: 4,
    title: "Budgets partagés",
    description:
      "Créez des budgets en groupe avec famille ou amis. Gérez vos finances ensemble en toute transparence.",
    icon: "users",
  },
];

export default function SplashScreen() {
  const isDark = useColorScheme() === "dark";
  const c = isDark ? Colors.dark : Colors.light;
  const router = useRouter();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isMounted, setIsMounted] = useState(false);
  const scaleAnim = useRef(new Animated.Value(1)).current;

  // ✅ Wait for Root Layout to mount before any navigation
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // ✅ Safe access — clamp index to valid range
  const safeIndex = Math.min(Math.max(currentIndex, 0), SLIDES.length - 1);
  const currentSlide = SLIDES[safeIndex];
  const isLast = safeIndex === SLIDES.length - 1;

  const animatePress = (callback: () => void) => {
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.96,
        duration: 80,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 80,
        useNativeDriver: true,
      }),
    ]).start(() => callback());
  };

  const navigate = (path: string) => {
    if (!isMounted) return;
    router.replace(path as any);
  };

  const handleNext = () => {
    animatePress(() => {
      if (!isLast) {
        setCurrentIndex((prev) => Math.min(prev + 1, SLIDES.length - 1));
      } else {
        navigate("/(auth)/login");
      }
    });
  };

  const handleSkip = () => {
    navigate("/(auth)/login");
  };

  return (
    <View style={[styles.container, { backgroundColor: c.bg }]}>
      <StatusBar style={isDark ? "light" : "dark"} />

      {/* Skip */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleSkip} style={styles.skipButton}>
          <Text style={[styles.skipText, { color: c.textSubtle }]}>Passer</Text>
          <Feather name="arrow-right" size={14} color={c.textSubtle} />
        </TouchableOpacity>
      </View>

      {/* Main Content */}
      <View style={styles.content}>
        {/* Icon illustration */}
        <View style={styles.iconWrapper}>
          <View style={[styles.iconRing, { borderColor: c.tint + "22" }]}>
            <View style={[styles.iconCircle, { backgroundColor: c.tintMuted }]}>
              <Feather name={currentSlide.icon} size={40} color={c.tint} />
            </View>
          </View>
        </View>

        {/* Text */}
        <View style={styles.textContent}>
          <Text style={[styles.title, { color: c.text }]}>
            {currentSlide.title}
          </Text>
          <Text style={[styles.description, { color: c.textMuted }]}>
            {currentSlide.description}
          </Text>
        </View>
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        {/* Step indicator */}
        <View style={styles.pagination}>
          {SLIDES.map((_, index) => (
            <View
              key={index}
              style={[
                styles.dot,
                index === safeIndex
                  ? [styles.dotActive, { backgroundColor: c.tint }]
                  : [styles.dotInactive, { backgroundColor: c.border }],
              ]}
            />
          ))}
        </View>

        {/* CTA Button */}
        <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
          <TouchableOpacity
            style={[styles.button, { backgroundColor: c.tint }]}
            onPress={handleNext}
            activeOpacity={0.9}
          >
            <Text style={styles.buttonText}>
              {isLast ? "Commencer" : "Suivant"}
            </Text>
            <Feather
              name={isLast ? "check" : "arrow-right"}
              size={18}
              color="#fff"
              style={{ marginLeft: 8 }}
            />
          </TouchableOpacity>
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  header: {
    paddingTop: 60,
    paddingHorizontal: 24,
    alignItems: "flex-end",
  },
  skipButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 2,
  },
  skipText: {
    fontSize: 14,
    fontWeight: "500",
  },

  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
  },
  iconWrapper: {
    marginBottom: 52,
  },
  iconRing: {
    width: 160,
    height: 160,
    borderRadius: 80,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  iconCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: "center",
    justifyContent: "center",
  },
  textContent: {
    alignItems: "center",
    gap: 14,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    textAlign: "center",
    letterSpacing: -0.4,
  },
  description: {
    fontSize: 15,
    textAlign: "center",
    lineHeight: 24,
    maxWidth: 300,
  },

  footer: {
    paddingHorizontal: 24,
    paddingBottom: 52,
    gap: 28,
  },
  pagination: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
  },
  dot: {
    height: 6,
    borderRadius: 3,
  },
  dotActive: {
    width: 22,
  },
  dotInactive: {
    width: 6,
  },
  button: {
    height: 54,
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 14,
    elevation: 5,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 0.1,
  },
});
