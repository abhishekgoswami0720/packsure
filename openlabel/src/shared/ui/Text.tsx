import { Text as RNText, TextProps as RNTextProps } from 'react-native';
import { fontFamily, palette, typography } from '@/core/theme';
import { cn } from '@/shared/utils/cn';

export type TextVariant = keyof typeof typography;
export type TextWeight = keyof typeof fontFamily;
export type TextTone =
  | 'primary'
  | 'secondary'
  | 'tertiary'
  | 'success'
  | 'warning'
  | 'danger'
  | 'inverse';

const toneColor: Record<TextTone, string> = {
  primary: palette.ink,
  secondary: palette.inkSecondary,
  tertiary: palette.inkTertiary,
  success: palette.success,
  warning: palette.warning,
  danger: palette.danger,
  inverse: palette.white,
};

const defaultWeight: Record<TextVariant, TextWeight> = {
  hero: 'bold',
  heading: 'bold',
  section: 'semibold',
  body: 'regular',
  secondary: 'regular',
  caption: 'medium',
};

export interface TextProps extends RNTextProps {
  variant?: TextVariant;
  weight?: TextWeight;
  tone?: TextTone;
  /** Letter spacing nudge — used to give large display type a tighter feel. */
  tracking?: number;
  center?: boolean;
  className?: string;
}

/**
 * The single typography primitive for the whole app.
 *
 * Typography (size / line-height / family / colour) is applied via `style` so
 * Inter always renders at the correct scale regardless of NativeWind ordering;
 * layout utilities still flow through `className`.
 */
export function Text({
  variant = 'body',
  weight,
  tone = 'primary',
  tracking,
  center,
  className,
  style,
  ...rest
}: TextProps) {
  const scale = typography[variant];
  const resolvedWeight = weight ?? defaultWeight[variant];

  return (
    <RNText
      className={cn(className)}
      style={[
        {
          fontFamily: fontFamily[resolvedWeight],
          fontSize: scale.fontSize,
          lineHeight: scale.lineHeight,
          color: toneColor[tone],
          textAlign: center ? 'center' : undefined,
          letterSpacing: tracking,
        },
        style,
      ]}
      {...rest}
    />
  );
}
