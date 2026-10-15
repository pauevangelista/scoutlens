import { Redirect, router } from 'expo-router';
import { useMemo } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';

import { agencies, matchAll, type Reason, type Verdict } from '@/agencies/match';
import { marketLabel, orderMatches, publishesFocus, type OrderedMatch } from '@/agencies/order';
import { AIMS } from '@/onboarding/answers';
import { measurementFields, rubric } from '@/scoring/rubric';
import { parseMeasurement } from '@/scoring/score';
import { useSubmission } from '@/state/submission';
import { BackButton, Brand, Button, Card, Checkbox, Chip, H1, Lede, Screen, StatusPill, Tag, type PillKind } from '@/ui/components';
import { goBack } from '@/ui/nav';
import { colors, type, weight } from '@/ui/theme';

/** A typed value inside the accepted range, or null. Out-of-range values are flagged on the notes screen. */
function validNumber(raw: string | undefined, range: { min: number; max: number } | undefined): number | null {
  const v = parseMeasurement(raw);
  if (v === null || Number.isNaN(v) || !range || v < range.min || v > range.max) return null;
  return v;
}

const VERDICT_PILL: Record<Verdict, { kind: PillKind; label: string }> = {
  match: { kind: 'good', label: 'Matches' },
  'not-a-match': { kind: 'neutral', label: 'Not a match' },
  'nothing-published': { kind: 'missing', label: 'No rules published' },
  'choose-division': { kind: 'missing', label: 'Choose a category' },
  'add-details': { kind: 'missing', label: 'Add your details' },
};

const LEADS = ['Matches because', 'Not a match because'];

/** 12 Where to look. Every agency is listed, each with why it matches or not, its source and last check. */
export default function Agencies() {
  const s = useSubmission();
  const heightField = measurementFields.find((f) => f.id === 'height');
  const aim = AIMS.find((a) => a.id === s.aim && a.id !== 'not-sure') ?? null;

  const results = useMemo(
    () =>
      orderMatches(
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
        { aim: aim?.id ?? null, location: s.city },
        aim?.label,
      ),
    [s.measurements.height, s.age, s.experience, s.divisions, s.showRanges, s.city, aim, heightField],
  );

  if (!s.consented) return <Redirect href="/consent" />;

  const orderNote = [
    aim &&
      (results.some((m) => publishesFocus(m, aim.id))
        ? `Showing ${aim.label.toLowerCase()} agencies first.`
        : `None of these agencies publish a ${aim.label.toLowerCase()} focus yet, so your aim doesn't change the order.`),
    results.some((m) => m.listedFirstBecause.some((r) => r.startsWith('Works in'))) && 'Agencies that work where you are come first.',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <Screen
      footer={
        <Button
          variant="outline"
          label="Start over and delete my data"
          onPress={() => {
            s.reset();
            router.dismissTo('/');
          }}
        />
      }>
      <View style={styles.top}>
        <BackButton label="Back to my notes" onPress={() => goBack('/notes')} />
        <Brand />
      </View>
      <H1 style={{ marginTop: 28 }}>Where to look</H1>
      <Lede>Based on what each agency publishes. Every agency is listed, and each one tells you why.</Lede>
      <Text style={[type.caption, styles.note]}>
        You choose your category at each agency, using that agency&apos;s own categories. Agencies make the final decision, and many look beyond these numbers.
        {orderNote ? ` ${orderNote}` : ''}
      </Text>

      <Card style={{ marginTop: 20, paddingVertical: 0 }}>
        <Checkbox label="Show bust, waist and hips ranges where an agency publishes them" checked={s.showRanges} onChange={s.setShowRanges} />
        <Text style={[type.fine, { color: colors.muted, marginTop: -12, paddingBottom: 16 }]}>
          Off by default. Ranges are for information only and never decide a match.
        </Text>
      </Card>

      <View style={{ gap: 12, marginTop: 12 }}>
        {results.map((m) => (
          <AgencyCard key={m.agency.id} m={m} />
        ))}
      </View>

      <Text style={[type.caption, styles.note, { marginTop: 22 }]}>
        <Text style={styles.strong}>Before you apply.</Text> Check the agency&apos;s own website first. A real agency doesn&apos;t charge you to be signed. If
        anyone asks for money up front, walk away.
      </Text>
    </Screen>
  );
}

function ReasonLine({ r }: { r: Reason }) {
  const lead = LEADS.find((l) => r.text.startsWith(l));
  const decided = r.outcome === 'match' || r.outcome === 'no-match';
  return (
    <Text role="listitem" style={[type.body, { color: decided ? colors.carbon : colors.muted }]}>
      {lead ? (
        <>
          <Text style={weight('600')}>{lead}</Text>
          {r.text.slice(lead.length)}
        </>
      ) : (
        r.text
      )}
    </Text>
  );
}

function AgencyCard({ m }: { m: OrderedMatch }) {
  const s = useSubmission();
  const { agency: a } = m;
  const pill = VERDICT_PILL[m.verdict];
  const kind = a.type.charAt(0).toUpperCase() + a.type.slice(1);
  // The chosen division is shown by the chips, so its "You chose..." line is left out.
  const reasons = m.reasons.filter((r) => !(r.topic === 'Division' && r.outcome === 'match'));
  const freshTag = m.freshness.lastVerified === null
    ? "Not yet verified on their site"
    : m.freshness.stale
      ? `Last verified ${m.freshness.lastVerified}, may be out of date`
      : `Verified ${m.freshness.lastVerified}`;

  return (
    <Card>
      <View style={styles.head}>
        <View style={styles.name}>
          <Text role="heading" aria-level={2} style={[type.section, { color: colors.carbon }]}>
            {a.name}
          </Text>
          <Text style={[type.caption, { color: colors.muted, marginTop: 2 }]}>{`${kind} · ${a.markets.map(marketLabel).join(', ')}`}</Text>
        </View>
        <StatusPill kind={pill.kind} label={pill.label} />
      </View>

      {m.listedFirstBecause.length > 0 && (
        <View style={[styles.tags, { marginTop: 12 }]}>
          {m.listedFirstBecause.map((t) => (
            <Tag key={t} label={t} />
          ))}
        </View>
      )}

      <Text style={[type.label, { color: colors.carbon, marginTop: 16 }]}>{`Your category at ${a.name}`}</Text>
      <View role="radiogroup" accessibilityLabel={`Your category at ${a.name}`} style={[styles.tags, { marginTop: 8 }]}>
        {a.divisions.map((d) => (
          <Chip
            key={d.id}
            label={d.label}
            selected={m.division?.id === d.id}
            onPress={() => s.setDivision(a.id, m.division?.id === d.id ? null : d.id)}
          />
        ))}
      </View>

      <View role="list" style={{ gap: 8, marginTop: 14 }}>
        {reasons.map((r) => (
          <ReasonLine key={`${r.topic}-${r.text}`} r={r} />
        ))}
      </View>

      {s.showRanges && m.division && (
        <View style={{ gap: 4, marginTop: 10 }}>
          {m.ranges.length ? (
            m.ranges.map((r) => (
              <Text key={r.field} style={[type.small, { color: colors.carbon }]}>
                {`${r.text} Source: ${r.source.kind.replace(/_/g, ' ')}.`}
              </Text>
            ))
          ) : (
            <Text style={[type.small, { color: colors.muted }]}>This category has no published bust, waist or hips ranges.</Text>
          )}
        </View>
      )}

      {a.past_event && (
        <Text style={[type.small, { color: colors.muted, marginTop: 10 }]}>
          This was a dated event and may already have passed. We keep it here so you can see how open calls are usually run, and watch for the next one.
        </Text>
      )}

      <Text style={[type.small, { color: colors.muted, marginTop: 10 }]}>
        <Text style={styles.strong}>How to apply.</Text> {a.how_to_apply}
      </Text>

      <Text style={[type.small, { marginTop: 10 }, m.fees.warn ? { color: colors.cobalt, ...weight('600') } : { color: colors.muted }]}>
        {m.fees.warn ? `Warning: ${m.fees.text}` : m.fees.text}
      </Text>

      <View style={[styles.tags, { marginTop: 14 }]}>
        {a.sources.map((src) => (
          <Pressable
            key={src.url}
            role="link"
            accessibilityLabel={`Source: ${src.kind.replace(/_/g, ' ')}${src.found_on ? `, found ${src.found_on}` : ''}. Opens ${new URL(src.url).hostname}`}
            onPress={() => Linking.openURL(src.url)}>
            <Tag label={`Source: ${src.kind.replace(/_/g, ' ')} · ${new URL(src.url).hostname.replace(/^www\./, '')}`} />
          </Pressable>
        ))}
        <View accessible accessibilityLabel={m.freshness.text}>
          <Tag label={freshTag} dashed={m.freshness.stale} />
        </View>
      </View>
      <Text style={[type.fine, { color: colors.muted, marginTop: 10 }]}>{`Confidence: ${a.confidence}`}</Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  note: { color: colors.muted, marginTop: 10, lineHeight: 22 },
  strong: { ...weight('600'), color: colors.carbon },
  // The pill drops under a long name instead of squeezing it.
  head: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 },
  name: { flexGrow: 1, flexShrink: 1, flexBasis: 180 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});
