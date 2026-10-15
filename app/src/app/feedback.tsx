import { Link, Redirect, router } from 'expo-router';
import { useMemo } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';

import { buildFeedback, STATUS_LABEL, type Check, type Status } from '@/feedback/feedback';
import { GUIDE } from '@/feedback/guide';
import { slotCopy } from '@/scoring/photo-slots';
import { requiredPhotos } from '@/scoring/rubric';
import { useSubmission } from '@/state/submission';
import { Actions, Button, H2, H3, Lede, Note, Screen, styles as ui } from '@/ui/components';
import { useColors, type Colors } from '@/ui/theme';

/** A symbol next to the word, so status never depends on colour alone. */
const STATUS_MARK: Record<Status, string> = { good: '✓', improve: '!', missing: '○', 'not-measured': '–' };

function statusColours(status: Status, c: Colors) {
  switch (status) {
    case 'good': return { fg: c.accent, bg: c.accentSoft };
    case 'improve': return { fg: c.warn, bg: c.warnSoft };
    case 'missing': return { fg: c.err, bg: c.bg };
    case 'not-measured': return { fg: c.muted, bg: c.bg };
  }
}

export default function FeedbackScreen() {
  const c = useColors();
  const s = useSubmission();
  // Photo feedback sees photos only. The model card goes to the details group; fairness answers go nowhere.
  const feedback = useMemo(
    () => buildFeedback({ photos: s.photos, card: { measurements: s.measurements, age: s.age, experience: s.experience } }),
    [s.photos, s.measurements, s.age, s.experience],
  );

  if (!s.consented) return <Redirect href="/consent" />;
  if (!requiredPhotos.some((id) => s.photos[id])) return <Redirect href="/profile" />;

  const toImprove = [...feedback.photos, ...feedback.details].filter((x) => x.status === 'improve' || x.status === 'missing').length;

  return (
    <Screen step={2}>
      <View>
        <H2>Your feedback</H2>
        <Lede style={{ marginTop: 12 }}>
          {toImprove === 0
            ? 'Everything we check looks ready to send.'
            : `${toImprove} ${toImprove > 1 ? 'things' : 'thing'} to add or improve before you send your digitals.`}{' '}
          This checks how complete and technically clear your submission is, not how you look.
        </Lede>
        <View style={local.thumbs}>
          {requiredPhotos.map((id) => {
            const p = s.photos[id];
            return p ? (
              <Image key={id} source={{ uri: p.uri }} accessibilityLabel={slotCopy(id).name} style={[local.thumb, { borderColor: c.line }]} />
            ) : null;
          })}
        </View>
      </View>

      <Group title="Your photos" checks={feedback.photos} />
      <Group title="Your details" checks={feedback.details} />

      <Note>
        In the study, the checks will come from interviews with professional scouts, and scouts will be able to review and override every piece of feedback.
      </Note>
      <Actions>
        <Button label="See matching agencies" onPress={() => router.push('/agencies')} />
        <Button label="Edit my profile" variant="secondary" onPress={() => (router.canGoBack() ? router.back() : router.replace('/profile'))} />
        <Button
          label="Start over and delete my photos"
          variant="secondary"
          onPress={() => {
            s.reset();
            router.dismissTo('/consent');
          }}
        />
      </Actions>
    </Screen>
  );
}

function Group({ title, checks }: { title: string; checks: Check[] }) {
  return (
    <View style={{ gap: 12 }}>
      <H2 style={{ marginTop: 8 }}>{title}</H2>
      {checks.map((x) => (
        <CheckCard key={x.id} check={x} />
      ))}
    </View>
  );
}

function StatusBadge({ status }: { status: Status }) {
  const c = useColors();
  const { fg, bg } = statusColours(status, c);
  return (
    <View style={[local.badge, { backgroundColor: bg, borderColor: fg }]}>
      <Text style={[ui.small, { color: fg, fontWeight: '700' }]}>{`${STATUS_MARK[status]} ${STATUS_LABEL[status]}`}</Text>
    </View>
  );
}

function CheckCard({ check }: { check: Check }) {
  const c = useColors();
  const section = check.guide ? GUIDE.find((g) => g.id === check.guide) : undefined;
  const showTip = check.status !== 'good';
  return (
    <View
      style={[local.card, { backgroundColor: c.surface, borderColor: c.line }]}
      accessibilityLabel={`${check.name}: ${STATUS_LABEL[check.status]}`}>
      <View style={local.head}>
        <H3>{check.name}</H3>
        <StatusBadge status={check.status} />
      </View>
      <Text style={[ui.body, { color: c.ink }]}>{check.reason}</Text>
      {showTip && (
        <View style={[local.tip, { backgroundColor: c.bg }]}>
          <Text style={[ui.small, { color: c.ink }]}>
            <Text style={{ fontWeight: '700' }}>Tip: </Text>
            {check.tip}
          </Text>
          {section && (
            <Link href={{ pathname: '/digitals', params: { section: section.id } }} style={[ui.small, local.link, { color: c.accent }]}>
              {`How to take digitals: ${section.title.toLowerCase()} →`}
            </Link>
          )}
        </View>
      )}
    </View>
  );
}

const local = StyleSheet.create({
  thumbs: { flexDirection: 'row', gap: 8, marginTop: 20 },
  thumb: { width: 64, height: 84, borderWidth: 1 },
  card: { borderWidth: 1, borderRadius: 8, paddingVertical: 16, paddingHorizontal: 20, gap: 10 },
  head: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  badge: { borderWidth: 1, borderRadius: 999, paddingVertical: 2, paddingHorizontal: 10 },
  tip: { paddingVertical: 10, paddingHorizontal: 12, borderRadius: 6, gap: 6 },
  link: { fontWeight: '600', textDecorationLine: 'underline', paddingVertical: 4 },
});
