import { View } from 'react-native';
import { palette, radius, verdictColors } from '@/core/theme';
import { Icon, IconName, ScoreRing, Text } from '@/shared/ui';
import { ScanRecord, scanSourceLabel } from '@/domain/scans';
import { indiaRegulationFor, isIndiaSevere } from '@/domain/ingredients';
import { ScoreResult } from '@/domain/scoring/types';
import { pluralize } from '@/shared/utils/format';

const VERDICT_ICON: Record<ScoreResult['verdict']['kind'], IconName> = {
  good: 'check',
  caution: 'alert',
  concern: 'alert',
};

export interface VerdictCardProps {
  scan: ScanRecord;
  result: ScoreResult;
}

/** The hero of the results screen: the one number and the one decision. */
export function VerdictCard({ scan, result }: VerdictCardProps) {
  const { verdict, score, concernCount } = result;
  const colors = verdictColors[verdict.tone];
  const title = scan.productName ?? `${scanSourceLabel[scan.source]} scan`;

  // The single most actionable flag for an Indian shopper: anything in here is
  // restricted or banned by FSSAI.
  const severeInIndia = result.breakdown.filter((line) =>
    isIndiaSevere(indiaRegulationFor(line.ingredient)),
  ).length;

  return (
    <View
      style={{
        backgroundColor: colors.soft,
        borderRadius: radius.card,
        paddingVertical: 32,
        paddingHorizontal: 24,
        alignItems: 'center',
      }}
    >
      <View className="flex-row items-center gap-2 mb-6">
        <View
          className="items-center justify-center"
          style={{ width: 28, height: 28, borderRadius: 999, backgroundColor: colors.fg }}
        >
          <Icon name={VERDICT_ICON[verdict.kind]} size={16} color={palette.white} />
        </View>
        <Text variant="section" weight="bold" style={{ color: colors.fg }}>
          {verdict.title}
        </Text>
      </View>

      <ScoreRing score={score} tone={verdict.tone} caption="out of 10" />

      <Text variant="heading" weight="bold" center className="mt-6" numberOfLines={2}>
        {title}
      </Text>
      <Text variant="body" tone="secondary" center className="mt-2">
        {verdict.subtitle}
      </Text>

      <View className="flex-row gap-2 mt-5">
        <Badge icon="search" label={pluralize(result.matchedCount, 'ingredient')} />
        <Badge
          icon="alert"
          label={pluralize(concernCount, 'concern')}
          color={concernCount > 0 ? colors.fg : palette.inkSecondary}
        />
      </View>

      {severeInIndia > 0 ? (
        <View
          className="flex-row items-center gap-2 mt-4 px-4 py-2"
          style={{ backgroundColor: verdictColors.danger.fg, borderRadius: 999 }}
        >
          <Icon name="alert" size={15} color={palette.white} />
          <Text variant="caption" weight="bold" style={{ color: palette.white }}>
            {severeInIndia} {severeInIndia === 1 ? 'additive' : 'additives'} restricted or banned in
            India
          </Text>
        </View>
      ) : null}
    </View>
  );
}

function Badge({ icon, label, color }: { icon: IconName; label: string; color?: string }) {
  const fg = color ?? palette.inkSecondary;
  return (
    <View
      className="flex-row items-center gap-1 px-3 py-1"
      style={{ backgroundColor: 'rgba(255,255,255,0.7)', borderRadius: 999 }}
    >
      <Icon name={icon} size={14} color={fg} />
      <Text variant="caption" weight="semibold" style={{ color: fg }}>
        {label}
      </Text>
    </View>
  );
}
