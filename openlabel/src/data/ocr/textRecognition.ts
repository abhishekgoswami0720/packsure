/**
 * On-device OCR for ingredient labels (Google ML Kit, fully offline).
 *
 * ML Kit is a native module: it runs in a dev/EAS build, NOT in Expo Go. We
 * detect its presence at runtime and, when it's missing (Expo Go, web, or a
 * build that didn't link it), callers fall back to manual entry — the app never
 * crashes for want of OCR.
 *
 * Uses the Latin recogniser: ingredient lists on Indian packaging are printed in
 * English (FSSAI labelling), which Latin covers. Devanagari could be added as a
 * second pass later if Hindi-only labels prove common.
 */
import { NativeModules } from 'react-native';
import TextRecognition, {
  TextRecognitionScript,
  type TextRecognitionResult,
} from '@react-native-ml-kit/text-recognition';

export type { TextRecognitionResult } from '@react-native-ml-kit/text-recognition';

/** True when the native ML Kit module is linked into this build. */
export function isOcrAvailable(): boolean {
  return Boolean(NativeModules.TextRecognition);
}

export class OcrUnavailableError extends Error {
  constructor() {
    super('On-device text recognition is not available in this build.');
    this.name = 'OcrUnavailableError';
  }
}

/**
 * Recognise the text *and layout* of a label image. The block/line frames it
 * returns let the extractor isolate the ingredient list by where it sits on the
 * pack — the reliable way to ignore the nutrition table and text around it.
 *
 * @returns the full recognition result (text + positioned blocks).
 * @throws  {@link OcrUnavailableError} when the native module isn't linked.
 */
export async function recognizeLabel(imageUri: string): Promise<TextRecognitionResult> {
  if (!isOcrAvailable()) throw new OcrUnavailableError();
  return TextRecognition.recognize(imageUri, TextRecognitionScript.LATIN);
}
