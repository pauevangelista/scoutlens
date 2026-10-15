import { Redirect, router } from 'expo-router';
import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { buildFeedback, STATUS_LABEL, type Status } from '@/feedback/feedback';
import { GUIDE } from '@/feedback/guide';
import { buildNotes, type NoteCard } from '@/feedback/notes';
import { requiredPhotos } from '@/scoring/rubric';
import { useSubmission } from '@/state/submission';
import { BrandBar, Button, Card, H1, Lede, PhotoPlaceholder, Screen, StatusPill, TextButton, TipPanel, type PillKind } from '@/ui/components';
import { colors, type } from '@/ui/theme';

const PILL_FOR_STATUS: Record<Status, PillKind> = { good: 'good', improve: 'improve', missing: 'missing', 'not-measured': 'neutral' };

/** 11 Your notes. A status, a reason and a tip per check. No score. */
export default function Notes() {
  const s = useSubmission();
  // Photo feedback sees photos only. The model card goes to the details card; fairness answers go nowhere.
  const { cards, summary } = useMemo(
    () => buildNotes(buildFeedback({ photos: s.photos, card: { measurements: s.measurements, age: s.age, experience: s.experience } })),
    [s.photos, s.measurements, s.age, s.experience],
  );

  if (!s.consented) return <Redirect href="/consent" />;
  if (!requiredPhotos.some((id) => s.photos[id])) return <Redirect href="/photos" />;

  return (
    <Screen footer={<Button label="Where could I apply?" onPress={() => router.push('/agencies')} />}>
      <BrandBar action={<TextButton label="Edit my photos" onPress={() => router.dismissTo('/photos')} />} />
      <H1 style={{ marginTop: 28 }}>Your notes</H1>
      <Lede>{summary}</Lede>
      <View style={{ gap: 12, marginTop: 26 }}>
        {cards.map((c) => (
          <NoteView key={c.id} card={c} />
        ))}
      </View>
    </Screen>
  );
}

function NoteView({ card }: { card: NoteCard }) {
  const link = card.link;
  const section = link?.kind === 'guide' ? GUIDE.find((g) => g.id === link.section) : undefined;
  const showTip = card.status !== 'good';
  return (
    <Card>
      <View style={styles.head}>
        <Text role="heading" aria-level={2} style={[type.cardTitle, { color: colors.carbon, flexShrink: 1 }]}>
          {card.name}
        </Text>
        <StatusPill kind={PILL_FOR_STATUS[card.status]} label={STATUS_LABEL[card.status]} />
      </View>
      <Text style={[type.body, { color: colors.carbon, marginTop: 10 }]}>{card.reason}</Text>
      {showTip && <TipPanel>{card.tip}</TipPanel>}
      {showTip && card.id === 'highlights' && <BrightSpotsExample />}
      {showTip && section && (
        <TextButton tone="accent" label={section.cta} onPress={() => router.push({ pathname: '/digitals', params: { section: section.id } })} />
      )}
      {showTip && link?.kind === 'details' && <TextButton tone="accent" label="Edit my details" onPress={() => router.dismissTo('/details')} />}
    </Card>
  );
}

/** "Not yet" vs "Better" for bright spots. Placeholders P4a and P4b from docs/design/photo-shot-list.md. */
function BrightSpotsExample() {
  const examples = [
    { code: 'P4a', caption: 'Same outfit, same wall\nWindow behind you', title: 'Not yet', note: 'Details disappear into white.' },
    { code: 'P4b', caption: 'Same outfit, same wall\nWindow in front of you', title: 'Better', note: 'Soft, even light on you.' },
  ];
  return (
    <View style={styles.examples}>
      {examples.map((e) => (
        <View key={e.code} style={{ flex: 1 }}>
          <PhotoPlaceholder code={e.code} caption={e.caption} />
          <Text style={[type.label, { color: colors.carbon, marginTop: 8 }]}>{e.title}</Text>
          <Text style={[type.fine, { color: colors.muted, marginTop: 2 }]}>{e.note}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  examples: { flexDirection: 'row', gap: 12, marginTop: 16 },
});
