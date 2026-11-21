import { Link, Stack } from 'expo-router';
import { View } from 'react-native';
import { Screen, Text } from '@/shared/ui';

export default function NotFound() {
  return (
    <>
      <Stack.Screen options={{ title: 'Not found' }} />
      <Screen>
        <View className="flex-1 items-center justify-center gap-3">
          <Text variant="heading" weight="bold">
            Page not found
          </Text>
          <Link href="/">
            <Text variant="body" tone="success" weight="semibold">
              Go to the scanner
            </Text>
          </Link>
        </View>
      </Screen>
    </>
  );
}
