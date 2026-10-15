import { router } from 'expo-router';
import { View } from 'react-native';

import { CONSENT_STATEMENTS, useSubmission } from '@/state/submission';
import { Actions, Button, Checkbox, H1, Lede, Panel, Screen } from '@/ui/components';
import { useColors } from '@/ui/theme';

export default function Consent() {
  const c = useColors();
  const { consentChecks, setConsentCheck, consented } = useSubmission();

  return (
    <Screen step={0}>
      <H1>See exactly how your submission is scored.</H1>
      <Lede>
        Add three standard photos and your basic measurements. You get a score for each criterion, with the reason behind it and what to change.
      </Lede>
      <Panel style={{ paddingVertical: 8 }}>
        {CONSENT_STATEMENTS.map((label, i) => (
          <View key={label} style={i > 0 ? { borderTopWidth: 1, borderTopColor: c.line } : undefined}>
            <Checkbox label={label} checked={consentChecks[i]} onChange={(v) => setConsentCheck(i, v)} />
          </View>
        ))}
      </Panel>
      <Actions>
        <Button label="Continue to my profile" disabled={!consented} onPress={() => router.push('/profile')} />
      </Actions>
    </Screen>
  );
}
