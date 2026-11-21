import { useEffect } from 'react';
import { Dimensions, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { GlassSurface, Text } from '@/shared/ui';

const MORPH = { duration: 300, easing: Easing.inOut(Easing.cubic) } as const;

const CORNER = 28;
const THICK = 3;
const COLOR = 'rgba(255,255,255,0.95)';

type ReticleMode = 'barcode' | 'label';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

// Two shapes, each matched to what it frames:
//  • barcode — a wide, short landscape strip, the shape of a barcode.
//  • label   — a tall portrait window, the shape of an ingredients panel. The
//    label capture is cropped to roughly this region before OCR (see
//    cropToFrame), so what the user fits inside is what the recogniser reads.
const FRAME: Record<ReticleMode, { width: number; height: number }> = {
  barcode: { width: Math.min(SCREEN_W - 72, 300), height: 168 },
  label: {
    width: Math.min(SCREEN_W - 96, 280),
    height: Math.min(Math.round(SCREEN_H * 0.5), 440),
  },
};

function Corner({ style }: { style: object }) {
  return (
    <View
      style={[
        { position: 'absolute', width: CORNER, height: CORNER, borderColor: COLOR },
        style,
      ]}
    />
  );
}

/** A calm framing reticle whose brackets softly breathe and whose frame morphs
 *  between the barcode strip and the tall label window when the mode changes. */
export function CameraReticle({ hint, mode }: { hint: string; mode: ReticleMode }) {
  const frame = FRAME[mode];
  const pulse = useSharedValue(0.6);
  const width = useSharedValue(frame.width);
  const height = useSharedValue(frame.height);

  useEffect(() => {
    pulse.value = withRepeat(
      withTiming(1, { duration: 1500, easing: Easing.inOut(Easing.quad) }),
      -1,
      true,
    );
  }, [pulse]);

  useEffect(() => {
    width.value = withTiming(frame.width, MORPH);
    height.value = withTiming(frame.height, MORPH);
  }, [frame.width, frame.height, width, height]);

  const frameStyle = useAnimatedStyle(() => ({
    width: width.value,
    height: height.value,
    opacity: pulse.value,
  }));

  return (
    <View className="flex-1 items-center justify-center">
      <Animated.View style={frameStyle}>
        <Corner style={{ top: 0, left: 0, borderTopWidth: THICK, borderLeftWidth: THICK, borderTopLeftRadius: 16 }} />
        <Corner style={{ top: 0, right: 0, borderTopWidth: THICK, borderRightWidth: THICK, borderTopRightRadius: 16 }} />
        <Corner style={{ bottom: 0, left: 0, borderBottomWidth: THICK, borderLeftWidth: THICK, borderBottomLeftRadius: 16 }} />
        <Corner style={{ bottom: 0, right: 0, borderBottomWidth: THICK, borderRightWidth: THICK, borderBottomRightRadius: 16 }} />
      </Animated.View>
      <GlassSurface
        glassStyle="regular"
        className="mt-8 px-4 py-2"
        fallbackBackground="rgba(17,17,17,0.55)"
        style={{ borderRadius: 999, overflow: 'hidden' }}
      >
        <Text variant="secondary" weight="medium" tone="inverse" center>
          {hint}
        </Text>
      </GlassSurface>
    </View>
  );
}
