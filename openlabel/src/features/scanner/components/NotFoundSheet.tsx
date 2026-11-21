import { Modal, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { palette, radius } from '@/core/theme';
import { Button, Icon, PressableScale, Text } from '@/shared/ui';

/** Why a barcode scan didn't produce a result — each maps to tailored copy. */
export type NotFoundKind = 'unknown_barcode' | 'offline' | 'no_ingredients';

export interface NotFoundSheetProps {
  visible: boolean;
  kind: NotFoundKind;
  productName?: string | null;
  /** Switch to label mode and close. */
  onScanLabel: () => void;
  onClose: () => void;
}

function copyFor(kind: NotFoundKind, productName?: string | null) {
  switch (kind) {
    case 'offline':
      return {
        title: 'You’re offline',
        body: 'We need a connection to look up a product we haven’t seen before. You can still check it right now — just scan the ingredients label on the back.',
      };
    case 'no_ingredients':
      return {
        title: productName ?? 'Found it',
        body: 'We found this product but not its ingredients yet. Scan the ingredients label on the back and we’ll analyse it.',
      };
    case 'unknown_barcode':
    default:
      return {
        title: 'Not in our catalogue yet',
        body: 'We don’t have this product’s details — but you can still check it. Scan the ingredients label on the back and we’ll tell you what’s in it.',
      };
  }
}

/**
 * Shown when a barcode can't be resolved. It's deliberately not a dead-end: the
 * primary action flows straight into scanning the ingredients label, which works
 * for any product whether or not it's in a database.
 */
export function NotFoundSheet({ visible, kind, productName, onScanLabel, onClose }: NotFoundSheetProps) {
  const { title, body } = copyFor(kind, productName);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View className="flex-1 justify-end" style={{ backgroundColor: 'rgba(17,17,17,0.32)' }}>
        <SafeAreaView
          edges={['bottom']}
          style={{
            backgroundColor: palette.background,
            borderTopLeftRadius: radius.card,
            borderTopRightRadius: radius.card,
          }}
        >
          <View className="px-6 pt-5 pb-6">
            <View className="flex-row items-start justify-between mb-4">
              <View
                className="items-center justify-center"
                style={{ width: 44, height: 44, borderRadius: 999, backgroundColor: palette.brandSoft }}
              >
                <Icon name="barcode" size={22} color={palette.brandStrong} />
              </View>
              <PressableScale
                haptic
                onPress={onClose}
                accessibilityRole="button"
                accessibilityLabel="Dismiss"
                className="p-1"
              >
                <Icon name="close" size={22} color={palette.inkSecondary} />
              </PressableScale>
            </View>

            <Text variant="section" weight="semibold">
              {title}
            </Text>
            <Text variant="body" tone="secondary" className="mt-2 mb-6">
              {body}
            </Text>

            <Button
              label="Scan the label instead"
              onPress={onScanLabel}
              icon={<Icon name="label" size={18} color={palette.white} />}
            />
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
}
