import { ReactNode } from 'react';
import { View } from 'react-native';
import { palette } from '@/core/theme';
import { cn } from '@/shared/utils/cn';
import { Icon } from './Icon';
import { PressableScale } from './PressableScale';
import { Text } from './Text';

export interface ListRowProps {
  title: string;
  subtitle?: string;
  leading?: ReactNode;
  trailing?: ReactNode;
  /** Show a chevron and make the row pressable. */
  onPress?: () => void;
  showChevron?: boolean;
  className?: string;
}

/** A single tappable row — the workhorse of the ingredient & history lists. */
export function ListRow({
  title,
  subtitle,
  leading,
  trailing,
  onPress,
  showChevron = true,
  className,
}: ListRowProps) {
  const content = (
    <View className={cn('flex-row items-center gap-4 py-4', className)}>
      {leading}
      <View className="flex-1">
        <Text variant="body" weight="medium" numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text variant="secondary" tone="secondary" numberOfLines={1} className="mt-0.5">
            {subtitle}
          </Text>
        ) : null}
      </View>
      {trailing}
      {onPress && showChevron ? (
        <Icon name="chevron-right" size={20} color={palette.inkTertiary} />
      ) : null}
    </View>
  );

  if (!onPress) return content;

  return (
    <PressableScale activeScale={0.99} haptic={false} onPress={onPress}>
      {content}
    </PressableScale>
  );
}
