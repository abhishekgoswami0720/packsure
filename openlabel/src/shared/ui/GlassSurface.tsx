import { forwardRef } from 'react';
import { View, ViewProps, ViewStyle } from 'react-native';
import {
  GlassView,
  isLiquidGlassAvailable,
  type GlassStyle,
} from 'expo-glass-effect';

export interface GlassSurfaceProps extends ViewProps {
  /** iOS 26 glass material variant. Falls back on older OS / Android. */
  glassStyle?: GlassStyle;
  /** Optional tint applied to the glass (or to the fallback). */
  tintColor?: string;
  /** Whether the surface should react to touches with subtle highlights. */
  interactive?: boolean;
  /** Fallback background for non-Liquid-Glass platforms. */
  fallbackBackground?: string;
}

const GLASS_AVAILABLE = isLiquidGlassAvailable();

/**
 * A drop-in container that renders iOS 26 Liquid Glass when available, and
 * gracefully degrades to a translucent View on older iOS / Android / web.
 */
export const GlassSurface = forwardRef<View, GlassSurfaceProps>(function GlassSurface(
  {
    glassStyle = 'regular',
    tintColor,
    interactive = false,
    fallbackBackground = 'rgba(255,255,255,0.18)',
    style,
    children,
    ...rest
  },
  ref,
) {
  if (GLASS_AVAILABLE) {
    return (
      <GlassView
        ref={ref}
        glassEffectStyle={glassStyle}
        tintColor={tintColor}
        isInteractive={interactive}
        style={style}
        {...rest}
      >
        {children}
      </GlassView>
    );
  }

  const fallbackStyle: ViewStyle = {
    backgroundColor: tintColor ?? fallbackBackground,
  };

  return (
    <View ref={ref} style={[fallbackStyle, style]} {...rest}>
      {children}
    </View>
  );
});

export { isLiquidGlassAvailable };
