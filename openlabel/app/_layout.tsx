import '../global.css';

import { useEffect } from 'react';
import { View } from 'react-native';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { palette } from '@/core/theme';
import { Button, Icon, Text } from '@/shared/ui';
import { AppProviders } from '@/core/providers/AppProviders';
import { useBootstrap } from '@/core/bootstrap/useBootstrap';

// Keep the splash up until fonts + database are ready.
SplashScreen.preventAutoHideAsync().catch(() => undefined);

export default function RootLayout() {
  const { ready, error, retry } = useBootstrap();

  useEffect(() => {
    if (ready || error) SplashScreen.hideAsync().catch(() => undefined);
  }, [ready, error]);

  if (error && !ready) {
    return <BootstrapError onRetry={retry} />;
  }

  if (!ready) {
    // Splash is still visible; render nothing underneath it.
    return <View style={{ flex: 1, backgroundColor: palette.background }} />;
  }

  return (
    <AppProviders>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: palette.background },
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen name="index" options={{ animation: 'fade' }} />
        <Stack.Screen name="results" options={{ animation: 'slide_from_bottom' }} />
        <Stack.Screen name="ingredient/[id]" />
        <Stack.Screen name="history" />
      </Stack>
    </AppProviders>
  );
}

function BootstrapError({ onRetry }: { onRetry: () => void }) {
  return (
    <View
      style={{ flex: 1, backgroundColor: palette.background }}
      className="items-center justify-center px-8"
    >
      <Icon name="alert" size={32} color={palette.danger} />
      <Text variant="heading" weight="bold" center className="mt-5">
        Couldn’t start OpenLabel
      </Text>
      <Text variant="body" tone="secondary" center className="mt-3 mb-8">
        We hit a problem preparing the ingredient database. Please try again — if
        it keeps happening, restart the app.
      </Text>
      <Button label="Try again" onPress={onRetry} fullWidth={false} />
    </View>
  );
}
