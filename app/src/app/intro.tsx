import { router, useLocalSearchParams } from 'expo-router';
import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { BrandBar, Button, Card, Dots, Lede, Screen, Silhouette, StatusPill, TextButton, type PillKind } from '@/ui/components';
import { colors, radii, type, weight } from '@/ui/theme';

/** 2 to 4: three explainers with Skip and dots. Collect nothing. `?step=1..3`. */
export default function Intro() {
  const { step: raw } = useLocalSearchParams<{ step?: string }>();
  const step = Math.min(Math.max(Number(raw) || 1, 1), 3);
  const page = PAGES[step - 1];
  const last = step === PAGES.length;

  return (
    <Screen
      footer={
        <>
          <Dots count={PAGES.length} active={step - 1} />
          <Button
            variant={last ? 'accent' : 'primary'}
            label={last ? "Let's start" : 'Next'}
            onPress={() => (last ? router.push('/consent') : router.push({ pathname: '/intro', params: { step: String(step + 1) } }))}
          />
        </>
      }>
      <BrandBar action={<TextButton label="Skip" accessibilityLabel="Skip the introduction" onPress={() => router.push('/consent')} />} />
      <View style={{ marginTop: 20 }}>{page.visual}</View>
      <Text role="heading" aria-level={1} style={[type.explainer, { color: colors.carbon, marginTop: 34 }]}>
        {page.title}
      </Text>
      <Lede>{page.body}</Lede>
    </Screen>
  );
}

function Row({ title, detail, kind, label, last, big }: {
  title: string;
  detail: string;
  kind: PillKind;
  label: string;
  last?: boolean;
  big?: boolean;
}) {
  return (
    <View style={[styles.row, !last && styles.rowLine]}>
      <View style={styles.rowHead}>
        <View style={{ flex: big ? undefined : 1, flexShrink: 1 }}>
          <Text style={big ? [type.option, weight('800'), { letterSpacing: -0.36 }] : [type.lede, weight('600')]}>{title}</Text>
          {!big && <Text style={[type.caption, { color: colors.muted, marginTop: 2 }]}>{detail}</Text>}
        </View>
        <StatusPill kind={kind} label={label} />
      </View>
      {big && <Text style={[type.small, { color: colors.muted, marginTop: 8 }]}>{detail}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  photo: { height: 250, borderRadius: radii.photo, backgroundColor: colors.photoPlaceholder, overflow: 'hidden' },
  window: { position: 'absolute', right: 30, top: 26, width: 84, height: 84, borderRadius: 42, backgroundColor: colors.white },
  windowRing: { position: 'absolute', right: 18, top: 14, width: 108, height: 108, borderRadius: 54, borderWidth: 2, borderColor: colors.cobalt },
  caption: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 16 },
  row: { paddingVertical: 18 },
  rowLine: { borderBottomWidth: 1, borderBottomColor: colors.soft },
  rowHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
});

// The examples below illustrate the format; they are not anyone's real results.
const PAGES: { title: string; body: string; visual: ReactNode }[] = [
  {
    title: "Scouts told us it's the photo, not you.",
    body: 'In our interviews, bad lighting and weak photos came up more than anything else. That part you can fix today.',
    visual: (
      <Card style={{ borderRadius: radii.hero, padding: 18 }}>
        <View style={styles.photo} aria-hidden>
          <Silhouette width={190} color={colors.carbon} opacity={0.18} />
          <View style={styles.window} />
          <View style={styles.windowRing} />
        </View>
        <View style={styles.caption}>
          <StatusPill kind="improve" label="Improve" />
          <Text style={[type.caption, { color: colors.muted, flex: 1 }]}>Window behind you. Details are lost.</Text>
        </View>
      </Card>
    ),
  },
  {
    title: 'You get notes, not a score.',
    body: 'Each note says what we saw and one thing to try. No numbers and no ranking.',
    visual: (
      <Card style={{ borderRadius: radii.hero, paddingVertical: 8 }}>
        <Row title="Photo set" detail="Side profile is missing" kind="missing" label="Missing" />
        <Row title="Bright spots" detail="Window behind you" kind="improve" label="Improve" />
        <Row title="Focus" detail="Clear and sharp" kind="good" label="Good" last />
      </Card>
    ),
  },
  {
    title: 'Then see where to apply, and why.',
    body: 'We list agencies and what they publish, so you know what they ask for before you send anything.',
    visual: (
      <Card style={{ borderRadius: radii.hero, paddingVertical: 8 }}>
        <Row big title="MINOIRE" detail="Matches because your height meets their 175 cm minimum." kind="good" label="Matches" />
        <Row big title="Elite open casting" detail="Not a match because this event was for ages 14 to 20." kind="neutral" label="Not a match" last />
      </Card>
    ),
  },
];
