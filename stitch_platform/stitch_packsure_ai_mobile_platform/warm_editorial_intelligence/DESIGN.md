---
name: Warm Editorial Intelligence
colors:
  surface: '#fef9f0'
  surface-dim: '#ded9d1'
  surface-bright: '#fef9f0'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f8f3ea'
  surface-container: '#f2ede4'
  surface-container-high: '#ece8df'
  surface-container-highest: '#e7e2d9'
  on-surface: '#1d1c16'
  on-surface-variant: '#54433b'
  inverse-surface: '#32302b'
  inverse-on-surface: '#f5f0e7'
  outline: '#87736a'
  outline-variant: '#d9c2b7'
  surface-tint: '#924b20'
  primary: '#924b20'
  on-primary: '#ffffff'
  primary-container: '#f49a68'
  on-primary-container: '#6f3106'
  inverse-primary: '#ffb68f'
  secondary: '#5f5e5b'
  on-secondary: '#ffffff'
  secondary-container: '#e2dfda'
  on-secondary-container: '#63635f'
  tertiary: '#6b5b51'
  on-tertiary: '#ffffff'
  tertiary-container: '#c0aca0'
  on-tertiary-container: '#4e4037'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#ffdbca'
  primary-fixed-dim: '#ffb68f'
  on-primary-fixed: '#331100'
  on-primary-fixed-variant: '#743409'
  secondary-fixed: '#e5e2dd'
  secondary-fixed-dim: '#c8c6c1'
  on-secondary-fixed: '#1c1c19'
  on-secondary-fixed-variant: '#474743'
  tertiary-fixed: '#f4ded1'
  tertiary-fixed-dim: '#d7c3b6'
  on-tertiary-fixed: '#241912'
  on-tertiary-fixed-variant: '#52443b'
  background: '#fef9f0'
  on-background: '#1d1c16'
  surface-variant: '#e7e2d9'
typography:
  headline-xl:
    fontFamily: Inter
    fontSize: 40px
    fontWeight: '700'
    lineHeight: 48px
    letterSpacing: -0.03em
  headline-xl-mobile:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.025em
  headline-lg:
    fontFamily: Inter
    fontSize: 28px
    fontWeight: '700'
    lineHeight: 36px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Inter
    fontSize: 22px
    fontWeight: '600'
    lineHeight: 28px
    letterSpacing: -0.015em
  headline-sm:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 24px
    letterSpacing: -0.01em
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
    letterSpacing: -0.005em
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
    letterSpacing: 0em
  body-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 16px
    letterSpacing: 0.01em
  label-lg:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 18px
    letterSpacing: 0.01em
  label-md:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.02em
  label-sm:
    fontFamily: Inter
    fontSize: 10px
    fontWeight: '700'
    lineHeight: 12px
    letterSpacing: 0.04em
  metric-display:
    fontFamily: Inter
    fontSize: 30px
    fontWeight: '700'
    lineHeight: 36px
    letterSpacing: -0.02em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1rem
  margin: 1.25rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.25rem
  space-xl: 1.75rem
---

## Brand & Style

This design system blends warm editorial aesthetics with precise algorithmic intelligence. Targeted at design-conscious individuals, modern wellness consumers, and packaging compliance specialists, the visual language departs from cold, sterile clinical utilities. It evokes calm clarity, thoughtful guidance, and tactile nourishment.

The visual style merges **Warm Minimalism** with **Tactile Editorial Layouts**:
- Soft, comforting cream canvases paired with pristine ivory surface tiers.
- High-contrast, grounding deep charcoal typography for maximum legibility.
- Optimistic, sun-drenched peach accents acting as directional wayfinding and positive progression markers.
- Distinctive structural visual motifs: segmented radial arches, soft rectangular cards, and pill badges that balance editorial craft with high-density data legibility.

## Colors

The palette balances warm organic undertones with authoritative neutrals and semantic precision.

### Functional Palette
- **Canvas Base (`#F6F1E8`):** Atmospheric warm cream canvas underpinning all full-screen views.
- **Surface Level 1 (`#FFFDFC`):** Main card and modal background; clean ivory for elevated contrast.
- **Surface Level 2 (`#EFE9DE`):** Secondary container surface; recessed inputs, quick-action tiles, and muted meter tracks.
- **Primary Text (`#252522`):** Deep charcoal ink, providing strong editorial contrast without the stark harshness of pure black.
- **Secondary Text (`#77736C`):** Muted warm slate for metadata, timestamps, secondary nutrition facts, and inactive labels.
- **Subtle Border (`#E9E3D9`):** Soft warm hairline strokes used selectively when edge separation is required on low-contrast screens.

### Brand & Interactive
- **Primary Accent (`#F49A68`):** Vibrant Peach Orange for primary progress rings, active indicators, and high-priority action affordances.
- **Subtle Accent (`#FBE5D8`):** Soft Light Peach for active pill backgrounds, category counters, and selection halos.
- **Chrome Neutral (`#252522`):** Dark charcoal anchor for floating bottom navigation bars and full-bleed hero CTA buttons.

### Semantic Status
- **Verified (`#31865C`):** Calibrated forest green for passed checks, high nutrition grades, and completed milestones.
- **Review / Caution (`#C28B3F`):** Warm golden amber for warnings, pending ingredient reviews, and moderate thresholds.
- **Violation / Error (`#BE343B`):** Deep warm crimson for allergens, nutritional spikes, and critical non-compliance tags.

## Typography

The typographic hierarchy relies on a modern editorial sans-serif tuned for screen legibility. Headline numerals and calorie metrics are set in heavy weights (`700`), anchoring cards and dashboards with unmistakable focal points.

- **Numerics & Tabular Figures:** Enable `tnum` font features for macros, calories, and compliance percentages to ensure stable vertical alignment in lists and multi-column comparison grids.
- **Editorial Contrast:** Headings feature tight letter spacing (`-0.01em` to `-0.03em`) to project modern editorial polish, while small metadata, micro labels, and badges use expanded tracking (`+0.02em` to `+0.04em`) to ensure instant legibility against warm tints.

## Layout & Spacing

The layout embraces an airy, breathable 4-column mobile grid built on an 8pt spatial baseline. 

- **Outer Canvas Margins:** 20px (`1.25rem`) horizontal margins on standard mobile screens preserve an elegant framing against physical device bezels.
- **Component Padding:** Large surface cards utilize internal padding of 20px (`1.25rem`) down to 16px (`1rem`), ensuring content does not feel constricted.
- **Vertical Rhythm:** Group related metadata with tight 4px–8px increments (`space-xs` to `space-sm`), while separating major dashboard modules with 24px–28px increments (`space-xl`).
- **Responsive Adaptability:** On larger viewports (tablets or wide handhelds), card grids automatically expand from a single-column stack into a balanced 2-column masonry or symmetrical grid, maintaining maximum card widths of 420px.

## Elevation & Depth

Visual depth is achieved through layered tonal surfaces and ultra-soft, warm-tinted shadows, avoiding heavy, dark drop-shadows.

- **Level 0 (Canvas):** Flat base `#F6F1E8`.
- **Level 1 (Card Surfaces):** Pure ivory surfaces (`#FFFDFC`) elevated with a subtle perimeter stroke (`1px solid #E9E3D9`) combined with an ambient shadow: `0 4px 18px -2px rgba(119, 115, 108, 0.08)`.
- **Level 2 (Floating Floating Elements & Modals):** Top header icon buttons and contextual floating pins use `0 8px 24px -4px rgba(37, 37, 34, 0.10)`.
- **Level 3 (Dark Navigation Bar):** Fixed dark charcoal pill container (`#252522`) hovering over the canvas with `0 12px 32px -4px rgba(37, 37, 34, 0.22)`.

## Shapes

The design system embraces generous, friendly geometry characterized by smooth squircle cards and playful organic pills.

- **Primary Cards & Panels:** Styled with 20px–24px radii (`rounded-xl`), creating comfortable, inviting modules for meals, scans, and analytical breakdowns.
- **Interactive Buttons & Category Badges:** Fully pill-shaped (`9999px`) to invite natural fingertip interaction.
- **Top Bar Utility Controls:** Rounded squircles (16px radius) holding calendar, search, or notification icons.
- **Radial Segment Arches:** Segmented arc gauges formed with curved pill caps representing calorie progress and compliance scores.

## Components

### Buttons & Action Bars
- **Primary Hero Button:** Deep charcoal (`#252522`) background with off-white text (`#FFFDFC`), 56px height, rounded to 28px (pill). High-emphasis, elegant tap response.
- **Secondary Action Button:** Neutral warm fill (`#EFE9DE`) with deep charcoal text and subtle warm border.
- **Inline Action / Add Button:** Full-width rounded squircle bar (`#EFE9DE`) with a centered subtle plus icon, designed as a frictionless logging affordance.

### Floating Bottom Navigation Bar
- **Bar Container:** Deep charcoal (`#252522`) floating pill with symmetrical horizontal and vertical padding.
- **Active Navigation Item:** Rounded peach pill (`#F49A68`) housing the active screen icon in deep charcoal, subtly extruded above adjacent items.
- **Inactive Items:** Neutral icon styling using muted warm slate (`#77736C`) with active hover/tap state transitions.

### Cards & Meal Tiles
- **Structure:** Clean ivory (`#FFFDFC`) background, 20px border radius, subtle `#E9E3D9` border.
- **Content Hierarchy:** Left-aligned circular food or product photography (48px–56px) with an accompanying title and timestamp. Right-aligned bold calorie/status metric with sub-label percentage goal in brand peach (`#F49A68`).
- **Footer Macro Row:** Compact three-column distribution for nutritional breakdowns (Protein, Carbs, Fat) rendered in muted gray labels with deep charcoal bold values.

### Chips & Category Selectors
- **Vertical Category Tiles:** Squircle cards containing 3D rendered assets or photography, accompanied by clean label typography underneath.
- **Count & Notification Chips:** High-visibility peach orange badge pills (`#F49A68`) with crisp white tabular numerals.

### Segmented Radial Arch (Hero Progress)
- **Geometry:** Semi-circular arch comprised of rounded pill blocks.
- **States:** Completed steps filled with solid Peach Orange (`#F49A68`); remaining steps rendered in soft neutral warm (`#EFE9DE`).
- **Center Readout:** Stacked center lockup displaying current date, large tabular metric (`30px` bold), and subtle secondary goal copy.

### Image Annotation Overlays
- **Floating Measurement Pins:** Rounded ivory pill badges (`#FFFDFC`) connected to detected food/package items via hairline anchor lines with soft peach connection dots. Displays calories, net weight, or detection confidence with crisp clarity.