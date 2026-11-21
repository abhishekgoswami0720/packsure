import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Linking, View } from 'react-native';
import Animated, { FadeInDown, FadeOutDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import {
  BarcodeScanningResult,
  CameraView,
  useCameraPermissions,
} from 'expo-camera';
import { useFocusEffect, useRouter } from 'expo-router';
import { palette } from '@/core/theme';
import { Button, GlassSurface, Icon, Monogram, PressableScale, Text, Wordmark } from '@/shared/ui';
import { ScanInput } from '@/domain/scans';
import { recognizeLabel, isOcrAvailable, readIngredientsFromBlocks, cropToFrame } from '@/data/ocr';
import { useScannerStore } from './store';
import { useAnalyzeScan } from './hooks/useAnalyzeScan';
import { CameraReticle } from './components/CameraReticle';
import { ManualEntrySheet } from './components/ManualEntrySheet';
import { ModeSwitcher } from './components/ModeSwitcher';
import { NotFoundSheet, NotFoundKind } from './components/NotFoundSheet';

const HINTS = {
  barcode: 'Line up the barcode inside the frame',
  label: 'Fit the ingredients list inside the frame',
} as const;

const BARCODE_TYPES = ['ean13', 'ean8', 'upc_a', 'upc_e', 'code128', 'code39'] as const;

export function ScannerScreen() {
  const router = useRouter();
  const mode = useScannerStore((s) => s.mode);
  const setMode = useScannerStore((s) => s.setMode);

  const [permission, requestPermission] = useCameraPermissions();
  const { mutateAsync, isPending } = useAnalyzeScan();

  const [sheetOpen, setSheetOpen] = useState(false);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [prefillText, setPrefillText] = useState('');
  const [ocrBusy, setOcrBusy] = useState(false);
  const [notFound, setNotFound] = useState<{ kind: NotFoundKind; productName?: string | null } | null>(
    null,
  );

  const cameraRef = useRef<CameraView>(null);
  // Guards a single in-flight scan so a held barcode doesn't fire repeatedly.
  const lockRef = useRef(false);
  // The last barcode we already resolved to a "no product" outcome. While that
  // same code stays in frame we ignore it, so the not-found alert shows once
  // instead of flickering on every camera frame until the pack is pulled away.
  const lastHandledCodeRef = useRef<string | null>(null);

  // Re-arm the scanner each time the screen regains focus (after results pop).
  useFocusEffect(
    useCallback(() => {
      lockRef.current = false;
      lastHandledCodeRef.current = null;
    }, []),
  );

  // Switching modes re-arms the scanner and clears the suppressed code, so the
  // same product can be re-scanned after a trip through label mode.
  useEffect(() => {
    lockRef.current = false;
    lastHandledCodeRef.current = null;
  }, [mode]);

  // After a barcode resolves to "no product", keep the camera live (so a
  // *different* pack scans straight away) but remember this code so the same one
  // in frame doesn't keep re-triggering the alert.
  const rearmAfterMiss = useCallback((barcode?: string) => {
    if (barcode) lastHandledCodeRef.current = barcode;
    lockRef.current = false;
  }, []);

  const run = useCallback(
    async (input: ScanInput) => {
      try {
        const outcome = await mutateAsync(input);
        if (outcome.kind === 'analyzed') {
          setSheetOpen(false);
          router.push({ pathname: '/results', params: { scanId: outcome.scanId } });
        } else if (outcome.kind === 'unknown_barcode') {
          rearmAfterMiss(input.barcode);
          setNotFound({ kind: 'unknown_barcode' });
        } else if (outcome.kind === 'offline') {
          rearmAfterMiss(input.barcode);
          setNotFound({ kind: 'offline' });
        } else if (outcome.kind === 'no_ingredients') {
          rearmAfterMiss(input.barcode);
          setNotFound({ kind: 'no_ingredients', productName: outcome.productName });
        } else {
          rearmAfterMiss(input.barcode);
          Alert.alert('Nothing to analyse', 'We couldn’t read any ingredients from that.');
        }
      } catch (err) {
        rearmAfterMiss(input.barcode);
        Alert.alert('Something went wrong', (err as Error).message);
      }
    },
    [mutateAsync, rearmAfterMiss, router, setMode],
  );

  const onBarcodeScanned = useCallback(
    (result: BarcodeScanningResult) => {
      if (lockRef.current || isPending || mode !== 'barcode') return;
      // Ignore the code we just reported as "no product" while it lingers in
      // frame — otherwise the not-found alert flickers on every camera frame.
      if (result.data === lastHandledCodeRef.current) return;
      lockRef.current = true;
      run({ source: 'barcode', barcode: result.data });
    },
    [isPending, mode, run],
  );

  // Label mode: snap the ingredients panel, read it on-device, and — when the
  // read is confident — go straight to results. Only a weak/empty read drops
  // into the review sheet, so a good scan is never gated behind hand-editing.
  const captureLabel = useCallback(async () => {
    const cam = cameraRef.current;
    let uri: string | null = null;
    if (cam) {
      try {
        // Let expo-camera apply orientation/processing — skipProcessing can hand
        // ML Kit a sideways frame on Android (garbled text). High quality gives
        // the recogniser maximum detail on small printed text.
        const photo = await cam.takePictureAsync({ quality: 0.9 });
        uri = photo?.uri ?? null;
        // Crop to the tall framing window so OCR sees only the ingredients panel,
        // not the whole pack — the biggest win for label-scan accuracy.
        if (uri) uri = await cropToFrame(uri, photo?.width, photo?.height);
      } catch {
        uri = null;
      }
    }

    setOcrBusy(true);
    try {
      let text = '';
      let confident = false;
      if (uri && isOcrAvailable()) {
        try {
          const read = readIngredientsFromBlocks(await recognizeLabel(uri));
          text = read.text;
          confident = read.confident;
        } catch {
          text = '';
          confident = false;
        }
      }

      if (confident && text) {
        // Smart path: analyse and route straight to the result.
        await run({ source: 'label', rawText: text });
      } else {
        // Fallback: let the user confirm/fix what we read (or type it in).
        setPhotoUri(uri);
        setPrefillText(text);
        setSheetOpen(true);
      }
    } finally {
      setOcrBusy(false);
    }
  }, [run]);

  // ── Permission states ──────────────────────────────────────────────────
  if (!permission) {
    return (
      <View className="flex-1 items-center justify-center" style={{ backgroundColor: palette.black }}>
        <ActivityIndicator color={palette.white} />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: palette.background }}>
        <View className="flex-1 items-center justify-center px-6">
          <View
            className="items-center justify-center mb-6"
            style={{ width: 72, height: 72, borderRadius: 999, backgroundColor: palette.brandSoft }}
          >
            <Icon name="scan" size={32} color={palette.brandStrong} />
          </View>
          <Text variant="heading" weight="bold" center>
            Scan with confidence
          </Text>
          <Text variant="body" tone="secondary" center className="mt-3 mb-8">
            OpenLabel uses your camera to read barcodes and ingredient labels, then
            tells you whether to buy — in seconds. Nothing leaves your device.
          </Text>
          <View className="w-full gap-3">
            <Button label="Enable camera" onPress={requestPermission} />
            {!permission.canAskAgain ? (
              <Button label="Open settings" variant="secondary" onPress={() => Linking.openSettings()} />
            ) : null}
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // ── Camera surface ─────────────────────────────────────────────────────
  const cameraActive = !sheetOpen && !notFound && !isPending && !ocrBusy;
  const busy = isPending || ocrBusy;
  const busyLabel = ocrBusy ? 'Reading label…' : 'Analysing…';

  return (
    <View className="flex-1" style={{ backgroundColor: palette.black }}>
      <StatusBar style="light" />
      <CameraView
        ref={cameraRef}
        style={{ flex: 1 }}
        active={cameraActive}
        facing="back"
        barcodeScannerSettings={{ barcodeTypes: [...BARCODE_TYPES] }}
        onBarcodeScanned={mode === 'barcode' ? onBarcodeScanned : undefined}
      >
        <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
          {/* Top bar */}
          <View className="flex-row items-center justify-between px-6 pt-2">
            <View
              className="flex-row items-center"
              accessibilityRole="header"
              accessibilityLabel="OpenLabel"
              style={{
                gap: 8,
                // A soft shadow keeps the white lockup legible over a bright
                // camera scene — no opaque container needed behind it.
                shadowColor: '#000',
                shadowOpacity: 0.4,
                shadowRadius: 5,
                shadowOffset: { width: 0, height: 1 },
              }}
            >
              <Monogram height={24} color={palette.white} />
              <Wordmark height={15} color={palette.white} />
            </View>
            <PressableScale
              haptic
              onPress={() => router.push('/history')}
              activeScale={0.94}
              accessibilityRole="button"
              accessibilityLabel="Scan history"
            >
              <GlassSurface
                glassStyle="clear"
                interactive
                className="items-center justify-center"
                style={{ width: 40, height: 40, borderRadius: 999, overflow: 'hidden' }}
              >
                <Icon name="history" size={20} color={palette.white} />
              </GlassSurface>
            </PressableScale>
          </View>

          {/* Reticle */}
          <CameraReticle hint={HINTS[mode]} mode={mode} />

          {/* Bottom controls — extra bottom padding lifts the mode switch clear of
              the Android gesture/nav bar so it isn't jammed against the edge. */}
          <View className="px-6 pb-8 gap-5">
            {mode === 'label' && !busy ? (
              <Animated.View entering={FadeInDown.duration(220)} exiting={FadeOutDown.duration(160)}>
                <Button
                  variant="glass"
                  label="Scan label"
                  onPress={captureLabel}
                  icon={<Icon name="label" size={18} color={palette.white} />}
                />
              </Animated.View>
            ) : null}
            {busy ? (
              <GlassSurface
                glassStyle="regular"
                fallbackBackground="rgba(17,17,17,0.55)"
                className="flex-row items-center justify-center gap-2 self-center px-4 py-3"
                style={{ borderRadius: 999, overflow: 'hidden' }}
              >
                <ActivityIndicator color={palette.white} />
                <Text variant="secondary" weight="medium" tone="inverse">
                  {busyLabel}
                </Text>
              </GlassSurface>
            ) : null}
            <ModeSwitcher value={mode} onChange={setMode} />
          </View>
        </SafeAreaView>
      </CameraView>

      <ManualEntrySheet
        visible={sheetOpen}
        imageUri={photoUri}
        initialText={prefillText}
        loading={isPending}
        onClose={() => setSheetOpen(false)}
        onSubmit={(rawText) => run({ source: 'label', rawText })}
      />

      <NotFoundSheet
        visible={notFound !== null}
        kind={notFound?.kind ?? 'unknown_barcode'}
        productName={notFound?.productName}
        onScanLabel={() => {
          setNotFound(null);
          setMode('label');
        }}
        onClose={() => setNotFound(null)}
      />
    </View>
  );
}
