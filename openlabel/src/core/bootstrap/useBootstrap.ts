/**
 * App bootstrap: load the Inter font family and prepare the offline database
 * before the first screen paints. Returns a single `ready` flag the root layout
 * uses to gate rendering and hide the splash screen.
 */
import { useCallback, useEffect, useState } from 'react';
import { Platform } from 'react-native';
import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';
import { getDatabase } from '@/core/db';
import { seedDatabase } from '@/data';

export interface BootstrapState {
  ready: boolean;
  error: Error | null;
  /** Re-run database preparation after a failure. */
  retry: () => void;
}

export function useBootstrap(): BootstrapState {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  const [dbReady, setDbReady] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  // Bumping this re-runs the preparation effect (used by `retry`).
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await getDatabase();
        await seedDatabase();
        if (!cancelled) setDbReady(true);
      } catch (err) {
        // On web the SQLite WASM worker needs cross-origin isolation headers
        // that a plain dev server may not set. Don't block the UI for that —
        // render with empty data so the app is still browsable. Native treats
        // a database failure as fatal (it should never happen there).
        if (Platform.OS === 'web') {
          console.warn('Database unavailable on web; continuing without it.', err);
          if (!cancelled) setDbReady(true);
        } else if (!cancelled) {
          setError(err as Error);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [attempt]);

  const retry = useCallback(() => {
    setError(null);
    setDbReady(false);
    setAttempt((n) => n + 1);
  }, []);

  return {
    ready: (fontsLoaded && dbReady) || Boolean(fontError),
    // A font load failure is non-fatal (we fall back to system fonts); only a
    // database failure blocks the app, so it's the one we surface.
    error,
    retry,
  };
}
