import { router } from 'expo-router';
import { Text, View } from 'react-native';

import { CONSENT_STATEMENTS, useSubmission } from '@/state/submission';
import { Button, Card, Checkbox, H1, Lede, Screen, StepBar } from '@/ui/components';
import { goBack } from '@/ui/nav';
import { colors, type, weight } from '@/ui/theme';

/** 5 Consent. The gate: nothing proceeds until all three statements are ticked. */
export default function Consent() {
  const { consentChecks, setConsentCheck, consented } = useSubmission();

  return (
    <Screen footer={<Button label="Continue" disabled={!consented} onPress={() => router.push('/aim')} />}>
      <StepBar step={1} onBack={() => goBack({ pathname: '/intro', params: { step: '3' } })} />
      <H1 style={{ marginTop: 40 }}>Before we start</H1>
      <Lede>Three quick confirmations, so you know exactly what this is.</Lede>

      <Card style={{ marginTop: 28, paddingVertical: 4 }}>
        {CONSENT_STATEMENTS.map((label, i) => (
          <View key={label} style={i > 0 ? { borderTopWidth: 1, borderTopColor: colors.soft } : undefined}>
            <Checkbox label={label} strong={i === 0} checked={consentChecks[i]} onChange={(v) => setConsentCheck(i, v)} />
          </View>
        ))}
      </Card>

      <Text style={[type.caption, { color: colors.muted, marginTop: 20, lineHeight: 22 }]}>
        <Text style={[weight('600'), { color: colors.carbon }]}>Later, one optional question.</Text> If you share your gender or age band, it is
        only used to check that ScoutLens treats everyone the same. It never changes your feedback.
      </Text>
    </Screen>
  );
}
