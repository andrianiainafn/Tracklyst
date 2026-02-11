import { ThemedText } from '@/src/components/themed-text';
import { ThemedView } from '@/src/components/themed-view';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';


const onboardingData = [
  {
    id: 1,
    title: 'Gérez vos finances',
    description: 'Suivez vos revenus et dépenses en temps réel. Gardez le contrôle total sur votre argent.',
    color: '#10B981',
  },
  {
    id: 2,
    title: 'Organisez vos transactions',
    description: 'Catégorisez automatiquement vos dépenses et revenus. Visualisez où va votre argent.',
    color: '#3B82F6',
  },
  {
    id: 3,
    title: 'Atteignez vos objectifs',
    description: 'Définissez des objectifs financiers et suivez vos progrès. Économisez pour ce qui compte vraiment.',
    color: '#8B5CF6',
  },
  {
    id: 4,
    title: 'Budgets partagés',
    description: 'Créez des budgets en groupe avec famille ou amis. Gérez vos finances ensemble en toute transparence.',
    color: '#EC4899',
  },
];

export default function SplashScreen() {
  const router = useRouter();
  const [currentIndex, setCurrentIndex] = useState(0);

  const handleNext = () => {
    if (currentIndex < onboardingData.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      router.replace('/login');
    }
  };

  const handleSkip = () => {
    router.replace('/login');
  };

  const currentSlide = onboardingData[currentIndex];

  return (
    <ThemedView style={styles.container}>
      {/* Header avec Skip */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleSkip}>
          <ThemedText style={styles.skipText}>Passer</ThemedText>
        </TouchableOpacity>
      </View>

      {/* Contenu principal */}
      <View style={styles.content}>
        {/* Illustration colorée */}
        <View style={[styles.illustration, { backgroundColor: currentSlide.color }]}>
          <ThemedText style={styles.emoji}>💰</ThemedText>
        </View>

        {/* Titre et description */}
        <View style={styles.textContent}>
          <ThemedText type="title" style={styles.title}>
            {currentSlide.title}
          </ThemedText>
          <ThemedText style={styles.description}>
            {currentSlide.description}
          </ThemedText>
        </View>
      </View>

      {/* Footer avec pagination et bouton */}
      <View style={styles.footer}>
        {/* Dots de pagination */}
        <View style={styles.pagination}>
          {onboardingData.map((_, index) => (
            <View
              key={index}
              style={[
                styles.dot,
                index === currentIndex && styles.activeDot,
                index === currentIndex && { backgroundColor: currentSlide.color },
              ]}
            />
          ))}
        </View>

        {/* Bouton Suivant/Commencer */}
        <TouchableOpacity
          style={[styles.button, { backgroundColor: currentSlide.color }]}
          onPress={handleNext}>
          <ThemedText style={styles.buttonText}>
            {currentIndex === onboardingData.length - 1 ? 'Commencer' : 'Suivant'}
          </ThemedText>
        </TouchableOpacity>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: 24,
    alignItems: 'flex-end',
  },
  skipText: {
    fontSize: 16,
    opacity: 0.6,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  illustration: {
    width: 200,
    height: 200,
    borderRadius: 100,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 48,
  },
  emoji: {
    fontSize: 80,
  },
  textContent: {
    alignItems: 'center',
    gap: 16,
    paddingHorizontal: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  description: {
    fontSize: 16,
    textAlign: 'center',
    opacity: 0.7,
    lineHeight: 24,
  },
  footer: {
    paddingHorizontal: 24,
    paddingBottom: 48,
    gap: 24,
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#D1D5DB',
  },
  activeDot: {
    width: 24,
  },
  button: {
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});