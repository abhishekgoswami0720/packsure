import { View } from 'react-native';
import { verdictColors, VerdictTone, palette } from '@/core/theme';
import { cn } from '@/shared/utils/cn';
import { Text } from './Text';

export type PillTone = VerdictTone | 'neutral';

export interface PillProps {
  label: string;
  tone?: PillTone;
  icon?: React.ReactNode;
  className?: string;
}

/** A fully-rounded status chip used for risk levels, counts and tags. */
export function Pill({ label, tone = 'neutral', icon, className }: PillProps) {
  const colors =
    tone === 'neutral'
      ? { fg: palette.inkSecondary, soft: '#F0EFEA' }
      : verdictColors[tone];

  return (
    <View
      className={cn('flex-row items-center self-start gap-1 px-4 py-1', className)}
      style={{ backgroundColor: colors.soft, borderRadius: 999 }}
    >
      {icon}
      <Text variant="caption" weight="semibold" style={{ color: colors.fg }}>
        {label}
      </Text>
    </View>
  );
}
