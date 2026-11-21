import { View } from 'react-native';
import { palette, radius, verdictColors } from '@/core/theme';
import { Icon, Text } from '@/shared/ui';
import { Ingredient, abroadBanSummary } from '@/domain/ingredients';

/**
 * The hook. When something in the pack is banned by another country, say so
 * plainly and by name — "Red 3 — banned in the USA". This is the line a shopper
 * screenshots and sends to the family group, and the reason OpenLabel is
 * different from a generic score.
 */
export function AbroadFlags({ ingredients }: { ingredients: Ingredient[] }) {
  const flags = ingredients
    .map((ing) => ({ ing, summary: abroadBanSummary(ing) }))
    .filter((x): x is { ing: Ingredient; summary: string } => x.summary !== null);

  if (flags.length === 0) return null;

  return (
    <View
      style={{
        backgroundColor: verdictColors.danger.soft,
        borderRadius: radius.card,
        padding: 16,
        gap: 10,
      }}
    >
      {flags.map(({ ing, summary }) => (
        <View key={ing.id} className="flex-row items-center">
          <Icon name="alert" size={18} color={verdictColors.danger.fg} />
          <Text variant="body" weight="medium" className="flex-1 ml-2.5">
            <Text variant="body" weight="bold" style={{ color: palette.ink }}>
              {ing.name}
            </Text>
            {'  '}
            <Text variant="body" weight="semibold" style={{ color: verdictColors.danger.fg }}>
              {summary}
            </Text>
          </Text>
        </View>
      ))}
    </View>
  );
}
