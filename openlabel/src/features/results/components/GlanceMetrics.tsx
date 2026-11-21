import { View } from 'react-native';
import { palette } from '@/core/theme';
import { Card, Icon, Text } from '@/shared/ui';
import { NutritionLevel, NutritionMetric } from '@/domain/scoring/types';

const LEVEL_COLOR: Record<NutritionLevel, string> = {
  good: palette.success,
  moderate: palette.warning,
  high: palette.danger,
};

/**
 * The "decide in two seconds" panel: how processed it is, the things to limit,
 * and what's genuinely good — in plain words, each a glance-able coloured line.
 * This is the heart of the simpler-than-TruthIn idea.
 */
export function GlanceMetrics({ metrics }: { metrics: NutritionMetric[] }) {
  if (metrics.length === 0) return null;

  // Lead with concerns, end with the positives.
  const ordered = [...metrics].sort((a, b) => Number(a.positive ?? false) - Number(b.positive ?? false));

  return (
    <Card padded>
      <Text variant="section" weight="semibold">
        At a glance
      </Text>
      <View className="mt-3 gap-3">
        {ordered.map((m) => (
          <View key={m.key} className="flex-row items-center">
            {m.positive ? (
              <Icon name="check" size={18} color={palette.success} />
            ) : (
              <View
                style={{ width: 10, height: 10, borderRadius: 999, backgroundColor: LEVEL_COLOR[m.level] }}
              />
            )}
            <Text variant="body" weight="medium" className="flex-1" style={{ marginLeft: m.positive ? 8 : 12 }}>
              {m.label}
            </Text>
            {m.detail ? (
              <Text variant="caption" tone="tertiary">
                {m.detail}
              </Text>
            ) : null}
          </View>
        ))}
      </View>
    </Card>
  );
}
