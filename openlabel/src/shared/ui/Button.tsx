import { ActivityIndicator, View } from 'react-native';
import { palette, radius } from '@/core/theme';
import { cn } from '@/shared/utils/cn';
import { GlassSurface, isLiquidGlassAvailable } from './GlassSurface';
import { PressableScale } from './PressableScale';
import { Text, TextTone } from './Text';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'glass';
export type ButtonSize = 'md' | 'lg';

export interface ButtonProps {
  label: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  icon?: React.ReactNode;
  className?: string;
}

const surface: Record<ButtonVariant, string> = {
  primary: palette.ink,
  secondary: palette.surface,
  ghost: 'transparent',
  danger: palette.danger,
  // On iOS 26 the native material provides the background; the fallback uses a
  // translucent ink so the label stays legible over the camera viewfinder.
  glass: isLiquidGlassAvailable() ? 'transparent' : 'rgba(17,17,17,0.55)',
};

const labelTone: Record<ButtonVariant, TextTone> = {
  primary: 'inverse',
  secondary: 'primary',
  ghost: 'primary',
  danger: 'inverse',
  glass: 'inverse',
};

export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'lg',
  disabled,
  loading,
  fullWidth = true,
  icon,
  className,
}: ButtonProps) {
  const isDisabled = disabled || loading;
  const indicatorColor =
    variant === 'primary' || variant === 'danger' || variant === 'glass'
      ? palette.white
      : palette.ink;

  const inner = loading ? (
    <ActivityIndicator color={indicatorColor} />
  ) : (
    <View className="flex-row items-center gap-2">
      {icon}
      <Text
        variant={size === 'lg' ? 'body' : 'secondary'}
        weight="semibold"
        tone={labelTone[variant]}
      >
        {label}
      </Text>
    </View>
  );

  if (variant === 'glass') {
    return (
      <PressableScale
        accessibilityRole="button"
        accessibilityState={{ disabled: isDisabled, busy: loading }}
        disabled={isDisabled}
        onPress={onPress}
        className={cn(fullWidth && 'w-full', isDisabled && 'opacity-40', className)}
      >
        <GlassSurface
          glassStyle="regular"
          interactive
          fallbackBackground={surface.glass}
          className={cn(
            'flex-row items-center justify-center',
            size === 'lg' ? 'h-14 px-6' : 'h-11 px-4',
            fullWidth && 'w-full',
          )}
          style={{ borderRadius: radius.button, overflow: 'hidden' }}
        >
          {inner}
        </GlassSurface>
      </PressableScale>
    );
  }

  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      disabled={isDisabled}
      onPress={onPress}
      className={cn(
        'flex-row items-center justify-center',
        size === 'lg' ? 'h-14 px-6' : 'h-11 px-4',
        fullWidth && 'w-full',
        variant === 'secondary' && 'border border-hairline',
        isDisabled && 'opacity-40',
        className,
      )}
      style={{
        backgroundColor: surface[variant],
        borderRadius: radius.button,
      }}
    >
      {inner}
    </PressableScale>
  );
}
