import { useEffect, useState } from 'react';
import {
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { palette, radius } from '@/core/theme';
import { Button, Icon, PressableScale, Text } from '@/shared/ui';

export interface ManualEntrySheetProps {
  visible: boolean;
  imageUri?: string | null;
  /** Pre-filled text from on-device OCR; the user reviews and edits it. */
  initialText?: string;
  loading?: boolean;
  onClose: () => void;
  onSubmit: (rawText: string) => void;
}

/**
 * Fallback sheet for the label scanner: it only opens when the on-device read
 * was weak or empty (a confident scan skips straight to results). The user
 * confirms/fixes the text, and we run it through the same matching + scoring
 * engine as a barcode scan.
 */
export function ManualEntrySheet({
  visible,
  imageUri,
  initialText,
  loading,
  onClose,
  onSubmit,
}: ManualEntrySheetProps) {
  const [value, setValue] = useState('');

  // Seed with OCR text (if any) each time the sheet opens; the user edits it.
  useEffect(() => {
    if (visible) setValue(initialText ?? '');
  }, [visible, initialText]);

  const canSubmit = value.trim().length > 2;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View className="flex-1 justify-end" style={{ backgroundColor: 'rgba(17,17,17,0.32)' }}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={8}
        >
          <SafeAreaView
            edges={['bottom']}
            style={{
              backgroundColor: palette.background,
              borderTopLeftRadius: radius.card,
              borderTopRightRadius: radius.card,
            }}
          >
            <View className="px-6 pt-4 pb-6">
              <View className="flex-row items-center justify-between mb-4">
                <Text variant="section" weight="semibold">
                  {initialText ? 'Check the list' : 'Enter ingredients'}
                </Text>
                <PressableScale
                  haptic
                  onPress={onClose}
                  accessibilityRole="button"
                  accessibilityLabel="Close"
                  className="p-1"
                >
                  <Icon name="close" size={22} color={palette.inkSecondary} />
                </PressableScale>
              </View>

              {imageUri ? (
                <Image
                  source={{ uri: imageUri }}
                  resizeMode="cover"
                  style={{ height: 120, borderRadius: radius.button, marginBottom: 16 }}
                />
              ) : null}

              <Text variant="secondary" tone="secondary" className="mb-3">
                {initialText
                  ? 'We couldn’t read this cleanly — check it against the pack and fix anything, then analyse. E-numbers and INS codes are recognised too.'
                  : 'Type or paste the ingredient list exactly as printed. E-numbers and INS codes (e.g. “INS 951”) are recognised too.'}
              </Text>

              <View
                style={{
                  backgroundColor: palette.surface,
                  borderRadius: radius.button,
                  borderWidth: 1,
                  borderColor: palette.hairline,
                }}
              >
                <TextInput
                  value={value}
                  onChangeText={setValue}
                  multiline
                  autoFocus
                  placeholder="Sugar, Refined Wheat Flour, Palm Oil, INS 322, Colour (INS 110)…"
                  placeholderTextColor={palette.inkTertiary}
                  style={{
                    minHeight: 120,
                    maxHeight: 220,
                    padding: 16,
                    fontFamily: 'Inter_400Regular',
                    fontSize: 17,
                    lineHeight: 25,
                    color: palette.ink,
                    textAlignVertical: 'top',
                  }}
                />
              </View>

              <View className="mt-5">
                <Button
                  label="Analyse ingredients"
                  onPress={() => onSubmit(value.trim())}
                  disabled={!canSubmit}
                  loading={loading}
                  icon={<Icon name="sparkle" size={18} color={palette.white} />}
                />
              </View>
            </View>
          </SafeAreaView>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}
