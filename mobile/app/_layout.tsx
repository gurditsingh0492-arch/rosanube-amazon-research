import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { getDb } from '@/db';
import { Loading } from '@/ui/components';
import { colors, spacing } from '@/ui/theme';

export default function RootLayout() {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Open and migrate the database before any screen queries it.
  useEffect(() => {
    let cancelled = false;
    getDb()
      .then(() => !cancelled && setReady(true))
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err : new Error(String(err)));
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar style="dark" />
        {error ? (
          <View style={styles.fallback}>
            <Text style={styles.fallbackTitle}>Could not open the local database</Text>
            <Text style={styles.fallbackBody}>{error.message}</Text>
          </View>
        ) : !ready ? (
          <View style={styles.fallback}>
            <Loading label="Preparing Rosanube Admin…" />
          </View>
        ) : (
          <Stack
            screenOptions={{
              headerStyle: { backgroundColor: colors.surface },
              headerTitleStyle: { color: colors.text, fontWeight: '700' },
              headerTintColor: colors.primary,
              headerShadowVisible: false,
              contentStyle: { backgroundColor: colors.bg },
            }}
          >
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="product/[id]" options={{ title: 'Product' }} />
            <Stack.Screen name="supplier/[id]" options={{ title: 'Supplier' }} />
            <Stack.Screen name="order/[id]" options={{ title: 'Purchase order' }} />
            <Stack.Screen name="task/[id]" options={{ title: 'Task' }} />
            <Stack.Screen name="expense/[id]" options={{ title: 'Expense' }} />
            <Stack.Screen name="tasks" options={{ title: 'Tasks' }} />
            <Stack.Screen name="expenses" options={{ title: 'Expenses' }} />
            <Stack.Screen name="settings" options={{ title: 'Settings & data' }} />
          </Stack>
        )}
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  fallback: {
    flex: 1,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  fallbackTitle: { fontSize: 17, fontWeight: '700', color: colors.text, textAlign: 'center' },
  fallbackBody: { fontSize: 13, color: colors.textMuted, textAlign: 'center', marginTop: spacing.sm },
});
