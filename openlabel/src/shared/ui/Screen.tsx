import { ReactNode } from 'react';
import { ScrollView, View, ViewStyle } from 'react-native';
import { Edge, SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { palette } from '@/core/theme';
import { cn } from '@/shared/utils/cn';

export interface ScreenProps {
  children: ReactNode;
  scroll?: boolean;
  /** Safe-area edges to pad. Defaults to top + bottom. */
  edges?: Edge[];
  /** Horizontal screen gutter (px-6 by default). */
  padded?: boolean;
  contentClassName?: string;
  contentContainerStyle?: ViewStyle;
  backgroundColor?: string;
}

/**
 * Standard page frame: safe-area aware, calm #FAFAF8 canvas, generous gutters.
 * Pass `scroll` for content that can exceed the viewport.
 */
export function Screen({
  children,
  scroll = false,
  edges = ['top', 'bottom'],
  padded = true,
  contentClassName,
  contentContainerStyle,
  backgroundColor = palette.background,
}: ScreenProps) {
  const inner = (
    <View className={cn(padded && 'px-6', 'flex-1', contentClassName)}>{children}</View>
  );

  return (
    <SafeAreaView edges={edges} style={{ flex: 1, backgroundColor }}>
      {/* Light canvas → dark status-bar icons. Asserted per-screen because the
          scanner underneath the stack forces `light` and expo-status-bar is
          last-mounted-wins. */}
      <StatusBar style="dark" />
      {scroll ? (
        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[{ flexGrow: 1, paddingBottom: 32 }, contentContainerStyle]}
        >
          {inner}
        </ScrollView>
      ) : (
        inner
      )}
    </SafeAreaView>
  );
}
