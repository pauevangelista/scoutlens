// The one place for colors, radii, type and spacing. Values come from docs/design/design-system.md.
// Do not add colors, radii or fonts here that the design does not use.
import { Platform, type TextStyle } from 'react-native';

export const colors = {
  carbon: '#0F1115',
  carbonSurface: '#1A1D24',
  ice: '#F3F4F7',
  white: '#FFFFFF',
  line: '#DADDE5',
  /** Input borders, inactive dots and unselected chips. Used throughout the canvas, missing from the token table. */
  lineStrong: '#C5C9D4',
  soft: '#E7EAF3',
  muted: '#5A6070',
  mutedOnDark: '#A9AFBF',
  cobalt: '#2B50FF',
  photoPlaceholder: '#D5D9E3',
  neutralPill: '#E4E6EC',
  neutralPillText: '#3A3F4B',
  focusOnDark: '#8FA4FF',
} as const;

export const radii = {
  hero: 28,
  card: 24,
  option: 20,
  photo: 18,
  input: 16,
  pill: 999,
} as const;

export const space = {
  gutter: 24,
  /** Height of the primary button. */
  button: 56,
  /** Minimum touch target. */
  touch: 44,
} as const;

type Weight = '400' | '500' | '600' | '800';

/**
 * Hanken Grotesk, with Helvetica Neue / system-ui as the fallback. The font file is not bundled yet,
 * so native platforms use the system font until it is added.
 */
const family = Platform.select({
  web: "'Hanken Grotesk', 'Helvetica Neue', system-ui, sans-serif",
  ios: 'Helvetica Neue',
  default: undefined,
});

function font(size: number, weight: Weight, lineHeight: number, trackingEm = 0): TextStyle {
  return {
    fontFamily: family,
    fontSize: size,
    fontWeight: weight,
    lineHeight: Math.round(size * lineHeight),
    letterSpacing: trackingEm ? size * trackingEm : undefined,
  };
}

export const type = {
  /** Welcome headline. */
  hero: font(44, '800', 1.02, -0.035),
  display: font(38, '800', 1.04, -0.035),
  /** Explainer headlines. */
  explainer: font(36, '800', 1.04, -0.035),
  /** "Reading your photos". */
  moment: font(32, '800', 1.05, -0.035),
  section: font(22, '800', 1.2, -0.025),
  cardTitle: font(20, '800', 1.2, -0.025),
  brand: font(20, '800', 1.2, -0.04),
  brandLarge: font(22, '800', 1.2, -0.04),
  lede: font(17, '400', 1.5),
  body: font(16, '400', 1.5),
  bodyStrong: font(16, '600', 1.5),
  option: font(18, '600', 1.3),
  button: font(17, '600', 1.2),
  label: font(14, '600', 1.3),
  small: font(15, '400', 1.5),
  smallStrong: font(15, '600', 1.5),
  caption: font(14, '400', 1.4),
  fine: font(13, '400', 1.45),
  pill: font(13, '600', 1.2),
  tag: font(12, '600', 1.3),
} as const;
