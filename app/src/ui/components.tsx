// Shared building blocks, styled after the prototype.
import type { ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useColors } from './theme';

const STEPS = ['1. Consent', '2. Your profile', '3. Your score'];

export function Screen({ step, children }: { step: 0 | 1 | 2; children: ReactNode }) {
  const c = useColors();
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.wrap}>
          <View style={styles.top}>
            <Text style={[styles.brand, { color: c.ink }]}>ScoutLens</Text>
            <Text style={[styles.small, { color: c.muted }]}>Prototype v0. Demo rubric, not a real assessment.</Text>
          </View>

          <View style={styles.steps} accessibilityLabel="Progress" role="list">
            {STEPS.map((label, i) => {
              const current = i === step;
              return (
                <View
                  key={label}
                  role="listitem"
                  aria-current={current ? 'step' : undefined}
                  style={[styles.stepItem, { borderTopColor: i <= step ? c.accent : c.line }]}>
                  <Text style={[styles.small, { color: current ? c.ink : c.muted, fontWeight: current ? '600' : '400' }]}>
                    {label}
                  </Text>
                </View>
              );
            })}
          </View>

          <View style={styles.stack}>{children}</View>

          <Text style={[styles.fine, { color: c.muted, borderTopColor: c.line }]}>
            Prototype for a university capstone study on explainable scoring in model scouting. Everything runs on your device.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

export function H1({ children }: { children: ReactNode }) {
  const c = useColors();
  return <Text role="heading" aria-level={1} style={[styles.h1, { color: c.ink }]}>{children}</Text>;
}

export function H2({ children, style }: { children: ReactNode; style?: StyleProp<TextStyle> }) {
  const c = useColors();
  return <Text role="heading" aria-level={2} style={[styles.h2, { color: c.ink }, style]}>{children}</Text>;
}

export function H3({ children }: { children: ReactNode }) {
  const c = useColors();
  return <Text role="heading" aria-level={3} style={[styles.h3, { color: c.ink }]}>{children}</Text>;
}

export function Lede({ children, style }: { children: ReactNode; style?: StyleProp<TextStyle> }) {
  const c = useColors();
  return <Text style={[styles.lede, { color: c.muted }, style]}>{children}</Text>;
}

export function Panel({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const c = useColors();
  return <View style={[styles.panel, { backgroundColor: c.surface, borderColor: c.line }, style]}>{children}</View>;
}

export function Note({ children }: { children: ReactNode }) {
  const c = useColors();
  return (
    <View style={[styles.note, { backgroundColor: c.accentSoft, borderLeftColor: c.accent }]}>
      <Text style={[styles.small, { color: c.ink }]}>{children}</Text>
    </View>
  );
}

export function Button({
  label,
  onPress,
  disabled,
  variant = 'primary',
  style,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  variant?: 'primary' | 'secondary';
  style?: StyleProp<ViewStyle>;
}) {
  const c = useColors();
  const primary = variant === 'primary';
  return (
    <Pressable
      role="button"
      aria-disabled={disabled}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: primary ? c.accent : 'transparent',
          borderColor: primary ? c.accent : c.line,
          opacity: disabled ? 0.45 : pressed ? 0.85 : 1,
        },
        style,
      ]}>
      <Text style={[styles.buttonText, { color: primary ? c.accentInk : c.ink }]}>{label}</Text>
    </Pressable>
  );
}

export function Actions({ children }: { children: ReactNode }) {
  return <View style={styles.actions}>{children}</View>;
}

export function Checkbox({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  const c = useColors();
  return (
    <Pressable
      role="checkbox"
      aria-checked={checked}
      accessibilityState={{ checked }}
      accessibilityLabel={label}
      onPress={() => onChange(!checked)}
      style={styles.check}>
      <View
        style={[
          styles.box,
          { borderColor: checked ? c.accent : c.muted, backgroundColor: checked ? c.accent : 'transparent' },
        ]}>
        {checked && <Text style={[styles.tick, { color: c.accentInk }]}>✓</Text>}
      </View>
      <Text style={[styles.body, { color: c.ink, flex: 1 }]}>{label}</Text>
    </Pressable>
  );
}

/** A single-choice row of options, used instead of a dropdown. */
export function ChoiceGroup({
  label,
  options,
  value,
  onChange,
  emptyLabel,
}: {
  label: string;
  options: string[];
  value: string | null;
  onChange: (v: string | null) => void;
  emptyLabel: string;
}) {
  const c = useColors();
  const all: { key: string | null; text: string }[] = [{ key: null, text: emptyLabel }, ...options.map((o) => ({ key: o, text: o }))];
  return (
    <View>
      <Text style={[styles.label, { color: c.ink }]}>{label}</Text>
      <View role="radiogroup" accessibilityLabel={label} style={styles.choices}>
        {all.map((o) => {
          const selected = o.key === value;
          return (
            <Pressable
              key={o.text}
              role="radio"
              aria-checked={selected}
              accessibilityState={{ selected }}
              onPress={() => onChange(o.key)}
              style={[
                styles.choice,
                { borderColor: selected ? c.accent : c.line, backgroundColor: selected ? c.accentSoft : c.bg },
              ]}>
              <Text style={[styles.small, { color: c.ink, fontWeight: selected ? '600' : '400' }]}>{o.text}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export const styles = StyleSheet.create({
  scroll: { flexGrow: 1 },
  wrap: { width: '100%', maxWidth: 880, alignSelf: 'center', paddingHorizontal: 20, paddingTop: 20, paddingBottom: 64 },
  top: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'baseline', gap: 16, paddingTop: 8, paddingBottom: 20 },
  brand: { fontSize: 22, fontWeight: '700', letterSpacing: -0.2 },
  steps: { flexDirection: 'row', gap: 8, marginBottom: 28 },
  stepItem: { flex: 1, borderTopWidth: 3, paddingTop: 8 },
  stack: { gap: 20 },
  h1: { fontSize: 40, lineHeight: 45, fontWeight: '700', letterSpacing: -0.6, maxWidth: 560 },
  h2: { fontSize: 26, lineHeight: 29, fontWeight: '700', letterSpacing: -0.4 },
  h3: { fontSize: 18, lineHeight: 20, fontWeight: '700' },
  lede: { fontSize: 18, lineHeight: 28, maxWidth: 560 },
  body: { fontSize: 16, lineHeight: 25 },
  small: { fontSize: 14, lineHeight: 21 },
  label: { fontSize: 14, fontWeight: '600', marginBottom: 6 },
  panel: { borderWidth: 1, borderRadius: 8, padding: 20 },
  note: { borderLeftWidth: 4, paddingVertical: 12, paddingHorizontal: 16, borderTopRightRadius: 6, borderBottomRightRadius: 6 },
  button: { borderWidth: 2, borderRadius: 6, paddingVertical: 10, paddingHorizontal: 20, minHeight: 44, justifyContent: 'center', alignItems: 'center' },
  buttonText: { fontSize: 16, fontWeight: '600' },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 4 },
  check: { flexDirection: 'row', gap: 12, alignItems: 'flex-start', paddingVertical: 12, minHeight: 44 },
  box: { width: 22, height: 22, borderWidth: 2, borderRadius: 4, marginTop: 2, alignItems: 'center', justifyContent: 'center' },
  tick: { fontSize: 14, lineHeight: 16, fontWeight: '700' },
  choices: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  choice: { borderWidth: 1, borderRadius: 6, paddingVertical: 10, paddingHorizontal: 12, minHeight: 44, justifyContent: 'center' },
  fine: { marginTop: 40, fontSize: 13, lineHeight: 20, borderTopWidth: 1, paddingTop: 16 },
});
