// Shared building blocks for the sleek design. Every color, radius and type style comes from ./theme.
import type { ReactNode, RefObject } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type DimensionValue,
  type StyleProp,
  type TextInputProps,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, radii, space, type, weight } from './theme';

export type Tone = 'light' | 'dark';

/**
 * A full phone screen: content scrolls, `footer` sits at the bottom (pushed down when content is short).
 * Dark tone is for the welcome screen and the "reading your photos" moment only.
 */
export function Screen({
  tone = 'light',
  children,
  footer,
  scrollRef,
  onContentLayout,
}: {
  tone?: Tone;
  children: ReactNode;
  footer?: ReactNode;
  scrollRef?: RefObject<ScrollView | null>;
  /** Reports where the content starts inside the scroll view, so a page can scroll to a section. */
  onContentLayout?: (y: number) => void;
}) {
  const dark = tone === 'dark';
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: dark ? colors.carbon : colors.ice }}>
      <ScrollView ref={scrollRef} contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={[styles.wrap, dark && styles.wrapDark]} {...webData({ tone })}>
          <View onLayout={onContentLayout ? (e) => onContentLayout(e.nativeEvent.layout.y) : undefined}>{children}</View>
          <View style={{ flex: 1 }} />
          {footer ? <View style={styles.footer}>{footer}</View> : null}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

/** react-native-web turns `dataSet` into data-* attributes; the focus ring uses data-tone. */
function webData(data: Record<string, string>): object {
  return { dataSet: data };
}

export function Brand({ tone = 'light', large }: { tone?: Tone; large?: boolean }) {
  return (
    <Text accessibilityLabel="ScoutLens" style={[large ? type.brandLarge : type.brand, { color: tone === 'dark' ? colors.white : colors.carbon }]}>
      scoutlens
    </Text>
  );
}

/** Brand on the left, an optional text action on the right (Skip, Edit my photos). */
export function BrandBar({ action }: { action?: ReactNode }) {
  return (
    <View style={styles.brandBar}>
      <Brand />
      {action}
    </View>
  );
}

export function H1({ children, style }: { children: ReactNode; style?: StyleProp<TextStyle> }) {
  return (
    <Text role="heading" aria-level={1} style={[type.display, { color: colors.carbon }, style]}>
      {children}
    </Text>
  );
}

export function H2({ children, style }: { children: ReactNode; style?: StyleProp<TextStyle> }) {
  return (
    <Text role="heading" aria-level={2} style={[type.section, { color: colors.carbon }, style]}>
      {children}
    </Text>
  );
}

export function Lede({ children, tone = 'light', style }: { children: ReactNode; tone?: Tone; style?: StyleProp<TextStyle> }) {
  return <Text style={[type.lede, { color: tone === 'dark' ? colors.mutedOnDark : colors.muted, marginTop: 12 }, style]}>{children}</Text>;
}

export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

/** Soft panel with a bold lead-in, e.g. "Try this." followed by one specific action. */
export function TipPanel({ lead = 'Try this.', children, after, style }: {
  lead?: string;
  children: ReactNode;
  /** Shown inside the panel under the text, e.g. a guide link. */
  after?: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[styles.tip, style]}>
      <Text style={[type.small, { color: colors.carbon }]}>
        <Text style={type.smallStrong}>{lead}</Text> {children}
      </Text>
      {after}
    </View>
  );
}

type ButtonVariant = 'primary' | 'accent' | 'light' | 'outline';

const BUTTON_COLORS: Record<ButtonVariant, { bg: string; fg: string; border: string }> = {
  primary: { bg: colors.carbon, fg: colors.white, border: colors.carbon },
  accent: { bg: colors.cobalt, fg: colors.white, border: colors.cobalt },
  light: { bg: colors.white, fg: colors.carbon, border: colors.white },
  outline: { bg: colors.white, fg: colors.carbon, border: colors.carbon },
};

export function Button({
  label,
  onPress,
  disabled,
  variant = 'primary',
  small,
  accessibilityLabel,
  style,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  variant?: ButtonVariant;
  /** The compact pill used inside cards. */
  small?: boolean;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
}) {
  const c = BUTTON_COLORS[variant];
  return (
    <Pressable
      role="button"
      accessibilityLabel={accessibilityLabel}
      aria-disabled={disabled}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        small ? styles.buttonSmall : styles.button,
        { backgroundColor: c.bg, borderColor: c.border, opacity: disabled ? 0.4 : pressed ? 0.85 : 1 },
        style,
      ]}>
      <Text style={[small ? type.smallStrong : type.button, { color: c.fg }]}>{label}</Text>
    </Pressable>
  );
}

/** A text-only action: Skip, Edit my photos, guide links. */
export function TextButton({
  label,
  onPress,
  tone = 'muted',
  accessibilityLabel,
}: {
  label: string;
  onPress: () => void;
  tone?: 'muted' | 'accent';
  accessibilityLabel?: string;
}) {
  const accent = tone === 'accent';
  return (
    <Pressable
      role={accent ? 'link' : 'button'}
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      hitSlop={8}
      style={({ pressed }) => [styles.textButton, { opacity: pressed ? 0.7 : 1 }]}>
      <Text
        style={[
          accent ? type.smallStrong : { ...type.small, ...weight('500') },
          { color: accent ? colors.cobalt : colors.muted },
          accent && styles.underline,
        ]}>
        {label}
      </Text>
    </Pressable>
  );
}

export function BackButton({ onPress, label = 'Back' }: { onPress: () => void; label?: string }) {
  return (
    <Pressable role="button" accessibilityLabel={label} onPress={onPress} style={({ pressed }) => [styles.back, { opacity: pressed ? 0.7 : 1 }]}>
      <View style={styles.chevron} />
    </Pressable>
  );
}

/** Back button, progress track and "n of total" for the one-per-screen steps. */
export function StepBar({ step, total = 5, onBack }: { step: number; total?: number; onBack: () => void }) {
  const pct = `${(step / total) * 100}%` as DimensionValue;
  return (
    <View style={styles.stepBar}>
      <BackButton onPress={onBack} />
      <View
        role="progressbar"
        accessibilityLabel={`Step ${step} of ${total}`}
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={step}
        style={styles.track}>
        <View style={[styles.trackFill, { width: pct }]} />
      </View>
      <Text style={[type.fine, { color: colors.muted, ...weight('500') }]}>{`${step} of ${total}`}</Text>
    </View>
  );
}

/** Explainer dots. The active one is a wider cobalt pill. Screen readers hear "Page n of count". */
export function Dots({ count, active }: { count: number; active: number }) {
  return (
    <View style={styles.dots} accessible accessibilityLabel={`Page ${active + 1} of ${count}`}>
      {Array.from({ length: count }, (_, i) => (
        <View key={i} style={[styles.dot, i === active ? styles.dotActive : null]} />
      ))}
    </View>
  );
}

/** One choice in a one-per-screen question. Selected: 2 px cobalt border and a filled cobalt check. */
export function OptionRow({
  title,
  subtitle,
  selected,
  onPress,
}: {
  title: string;
  subtitle?: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      role="radio"
      aria-checked={selected}
      accessibilityState={{ checked: selected }}
      accessibilityLabel={subtitle ? `${title}. ${subtitle}` : title}
      onPress={onPress}
      style={({ pressed }) => [
        styles.option,
        selected ? styles.optionSelected : null,
        { opacity: pressed ? 0.85 : 1 },
      ]}>
      <View style={{ flex: 1 }}>
        <Text style={[type.option, { color: colors.carbon }]}>{title}</Text>
        {subtitle ? <Text style={[type.caption, { color: colors.muted, marginTop: 2 }]}>{subtitle}</Text> : null}
      </View>
      {selected ? (
        <View style={styles.optionCheck}>
          <CheckIcon color={colors.white} size={12} />
        </View>
      ) : (
        <View style={styles.optionEmpty} />
      )}
    </Pressable>
  );
}

export function OptionGroup({ label, children }: { label: string; children: ReactNode }) {
  return (
    <View role="radiogroup" accessibilityLabel={label} style={{ gap: 10, marginTop: 28 }}>
      {children}
    </View>
  );
}

export function Field({
  label,
  value,
  onChangeText,
  placeholder,
  inputMode,
  autoComplete,
  style,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  inputMode?: TextInputProps['inputMode'];
  autoComplete?: TextInputProps['autoComplete'];
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={style}>
      <Text style={[type.label, { color: colors.carbon, marginBottom: 6 }]}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.muted}
        inputMode={inputMode}
        autoComplete={autoComplete}
        style={[type.lede, styles.input]}
      />
    </View>
  );
}

export function Checkbox({
  checked,
  onChange,
  label,
  strong,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  strong?: boolean;
}) {
  return (
    <Pressable
      role="checkbox"
      aria-checked={checked}
      accessibilityState={{ checked }}
      accessibilityLabel={label}
      onPress={() => onChange(!checked)}
      style={styles.check}>
      <View style={[styles.box, checked ? styles.boxOn : null]}>{checked && <CheckIcon color={colors.white} size={12} />}</View>
      <Text style={[strong ? { ...type.lede, ...weight('600') } : type.body, { color: colors.carbon, flex: 1 }]}>{label}</Text>
    </Pressable>
  );
}

/** A selectable pill, e.g. an agency's own division labels. */
export function Chip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <Pressable
      role="radio"
      aria-checked={selected}
      accessibilityState={{ checked: selected }}
      onPress={onPress}
      style={({ pressed }) => [styles.chip, selected ? styles.chipOn : null, { opacity: pressed ? 0.85 : 1 }]}>
      <Text style={[type.smallStrong, { color: selected ? colors.white : colors.carbon }]}>{label}</Text>
    </Pressable>
  );
}

/** Small info tag. `dashed` marks something unconfirmed. */
export function Tag({ label, dashed }: { label: string; dashed?: boolean }) {
  return (
    <View style={[styles.tag, dashed ? styles.tagDashed : null]}>
      <Text style={[type.tag, { color: dashed ? colors.cobalt : colors.carbon }]}>{label}</Text>
    </View>
  );
}

// Status pills: always a word and an icon, never color alone.

export type PillKind = 'good' | 'improve' | 'missing' | 'neutral';

export function StatusPill({ kind, label }: { kind: PillKind; label: string }) {
  const look = PILL_LOOK[kind];
  return (
    <View style={[styles.pill, look.box]}>
      {kind === 'good' && <CheckIcon color={look.fg} size={11} />}
      {kind === 'improve' && <AlertIcon color={look.fg} />}
      {kind === 'missing' && <View style={[styles.ring, { borderColor: look.fg, borderStyle: 'dashed' }]} />}
      {kind === 'neutral' && <View style={{ width: 11, height: 2.2, borderRadius: 1, backgroundColor: look.fg }} />}
      <Text style={[type.pill, { color: look.fg }]}>{label}</Text>
    </View>
  );
}

const PILL_LOOK: Record<PillKind, { fg: string; box: ViewStyle }> = {
  good: { fg: colors.white, box: { backgroundColor: colors.carbon } },
  improve: { fg: colors.white, box: { backgroundColor: colors.cobalt } },
  missing: { fg: colors.cobalt, box: { backgroundColor: colors.white, borderWidth: 1.5, borderStyle: 'dashed', borderColor: colors.cobalt } },
  neutral: { fg: colors.neutralPillText, box: { backgroundColor: colors.neutralPill } },
};

// Icons, drawn with views so no SVG library is needed.

export function CheckIcon({ color, size = 12 }: { color: string; size?: number }) {
  return (
    <View aria-hidden style={{ width: size + 2, height: size + 2, alignItems: 'center', justifyContent: 'center' }}>
      <View
        style={{
          width: size,
          height: size * 0.55,
          borderLeftWidth: 2.4,
          borderBottomWidth: 2.4,
          borderColor: color,
          transform: [{ translateY: -size * 0.12 }, { rotate: '-45deg' }],
        }}
      />
    </View>
  );
}

function AlertIcon({ color }: { color: string }) {
  return (
    <View aria-hidden style={[styles.ring, { borderColor: color, alignItems: 'center', justifyContent: 'center', gap: 1.5 }]}>
      <View style={{ width: 2, height: 4.5, borderRadius: 1, backgroundColor: color }} />
      <View style={{ width: 2, height: 2, borderRadius: 1, backgroundColor: color }} />
    </View>
  );
}

export function PlusIcon({ color = colors.cobalt }: { color?: string }) {
  return (
    <View aria-hidden style={{ width: 20, height: 20, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ position: 'absolute', width: 16, height: 2, borderRadius: 1, backgroundColor: color }} />
      <View style={{ position: 'absolute', width: 2, height: 16, borderRadius: 1, backgroundColor: color }} />
    </View>
  );
}

// Photo frames: the crop marks are the one decorative device.

export function CropMarks({ color, inset = 8, length = 12, thickness = 1.5, opacity = 1 }: {
  color: string;
  inset?: number;
  length?: number;
  thickness?: number;
  opacity?: number;
}) {
  const corners: ViewStyle[] = [{ top: 0, left: 0 }, { top: 0, right: 0 }, { bottom: 0, left: 0 }, { bottom: 0, right: 0 }];
  return (
    <View pointerEvents="none" aria-hidden style={{ position: 'absolute', top: inset, left: inset, right: inset, bottom: inset, opacity }}>
      {corners.map((pos, i) => (
        <View key={i} style={{ position: 'absolute', width: length, height: length, ...pos }}>
          <View style={{ position: 'absolute', ...pos, width: length, height: thickness, backgroundColor: color }} />
          <View style={{ position: 'absolute', ...pos, width: thickness, height: length, backgroundColor: color }} />
        </View>
      ))}
    </View>
  );
}

/** Head-and-shoulders outline that stands in for a photo. `width` is the figure's width in px. */
export function Silhouette({ width, color, opacity }: { width: number; color: string; opacity: number }) {
  const head = width * 0.38;
  return (
    <View pointerEvents="none" aria-hidden style={{ position: 'absolute', left: 0, right: 0, bottom: 0, alignItems: 'center', opacity }}>
      <View style={{ width: head, height: head, borderRadius: head / 2, backgroundColor: color, marginBottom: width * 0.1 }} />
      <View style={{ width: width * 0.8, height: width * 0.52, borderTopLeftRadius: width * 0.4, borderTopRightRadius: width * 0.4, backgroundColor: color }} />
    </View>
  );
}

/** Empty photo placeholder with a code from docs/design/photo-shot-list.md (P1 to P6). */
export function PhotoPlaceholder({ code, caption, radius = radii.input, style }: {
  code: string;
  caption: string;
  radius?: number;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View
      accessibilityLabel={`Example photo placeholder: ${caption}`}
      style={[{ aspectRatio: 3 / 4, borderRadius: radius, backgroundColor: colors.photoPlaceholder, overflow: 'hidden' }, style]}>
      <CropMarks color={colors.carbon} />
      <Text style={[type.tag, styles.placeholderCaption]}>{`${code} ${caption}`}</Text>
    </View>
  );
}

export const styles = StyleSheet.create({
  scroll: { flexGrow: 1 },
  wrap: {
    flexGrow: 1,
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
    paddingHorizontal: space.gutter,
    paddingTop: 20,
    paddingBottom: 28,
  },
  wrapDark: { paddingTop: 24 },
  footer: { marginTop: 28, gap: 14 },
  brandBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: space.touch },
  card: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line, borderRadius: radii.card, padding: 20 },
  tip: { backgroundColor: colors.soft, borderRadius: radii.input, paddingVertical: 14, paddingHorizontal: 16, marginTop: 12 },
  button: {
    height: space.button,
    borderRadius: radii.pill,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  buttonSmall: {
    minHeight: space.touch,
    borderRadius: radii.pill,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  textButton: { minHeight: space.touch, justifyContent: 'center', paddingHorizontal: 4, alignSelf: 'flex-start' },
  underline: { textDecorationLine: 'underline' },
  back: {
    width: space.touch,
    height: space.touch,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chevron: {
    width: 10,
    height: 10,
    borderLeftWidth: 2,
    borderBottomWidth: 2,
    borderColor: colors.carbon,
    transform: [{ translateX: 2 }, { rotate: '45deg' }],
  },
  stepBar: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  track: { flex: 1, height: 4, borderRadius: 2, backgroundColor: colors.line, overflow: 'hidden' },
  trackFill: { height: '100%', borderRadius: 2, backgroundColor: colors.cobalt },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 6 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.lineStrong },
  dotActive: { width: 24, backgroundColor: colors.cobalt },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 72,
    paddingVertical: 14,
    paddingHorizontal: 20,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radii.option,
  },
  // One px less padding keeps the text still when the border grows to 2 px.
  optionSelected: { borderWidth: 2, borderColor: colors.cobalt, paddingVertical: 13, paddingHorizontal: 19 },
  optionCheck: { width: 24, height: 24, borderRadius: 12, backgroundColor: colors.cobalt, alignItems: 'center', justifyContent: 'center' },
  optionEmpty: { width: 22, height: 22, borderRadius: 11, borderWidth: 1.5, borderColor: colors.mutedOnDark },
  input: {
    height: 52,
    paddingHorizontal: 16,
    color: colors.carbon,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.lineStrong,
    borderRadius: radii.input,
  },
  check: { flexDirection: 'row', gap: 16, alignItems: 'flex-start', paddingVertical: 20, minHeight: space.touch },
  box: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: colors.muted,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  boxOn: { backgroundColor: colors.cobalt, borderColor: colors.cobalt },
  chip: {
    minHeight: space.touch,
    paddingHorizontal: 18,
    justifyContent: 'center',
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.lineStrong,
    backgroundColor: colors.white,
  },
  chipOn: { backgroundColor: colors.carbon, borderColor: colors.carbon },
  tag: { paddingVertical: 4, paddingHorizontal: 10, borderRadius: radii.pill, backgroundColor: colors.soft, alignSelf: 'flex-start' },
  tagDashed: { backgroundColor: 'transparent', borderWidth: 1, borderStyle: 'dashed', borderColor: colors.cobalt },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 5,
    paddingLeft: 8,
    paddingRight: 12,
    borderRadius: radii.pill,
    alignSelf: 'flex-start',
  },
  ring: { width: 14, height: 14, borderRadius: 7, borderWidth: 2 },
  placeholderCaption: { position: 'absolute', left: 16, right: 10, bottom: 14, color: colors.neutralPillText, ...weight('400'), fontSize: 11 },
});
