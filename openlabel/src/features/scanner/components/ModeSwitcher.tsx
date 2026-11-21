import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Extrapolation,
  interpolate,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  type SharedValue,
} from 'react-native-reanimated';
import { palette, radius } from '@/core/theme';
import { GlassSurface, Icon, IconName, PressableScale } from '@/shared/ui';
import { ScanMode } from '../store';

const MODES: { mode: ScanMode; label: string; icon: IconName }[] = [
  { mode: 'barcode', label: 'Barcode', icon: 'barcode' },
  { mode: 'label', label: 'Label', icon: 'label' },
];

const SEG_W = 124;
const SPRING = { damping: 20, stiffness: 220, mass: 0.6 } as const;

export interface ModeSwitcherProps {
  value: ScanMode;
  onChange: (mode: ScanMode) => void;
}

/** Segmented control whose active thumb springs between modes over the camera. */
export function ModeSwitcher({ value, onChange }: ModeSwitcherProps) {
  const index = Math.max(0, MODES.findIndex((m) => m.mode === value));
  const pos = useSharedValue(index);

  useEffect(() => {
    pos.value = withSpring(index, SPRING);
  }, [index, pos]);

  const thumbStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: pos.value * SEG_W }],
  }));

  return (
    <GlassSurface
      glassStyle="regular"
      className="self-center p-1"
      fallbackBackground="rgba(255,255,255,0.92)"
      style={{ borderRadius: radius.pill, overflow: 'hidden' }}
    >
      <View className="flex-row">
        <Animated.View
          pointerEvents="none"
          style={[
            {
              position: 'absolute',
              top: 0,
              bottom: 0,
              left: 0,
              width: SEG_W,
              borderRadius: radius.pill,
              backgroundColor: palette.ink,
            },
            thumbStyle,
          ]}
        />
        {MODES.map((item, i) => (
          <Segment
            key={item.mode}
            item={item}
            index={i}
            pos={pos}
            onPress={() => onChange(item.mode)}
          />
        ))}
      </View>
    </GlassSurface>
  );
}

interface SegmentProps {
  item: (typeof MODES)[number];
  index: number;
  pos: SharedValue<number>;
  onPress: () => void;
}

/** One tappable segment; its label + icon cross-fade to white as the thumb lands. */
function Segment({ item, index, pos, onPress }: SegmentProps) {
  const range = [index - 1, index, index + 1];

  const labelStyle = useAnimatedStyle(() => ({
    color: interpolateColor(pos.value, range, [palette.ink, palette.white, palette.ink]),
  }));
  const inkIcon = useAnimatedStyle(() => ({
    opacity: interpolate(pos.value, range, [1, 0, 1], Extrapolation.CLAMP),
  }));
  const whiteIcon = useAnimatedStyle(() => ({
    opacity: interpolate(pos.value, range, [0, 1, 0], Extrapolation.CLAMP),
  }));

  return (
    <PressableScale haptic activeScale={0.96} onPress={onPress}>
      <View className="flex-row items-center justify-center gap-2 py-3.5" style={{ width: SEG_W }}>
        <View style={{ width: 18, height: 18 }}>
          <Animated.View style={[StyleSheet.absoluteFill, inkIcon]}>
            <Icon name={item.icon} size={18} color={palette.ink} />
          </Animated.View>
          <Animated.View style={[StyleSheet.absoluteFill, whiteIcon]}>
            <Icon name={item.icon} size={18} color={palette.white} />
          </Animated.View>
        </View>
        <Animated.Text style={[{ fontFamily: 'Inter_600SemiBold', fontSize: 15 }, labelStyle]}>
          {item.label}
        </Animated.Text>
      </View>
    </PressableScale>
  );
}
