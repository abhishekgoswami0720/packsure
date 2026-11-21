/**
 * Crop a captured label photo down to the on-screen framing window before OCR.
 *
 * This is the single biggest lever on label-scan quality. ML Kit reads *all* the
 * text in whatever image it's given — so handing it the whole pack also feeds it
 * the brand, the nutrition table and the MRP. Cropping to the centre band the
 * user framed does two things at once: it drops that surrounding noise, and it
 * lets the recogniser spend its resolution on the ingredients (small printed text
 * reads far more accurately when it fills the frame).
 *
 * The region matches the label-mode guide box in CameraReticle. Best-effort: any
 * failure falls back to the original image so a scan never breaks for want of a
 * crop.
 */
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';

/**
 * Tall centre window, as fractions of the image — kept in sync with the
 * label-mode guide box (a portrait frame). Cropping to this narrow vertical band
 * is what keeps OCR on the ingredients panel instead of the brand, the nutrition
 * table and the MRP printed around it.
 */
const REGION = { x: 0.13, y: 0.15, w: 0.74, h: 0.62 } as const;

export async function cropToFrame(
  uri: string,
  width?: number,
  height?: number,
): Promise<string> {
  if (!width || !height) return uri;
  try {
    const result = await manipulateAsync(
      uri,
      [
        {
          crop: {
            originX: Math.round(width * REGION.x),
            originY: Math.round(height * REGION.y),
            width: Math.round(width * REGION.w),
            height: Math.round(height * REGION.h),
          },
        },
      ],
      { compress: 1, format: SaveFormat.JPEG },
    );
    return result.uri ?? uri;
  } catch {
    return uri;
  }
}
