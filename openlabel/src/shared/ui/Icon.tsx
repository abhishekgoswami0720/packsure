import {
  ArrowLeft,
  BookOpen,
  Check,
  ChevronRight,
  FlaskConical,
  Globe,
  History,
  type LucideIcon,
  Minus,
  ScanBarcode,
  ScanLine,
  ScanText,
  Search,
  ShieldCheck,
  Sparkles,
  Tag,
  TriangleAlert,
  X,
} from 'lucide-react-native';
import { palette } from '@/core/theme';

/** Named glyphs, mapped once to Lucide so call sites stay `<Icon name="…" />`. */
const ICONS = {
  barcode: ScanBarcode,
  label: ScanText,
  scan: ScanLine,
  history: History,
  search: Search,
  close: X,
  'chevron-right': ChevronRight,
  'arrow-left': ArrowLeft,
  check: Check,
  minus: Minus,
  alert: TriangleAlert,
  shield: ShieldCheck,
  flask: FlaskConical,
  globe: Globe,
  sparkle: Sparkles,
  book: BookOpen,
  tag: Tag,
} satisfies Record<string, LucideIcon>;

export type IconName = keyof typeof ICONS;

export interface IconProps {
  name: IconName;
  size?: number;
  color?: string;
  strokeWidth?: number;
}

/** One consistent Lucide line set — 24px grid, rounded joins. */
export function Icon({ name, size = 22, color = palette.ink, strokeWidth = 2 }: IconProps) {
  const Glyph = ICONS[name];
  return <Glyph size={size} color={color} strokeWidth={strokeWidth} />;
}
