import { View } from 'react-native';
import { palette } from '@/core/theme';
import { Card, Text } from '@/shared/ui';

/**
 * The remaining label phrases that aren't in our additive knowledge base —
 * usually base foods (sugar, flour, water) or additives we don't track yet.
 * Shown plainly so the user knows exactly what we did and didn't assess.
 */
export function OtherIngredientsCard({ items }: { items: string[] }) {
  if (items.length === 0) return null;

  return (
    <Card padded>
      <Text variant="section" weight="semibold">
        Also on the label
      </Text>
      <Text variant="secondary" tone="secondary" className="mt-1 mb-4">
        Recognised, but not flagged as additives of concern.
      </Text>
      <View className="flex-row flex-wrap gap-2">
        {items.map((item, i) => (
          <View
            key={`${item}-${i}`}
            className="px-3 py-1.5"
            style={{ backgroundColor: '#F0EFEA', borderRadius: 999 }}
          >
            <Text variant="secondary" weight="medium" style={{ color: palette.inkSecondary }}>
              {item}
            </Text>
          </View>
        ))}
      </View>
    </Card>
  );
}
