import { useCallback } from 'react';
import {
  GestureResponderEvent,
  Pressable,
  PressableProps,
  ViewStyle,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export interface PressableScaleProps extends PressableProps {
  /** Scale applied while pressed. */
  activeScale?: number;
  /** Fire a light selection haptic on press-in. */
  haptic?: boolean;
  style?: ViewStyle;
}

/**
 * A Pressable that springs down slightly when touched — the small physical
 * detail that makes taps feel responsive and premium (Cash App / Linear feel).
 */
export function PressableScale({
  activeScale = 0.97,
  haptic = true,
  onPressIn,
  onPressOut,
  style,
  children,
  ...rest
}: PressableScaleProps) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = useCallback(
    (e: GestureResponderEvent) => {
      scale.value = withTiming(activeScale, { duration: 90 });
      if (haptic) {
        Haptics.selectionAsync().catch(() => undefined);
      }
      onPressIn?.(e);
    },
    [activeScale, haptic, onPressIn, scale],
  );

  const handlePressOut = useCallback(
    (e: GestureResponderEvent) => {
      scale.value = withTiming(1, { duration: 140 });
      onPressOut?.(e);
    },
    [onPressOut, scale],
  );

  return (
    <AnimatedPressable
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[style, animatedStyle]}
      {...rest}
    >
      {children}
    </AnimatedPressable>
  );
}
