import { Redirect, router } from 'expo-router';
import { useMemo } from 'react';
import { Linking, StyleSheet, Text, View } from 'react-native';

import { agencies, matchAll, type AgencyMatch, type ReasonOutcome, type Verdict } from '@/agencies/match';
import { measurementFields, rubric } from '@/scoring/rubric';
import { parseMeasurement } from '@/scoring/score';
import { useSubmission } from '@/state/submission';
import { Actions, Button, Checkbox, ChoiceGroup, H2, H3, Lede, Note, Panel, Screen, styles as ui } from '@/ui/components';
import { useColors, type Colors } from '@/ui/theme';

const OUTCOME_MARK: Record<ReasonOutcome, string> = { match: '✓', 'no-match': '✗', unknown: '?', 'not-published': '–' };

/** A typed value inside the accepted range, or null. Out-of-range values are flagged on the feedback screen. */
function validNumber(raw: string | undefined, range: { min: number; max: number } | undefined): number | null {
  const v = parseMeasurement(raw);
  if (v === null || Number.isNaN(v) || !range || v < range.min || v > range.max) return null;
  return v;
}

function verdictColours(v: Verdict, c: Colors) {
  if (v === 'match') return { fg: c.accent, bg: c.accentSoft };
  if (v === 'not-a-match') return { fg: c.ink, bg: c.bg };
  if (v === 'nothing-published') return { fg: c.muted, bg: c.bg };
  return { fg: c.warn, bg: c.warnSoft };
}

export default function Agencies() {
  const colors = useColors();
  const s = useSubmission();
  const heightField = measurementFields.find((f) => f.id === 'height');

  const results = useMemo(
    () =>
      matchAll(
        agencies,
        {
          heightCm: validNumber(s.measurements.height, heightField),
          ageYears: validNumber(s.age, rubric.modelCard.age),
          experience: s.experience,
        },
        s.divisions,
        s.showRanges,
        new Date(),
      ),
    [s.measurements.height, s.age, s.experience, s.divisions, s.showRanges, heightField],
  );

  if (!s.consented) return <Redirect href="/consent" />;

  return (
    <Screen step={3}>
      <View>
        <H2>Agencies</H2>
        <Lede style={{ marginTop: 12 }}>
          Every agency we have a record for is listed. Each one shows why you match or don&apos;t match its published requirements, where the information comes from, and when it was last checked. Agencies make the final decision, and many look beyond these numbers.
        </Lede>
      </View>

      <Panel style={{ paddingVertical: 8 }}>
        <Checkbox
          label="Show bust, waist and hips ranges where an agency publishes them"
          checked={s.showRanges}
          onChange={s.setShowRanges}
        />
        <Text style={[ui.small, { color: colors.muted, paddingBottom: 8 }]}>
          Off by default. Ranges are shown for information only and never decide a match.
        </Text>
      </Panel>

      {results.map((m) => (
        <AgencyCard key={m.agency.id} m={m} />
      ))}

      <Note>
        This list is an early seed. Every record still needs checking against the agency&apos;s own site and, for requirements, confirmation by a scout.
      </Note>
      <Actions>
        <Button label="Back to my feedback" onPress={() => (router.canGoBack() ? router.back() : router.replace('/feedback'))} />
      </Actions>
    </Screen>
  );
}

function AgencyCard({ m }: { m: AgencyMatch }) {
  const colors = useColors();
  const s = useSubmission();
  const { agency: a } = m;
  const vc = verdictColours(m.verdict, colors);
  const chosenLabel = m.division?.label ?? null;

  return (
    <View style={[local.card, { backgroundColor: colors.surface, borderColor: colors.line }]}>
      <View style={local.head}>
        <View style={{ flex: 1, minWidth: 200, gap: 4 }}>
          <H3>{a.name}</H3>
          <Text style={[ui.small, { color: colors.muted }]}>{`${a.type} · ${a.markets.join(', ')}`}</Text>
        </View>
        <View style={[local.badge, { backgroundColor: vc.bg, borderColor: vc.fg }]}>
          <Text style={[ui.small, { color: vc.fg, fontWeight: '700' }]}>{m.verdictText}</Text>
        </View>
      </View>

      {a.past_event && (
        <Text style={[ui.small, local.flag, { color: colors.warn, backgroundColor: colors.warnSoft }]}>
          Past event: listed as an example of published criteria. Look for a current open call before applying.
        </Text>
      )}
      <Text style={[ui.small, local.flag, m.freshness.stale ? { color: colors.warn, backgroundColor: colors.warnSoft } : { color: colors.muted }]}>
        {m.freshness.stale ? `Stale: ${m.freshness.text}` : m.freshness.text}
      </Text>
      <Text style={[ui.small, local.flag, m.fees.warn ? { color: colors.err, backgroundColor: colors.warnSoft, fontWeight: '700' } : { color: colors.muted }]}>
        {m.fees.warn ? `Warning: ${m.fees.text}` : m.fees.text}
      </Text>

      <ChoiceGroup
        label={`Your division at ${a.name}`}
        emptyLabel="Not chosen"
        options={a.divisions.map((d) => d.label)}
        value={chosenLabel}
        onChange={(label) => s.setDivision(a.id, a.divisions.find((d) => d.label === label)?.id ?? null)}
      />

      <View role="list" style={{ gap: 8 }}>
        {m.reasons.map((r) => (
          <View key={`${r.topic}-${r.text}`} role="listitem" style={{ flexDirection: 'row', gap: 10 }}>
            <Text style={[ui.body, { color: r.outcome === 'match' ? colors.accent : colors.ink, width: 16, fontWeight: '700' }]}>
              {OUTCOME_MARK[r.outcome]}
            </Text>
            <Text style={[ui.body, { color: colors.ink, flex: 1 }]}>
              <Text style={{ fontWeight: '600' }}>{`${r.topic}: `}</Text>
              {r.text}
            </Text>
          </View>
        ))}
      </View>

      {s.showRanges && m.division && (
        <View style={{ gap: 4 }}>
          {m.ranges.length ? (
            m.ranges.map((r) => (
              <Text key={r.field} style={[ui.small, { color: colors.ink }]}>
                {`${r.text} Source: ${r.source.kind}.`}
              </Text>
            ))
          ) : (
            <Text style={[ui.small, { color: colors.muted }]}>This division has no published bust, waist or hips ranges.</Text>
          )}
        </View>
      )}

      <Text style={[ui.small, { color: colors.ink }]}>
        <Text style={{ fontWeight: '600' }}>How to apply: </Text>
        {a.how_to_apply}
      </Text>

      <View style={[local.sources, { borderTopColor: colors.line }]}>
        {a.sources.map((src) => (
          <Text key={src.url} style={[ui.small, { color: colors.muted }]}>
            {'Source ('}
            {src.kind.replace(/_/g, ' ')}
            {src.found_on ? `, found ${src.found_on}` : ''}
            {'): '}
            <Text role="link" onPress={() => Linking.openURL(src.url)} style={{ color: colors.accent, textDecorationLine: 'underline' }}>
              {new URL(src.url).hostname}
            </Text>
          </Text>
        ))}
        <Text style={[ui.small, { color: colors.muted }]}>{`Confidence: ${a.confidence}`}</Text>
      </View>
    </View>
  );
}

const local = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: 8, paddingVertical: 18, paddingHorizontal: 20, gap: 14 },
  head: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 },
  badge: { borderWidth: 1, borderRadius: 999, paddingVertical: 2, paddingHorizontal: 10 },
  flag: { paddingVertical: 6, paddingHorizontal: 10, borderRadius: 6, overflow: 'hidden' },
  sources: { borderTopWidth: 1, paddingTop: 10, gap: 4 },
});
