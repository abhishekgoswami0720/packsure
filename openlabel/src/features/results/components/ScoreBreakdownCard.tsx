import { View } from 'react-native';
import { palette, verdictColors, VerdictTone } from '@/core/theme';
import { Card, Divider, Icon, PressableScale, Text } from '@/shared/ui';
import { categoryLabel } from '@/domain/ingredients/types';
import {
  indiaBadgeLabel,
  indiaBadgeTone,
  indiaRegulationFor,
  isIndiaWatchout,
} from '@/domain/ingredients';
import { ScoreResult } from '@/domain/scoring/types';
import { formatPoints, formatScore } from '@/shared/utils/format';

export interface ScoreBreakdownCardProps {
  result: ScoreResult;
  onSelectIngredient: (id: string) => void;
}

/**
 * The transparency card — every point removed, attributed to a named
 * ingredient the user can tap to understand. This is the trust centre of the
 * app: scoring is rule-based and fully shown, never a black box.
 */
export function ScoreBreakdownCard({ result, onSelectIngredient }: ScoreBreakdownCardProps) {
  return (
    <Card padded>
      <Text variant="section" weight="semibold">
        How we scored this
      </Text>
      <Text variant="secondary" tone="secondary" className="mt-1 mb-4">
        {result.nutriGrade
          ? 'We start from the product’s nutrition quality (Nutri-Score), then adjust for any additives of concern.'
          : 'Based on the ingredients — each additive of concern removes points.'}
      </Text>

      {result.nutriGrade ? (
        <Row
          label="Nutrition quality"
          detail={`Nutri-Score ${result.nutriGrade}`}
          value={formatScore(result.baseScore)}
          muted
        />
      ) : (
        <Row label="Base score" detail="Clean slate" value="10" muted />
      )}

      {result.breakdown.length === 0 ? (
        <>
          <Divider className="my-1" />
          <View className="py-3 flex-row items-center gap-2">
            <Icon name="check" size={18} color={palette.success} />
            <Text variant="body" tone="secondary">
              No ingredients of concern found.
            </Text>
          </View>
        </>
      ) : (
        result.breakdown.map((line) => {
          const india = indiaRegulationFor(line.ingredient);
          const badge = isIndiaWatchout(india)
            ? { label: indiaBadgeLabel(india), tone: indiaBadgeTone(india) }
            : undefined;
          return (
            <View key={line.ingredient.id}>
              <Divider className="my-1" />
              <PressableScale
                haptic={false}
                activeScale={0.99}
                onPress={() => onSelectIngredient(line.ingredient.id)}
              >
                <Row
                  label={line.ingredient.name}
                  detail={categoryLabel[line.ingredient.category]}
                  value={formatPoints(line.points)}
                  badge={badge}
                  chevron
                />
              </PressableScale>
            </View>
          );
        })
      )}

      <Divider className="my-1" />
      <Row label="Final score" detail="Out of 10" value={formatScore(result.score)} emphasis />
    </Card>
  );
}

function Row({
  label,
  detail,
  value,
  muted,
  emphasis,
  chevron,
  badge,
}: {
  label: string;
  detail: string;
  value: string;
  muted?: boolean;
  emphasis?: boolean;
  chevron?: boolean;
  badge?: { label: string; tone: VerdictTone };
}) {
  return (
    <View className="flex-row items-center py-3">
      <View className="flex-1 pr-3">
        <Text variant="body" weight={emphasis ? 'bold' : 'medium'} numberOfLines={1}>
          {label}
        </Text>
        <View className="flex-row items-center mt-0.5">
          <Text variant="caption" tone="tertiary">
            {detail}
          </Text>
          {badge ? (
            <View
              className="ml-2 px-2 py-0.5"
              style={{ backgroundColor: verdictColors[badge.tone].soft, borderRadius: 999 }}
            >
              <Text variant="caption" weight="semibold" style={{ color: verdictColors[badge.tone].fg }}>
                {badge.label}
              </Text>
            </View>
          ) : null}
        </View>
      </View>
      <Text
        variant={emphasis ? 'section' : 'body'}
        weight={emphasis ? 'bold' : 'semibold'}
        tone={muted || emphasis ? 'primary' : 'danger'}
      >
        {value}
      </Text>
      {chevron ? (
        <View className="ml-1">
          <Icon name="chevron-right" size={18} color={palette.inkTertiary} />
        </View>
      ) : null}
    </View>
  );
}
