import { useMemo } from 'react';
import { Alert, SectionList, View } from 'react-native';
import { useRouter } from 'expo-router';
import { palette } from '@/core/theme';
import { Icon, PressableScale, Screen, Text } from '@/shared/ui';
import { ScanRecord } from '@/domain/scans';
import { dayLabel } from '@/shared/utils/format';
import { useClearHistory, useHistory } from './hooks/useHistory';
import { HistoryRow } from './components/HistoryRow';

interface Section {
  title: string;
  data: ScanRecord[];
}

function groupByDay(scans: ScanRecord[]): Section[] {
  const sections: Section[] = [];
  let current: Section | null = null;
  for (const scan of scans) {
    const title = dayLabel(scan.createdAt);
    if (!current || current.title !== title) {
      current = { title, data: [] };
      sections.push(current);
    }
    current.data.push(scan);
  }
  return sections;
}

export function HistoryScreen() {
  const router = useRouter();
  const { data: scans = [], isLoading } = useHistory();
  const clear = useClearHistory();

  const sections = useMemo(() => groupByDay(scans), [scans]);
  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/'));

  const confirmClear = () =>
    Alert.alert('Clear history?', 'This permanently removes all your past scans.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Clear', style: 'destructive', onPress: () => clear.mutate() },
    ]);

  return (
    <Screen>
      <View className="flex-row items-center justify-between py-2 mb-2">
        <PressableScale
          haptic
          onPress={goBack}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          className="items-center justify-center"
          style={{ width: 40, height: 40, borderRadius: 999, backgroundColor: palette.surface }}
        >
          <Icon name="arrow-left" size={20} color={palette.ink} />
        </PressableScale>
        <Text variant="body" weight="semibold">
          History
        </Text>
        {scans.length > 0 ? (
          <PressableScale
            haptic
            onPress={confirmClear}
            accessibilityRole="button"
            accessibilityLabel="Clear scan history"
            className="px-2 py-2"
          >
            <Text variant="secondary" weight="semibold" tone="danger">
              Clear
            </Text>
          </PressableScale>
        ) : (
          <View style={{ width: 40 }} />
        )}
      </View>

      {isLoading ? null : scans.length === 0 ? (
        <Empty />
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 32 }}
          stickySectionHeadersEnabled={false}
          renderSectionHeader={({ section }) => (
            <Text variant="caption" weight="semibold" tone="tertiary" className="mt-5 mb-1 uppercase">
              {section.title}
            </Text>
          )}
          renderItem={({ item }) => (
            <HistoryRow
              scan={item}
              onPress={() => router.push({ pathname: '/results', params: { scanId: item.id } })}
            />
          )}
        />
      )}
    </Screen>
  );
}

function Empty() {
  return (
    <View className="flex-1 items-center justify-center pb-16">
      <View
        className="items-center justify-center mb-5"
        style={{ width: 64, height: 64, borderRadius: 999, backgroundColor: palette.surface }}
      >
        <Icon name="history" size={28} color={palette.inkTertiary} />
      </View>
      <Text variant="section" weight="semibold">
        No scans yet
      </Text>
      <Text variant="body" tone="secondary" center className="mt-2 px-8">
        Scan a product and your history will appear here, ready offline.
      </Text>
    </View>
  );
}
