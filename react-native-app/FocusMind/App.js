import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { AppProvider, useApp } from './src/context/AppContext';
import AppNavigator from './src/navigation/AppNavigator';
import { COLORS, FONTS, SPACING } from './src/theme';

function LoadingScreen() {
  return (
    <LinearGradient
      colors={['#0F0F1E', '#1A1A2E', '#16213E']}
      style={styles.loading}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      <Text style={styles.loadingEmoji}>🧠</Text>
      <Text style={styles.loadingTitle}>FocusMind</Text>
      <Text style={styles.loadingSubtitle}>Your AI Productivity Partner</Text>
      <ActivityIndicator color={COLORS.primary} style={{ marginTop: SPACING.xl }} />
    </LinearGradient>
  );
}

function RootApp() {
  const { isLoading } = useApp();
  if (isLoading) return <LoadingScreen />;
  return <AppNavigator />;
}

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AppProvider>
          <StatusBar style="light" />
          <RootApp />
        </AppProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  loadingEmoji: { fontSize: 64, marginBottom: SPACING.md },
  loadingTitle: {
    fontSize: FONTS.sizes.xxxl,
    fontWeight: '800',
    color: COLORS.textPrimary,
    letterSpacing: 1,
  },
  loadingSubtitle: {
    fontSize: FONTS.sizes.md,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
  },
});
