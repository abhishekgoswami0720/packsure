import { View } from 'react-native';
import { verdictColors, VerdictTone } from '@/core/theme';
import { ListRow, Text } from '@/shared/ui';
import { ScanRecord, scanSourceLabel } from '@/domain/scans';
import { VerdictKind } from '@/domain/scoring/types';
import { formatScore, pluralize, relativeTime } from '@/shared/utils/format';

const KIND_TONE: Record<VerdictKind, VerdictTone> = {
  good: 'success',
  caution: 'warning',
  concern: 'danger',
};

/** A small score chip tinted by verdict — the leading element of each row. */
function ScoreChip({ score, kind }: { score: number; kind: VerdictKind }) {
  const colors = verdictColors[KIND_TONE[kind]];
  return (
    <View
      className="items-center justify-center"
      style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: colors.soft }}
    >
      <Text variant="body" weight="bold" style={{ color: colors.fg }}>
        {formatScore(score)}
      </Text>
    </View>
  );
}

export function HistoryRow({ scan, onPress }: { scan: ScanRecord; onPress: () => void }) {
  const title = scan.productName ?? `${scanSourceLabel[scan.source]} scan`;
  const subtitle =
    scan.concernCount > 0
      ? `${relativeTime(scan.createdAt)} · ${pluralize(scan.concernCount, 'concern')}`
      : `${relativeTime(scan.createdAt)} · No concerns`;

  return (
    <ListRow
      title={title}
      subtitle={subtitle}
      leading={<ScoreChip score={scan.score} kind={scan.verdictKind} />}
      onPress={onPress}
    />
  );
}
