import { useEffect, useState } from 'react';
import { View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import Animated, {
  runOnJS,
  useAnimatedProps,
  useAnimatedReaction,
  useSharedValue,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { palette, verdictColors, VerdictTone } from '@/core/theme';
import { formatScore } from '@/shared/utils/format';
import { Text } from './Text';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export interface ScoreRingProps {
  score: number; // 0..100
  tone: VerdictTone;
  size?: number;
  strokeWidth?: number;
  caption?: string;
}

/**
 * Circular score gauge. The arc sweeps in on mount for a calm, confident
 * reveal — the single most important number in the whole app.
 */
export function ScoreRing({
  score,
  tone,
  size = 168,
  strokeWidth = 14,
  caption = 'out of 10',
}: ScoreRingProps) {
  const clamped = Math.max(0, Math.min(100, Math.round(score)));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const color = verdictColors[tone].fg;

  const progress = useSharedValue(0);
  // The big number counts up in lock-step with the arc sweep.
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    progress.value = withTiming(clamped / 100, {
      duration: 900,
      easing: Easing.out(Easing.cubic),
    });
  }, [clamped, progress]);

  useAnimatedReaction(
    () => Math.round(progress.value * 100),
    (value, previous) => {
      if (value !== previous) runOnJS(setDisplay)(value);
    },
  );

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: circumference * (1 - progress.value),
  }));

  return (
    <View style={{ width: size, height: size }} className="items-center justify-center">
      <Svg width={size} height={size}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={palette.hairline}
          strokeWidth={strokeWidth}
          fill="none"
        />
        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={circumference}
          animatedProps={animatedProps}
          // Start the sweep from 12 o'clock.
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <View className="absolute items-center justify-center">
        <Text variant="hero" weight="bold" style={{ fontSize: 46, lineHeight: 50, color }}>
          {formatScore(display)}
        </Text>
        <Text variant="caption" tone="tertiary" weight="medium">
          {caption}
        </Text>
      </View>
    </View>
  );
}
