import { ThemedText } from "@/src/components/themed-text";
import { ThemedView } from "@/src/components/themed-view";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useEffect, useRef, useState } from "react";
import { Animated, StyleSheet, TouchableOpacity, View } from "react-native";

type FeatherIconName = React.ComponentProps<typeof Feather>["name"];

interface OnboardingSlide {
  id: number;
  title: string;
  description: string;
  color: string;
  iconBg: string;
  icon: FeatherIconName;
}

const SLIDES: OnboardingSlide[] = [
  {
    id: 1,
    title: "Gérez vos finances",
    description:
      "Suivez vos revenus et dépenses en temps réel. Gardez le contrôle total sur votre argent.",
    color: "#10B981",
    iconBg: "#D1FAE5",
    icon: "trending-up",
  },
  {
    id: 2,
    title: "Organisez vos transactions",
    description:
      "Catégorisez automatiquement vos dépenses et revenus. Visualisez où va votre argent.",
    color: "#3B82F6",
    iconBg: "#DBEAFE",
    icon: "layers",
  },
  {
    id: 3,
    title: "Atteignez vos objectifs",
    description:
      "Définissez des objectifs financiers et suivez vos progrès. Économisez pour ce qui compte vraiment.",
    color: "#8B5CF6",
    iconBg: "#EDE9FE",
    icon: "target",
  },
  {
    id: 4,
    title: "Budgets partagés",
    description:
      "Créez des budgets en groupe avec famille ou amis. Gérez vos finances ensemble en toute transparence.",
    color: "#EC4899",
    iconBg: "#FCE7F3",
    icon: "users",
  },
];

export default function SplashScreen() {
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
    <ThemedView style={styles.container}>
      <StatusBar style="dark" />

      {/* Skip */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleSkip} style={styles.skipButton}>
          <ThemedText style={styles.skipText}>Passer</ThemedText>
          <Feather name="arrow-right" size={14} color="#9CA3AF" />
        </TouchableOpacity>
      </View>

      {/* Main Content */}
      <View style={styles.content}>
        {/* Icon illustration */}
        <View style={styles.iconWrapper}>
          <View
            style={[
              styles.iconRing,
              { borderColor: currentSlide.color + "22" },
            ]}
          >
            <View
              style={[
                styles.iconCircle,
                { backgroundColor: currentSlide.iconBg },
              ]}
            >
              <Feather
                name={currentSlide.icon}
                size={40}
                color={currentSlide.color}
              />
            </View>
          </View>
        </View>

        {/* Text */}
        <View style={styles.textContent}>
          <ThemedText type="title" style={styles.title}>
            {currentSlide.title}
          </ThemedText>
          <ThemedText style={styles.description}>
            {currentSlide.description}
          </ThemedText>
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
                  ? [styles.dotActive, { backgroundColor: currentSlide.color }]
                  : styles.dotInactive,
              ]}
            />
          ))}
        </View>

        {/* CTA Button */}
        <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
          <TouchableOpacity
            style={[styles.button, { backgroundColor: currentSlide.color }]}
            onPress={handleNext}
            activeOpacity={0.9}
          >
            <ThemedText style={styles.buttonText}>
              {isLast ? "Commencer" : "Suivant"}
            </ThemedText>
            <Feather
              name={isLast ? "check" : "arrow-right"}
              size={18}
              color="#fff"
              style={{ marginLeft: 8 }}
            />
          </TouchableOpacity>
        </Animated.View>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F7F8FA",
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
    color: "#9CA3AF",
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
    fontWeight: "700",
    textAlign: "center",
    letterSpacing: -0.4,
    color: "#111827",
  },
  description: {
    fontSize: 15,
    textAlign: "center",
    color: "#6B7280",
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
    backgroundColor: "#D1D5DB",
  },
  button: {
    height: 54,
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
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
