import { Redirect, router } from 'expo-router';
import { useMemo } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';

import { slotCopy } from '@/scoring/photo-slots';
import { requiredPhotos } from '@/scoring/rubric';
import { scoreSubmission, type ScoredCriterion } from '@/scoring/score';
import { useSubmission } from '@/state/submission';
import { Actions, Button, H3, Lede, Note, Screen, styles as ui } from '@/ui/components';
import { useColors } from '@/ui/theme';

export default function Score() {
  const c = useColors();
  const s = useSubmission();
  // Scoring sees photos and measurements only; group attributes are never passed in.
  const report = useMemo(() => scoreSubmission({ photos: s.photos, measurements: s.measurements }), [s.photos, s.measurements]);

  if (!s.consented) return <Redirect href="/consent" />;
  if (!requiredPhotos.some((id) => s.photos[id])) return <Redirect href="/profile" />;

  return (
    <Screen step={2}>
      <View>
        <View style={local.total} aria-live="polite">
          <Text style={[local.num, { color: c.ink }]}>{report.total}</Text>
          <Text style={[local.of, { color: c.muted }]}>out of 100</Text>
        </View>
        <Lede style={{ marginTop: 12 }}>
          This is the score under the prototype&apos;s provisional rubric. It measures how complete and technically clear your submission is, not how you look. Each criterion below shows how it was scored.
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

      {report.criteria.map((r) => (
        <CriterionCard key={r.criterion.id} r={r} />
      ))}

      <Note>
        In the study, the criteria and weights will come from interviews with professional scouts, and scouts will be able to review and override every score.
      </Note>
      <Actions>
        <Button label="Edit my profile" onPress={() => (router.canGoBack() ? router.back() : router.replace('/profile'))} />
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

function CriterionCard({ r }: { r: ScoredCriterion }) {
  const c = useColors();
  return (
    <View style={[local.crit, { backgroundColor: c.surface, borderColor: c.line }]}>
      <View style={local.head}>
        <H3>{r.criterion.name}</H3>
        <Text>
          <Text style={[local.score, { color: c.ink }]}>{r.score}/100</Text>
          <Text style={[ui.small, { color: c.muted }]}>{`  adds ${r.points} of ${r.criterion.weight} points`}</Text>
        </Text>
      </View>
      <View role="img" accessibilityLabel={`${r.score} out of 100`} style={[local.bar, { backgroundColor: c.line }]}>
        <View style={{ width: `${r.score}%`, height: '100%', backgroundColor: c.accent }} />
      </View>
      <Text style={[ui.body, { color: c.ink, marginTop: 12 }]}>{r.reason}</Text>
      <Text
        style={[
          ui.small,
          local.tip,
          r.ok ? { color: c.accent, backgroundColor: c.accentSoft } : { color: c.warn, backgroundColor: c.warnSoft },
        ]}>
        {r.tip}
      </Text>
    </View>
  );
}

const local = StyleSheet.create({
  total: { flexDirection: 'row', alignItems: 'baseline', gap: 12, flexWrap: 'wrap' },
  num: { fontSize: 96, lineHeight: 96, fontWeight: '700', letterSpacing: -2.5 },
  of: { fontSize: 24 },
  thumbs: { flexDirection: 'row', gap: 8, marginTop: 20 },
  thumb: { width: 64, height: 84, borderWidth: 1 },
  crit: { borderWidth: 1, borderRadius: 8, paddingVertical: 18, paddingHorizontal: 20 },
  head: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'baseline', gap: 12, marginBottom: 10 },
  score: { fontSize: 22, fontWeight: '700' },
  bar: { height: 10, borderRadius: 2, overflow: 'hidden' },
  tip: { marginTop: 8, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 6, overflow: 'hidden' },
});
