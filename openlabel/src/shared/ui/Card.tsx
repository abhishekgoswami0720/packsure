import { View, ViewProps } from 'react-native';
import { cn } from '@/shared/utils/cn';

export interface CardProps extends ViewProps {
  /** `plain` = flat surface, `raised` = subtle elevation for hero cards. */
  elevation?: 'flat' | 'raised';
  padded?: boolean;
  className?: string;
}

/**
 * The base container surface. Generous 24px radius, hairline border and an
 * optional soft shadow keep the layout spacious and premium.
 */
export function Card({
  elevation = 'flat',
  padded = true,
  className,
  style,
  children,
  ...rest
}: CardProps) {
  return (
    <View
      className={cn(
        'rounded-card bg-surface border border-hairline',
        padded && 'p-6',
        className,
      )}
      style={[
        elevation === 'raised'
          ? {
              shadowColor: '#1A1A17',
              shadowOpacity: 0.06,
              shadowRadius: 24,
              shadowOffset: { width: 0, height: 12 },
              elevation: 6,
            }
          : null,
        style,
      ]}
      {...rest}
    >
      {children}
    </View>
  );
}
