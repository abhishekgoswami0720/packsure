import { Linking, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { palette } from '@/core/theme';
import { Button, Icon, PressableScale, Screen, Text } from '@/shared/ui';
import { useScanResult } from './hooks/useScanResult';
import { VerdictCard } from './components/VerdictCard';
import { AbroadFlags } from './components/AbroadFlags';
import { GlanceMetrics } from './components/GlanceMetrics';
import { ScoreBreakdownCard } from './components/ScoreBreakdownCard';
import { OtherIngredientsCard } from './components/OtherIngredientsCard';

export function ResultsScreen({ scanId }: { scanId?: string }) {
  const router = useRouter();
  const { data, isLoading } = useScanResult(scanId);

  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/');
  };

  return (
    <Screen scroll>
      <Header onBack={goBack} />

      {isLoading ? (
        <View className="flex-1 items-center justify-center py-24">
          <Text variant="body" tone="secondary">
            Loading result…
          </Text>
        </View>
      ) : !data ? (
        <View className="flex-1 items-center justify-center py-24 gap-4">
          <Icon name="alert" size={28} color={palette.inkTertiary} />
          <Text variant="body" tone="secondary" center>
            We couldn’t find this scan.
          </Text>
          <Button label="Back to scanner" variant="secondary" fullWidth={false} onPress={goBack} />
        </View>
      ) : (
        <View className="gap-4 pb-4">
          <Animated.View entering={FadeInDown.duration(420)}>
            <VerdictCard scan={data.scan} result={data.result} />
          </Animated.View>
          {data.ingredients.length > 0 ? (
            <Animated.View entering={FadeInDown.duration(420).delay(60)}>
              <AbroadFlags ingredients={data.ingredients} />
            </Animated.View>
          ) : null}
          {data.result.nutrition.length > 0 ? (
            <Animated.View entering={FadeInDown.duration(420).delay(120)}>
              <GlanceMetrics metrics={data.result.nutrition} />
            </Animated.View>
          ) : null}
          <Animated.View entering={FadeInDown.duration(420).delay(180)}>
            <ScoreBreakdownCard
              result={data.result}
              onSelectIngredient={(id) => router.push(`/ingredient/${id}`)}
            />
          </Animated.View>
          <Animated.View entering={FadeInDown.duration(420).delay(240)}>
            <OtherIngredientsCard items={data.scan.unresolved} />
          </Animated.View>
          <Animated.View entering={FadeInDown.duration(420).delay(300)} className="mt-2">
            <Button
              label="Scan another"
              onPress={goBack}
              icon={<Icon name="scan" size={18} color={palette.white} />}
            />
          </Animated.View>
          <ResultFooter fromOpenFoodFacts={data.fromOpenFoodFacts} />
        </View>
      )}
    </Screen>
  );
}

function ResultFooter({ fromOpenFoodFacts }: { fromOpenFoodFacts: boolean }) {
  return (
    <View className="mt-4 gap-2 px-1">
      {fromOpenFoodFacts ? (
        <Text variant="caption" tone="tertiary" className="leading-5">
          Product data from{' '}
          <Text
            variant="caption"
            tone="tertiary"
            style={{ textDecorationLine: 'underline' }}
            onPress={() => Linking.openURL('https://openfoodfacts.org').catch(() => undefined)}
          >
            Open Food Facts
          </Text>
          , licensed under ODbL.
        </Text>
      ) : null}
      <Text variant="caption" tone="tertiary" className="leading-5">
        OpenLabel gives general information about food additives — not medical or dietary
        advice. Always read the pack, and consult a professional for personal health needs.
      </Text>
    </View>
  );
}

function Header({ onBack }: { onBack: () => void }) {
  return (
    <View className="flex-row items-center justify-between py-2 mb-2">
      <PressableScale
        haptic
        onPress={onBack}
        accessibilityRole="button"
        accessibilityLabel="Go back"
        className="items-center justify-center"
        style={{ width: 40, height: 40, borderRadius: 999, backgroundColor: palette.surface }}
      >
        <Icon name="arrow-left" size={20} color={palette.ink} />
      </PressableScale>
      <Text variant="body" weight="semibold">
        Result
      </Text>
      <View style={{ width: 40 }} />
    </View>
  );
}
