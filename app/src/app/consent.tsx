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
      <H1>Get clear feedback on your digitals.</H1>
      <Lede>
        Add three standard photos and your model card. For each check you see what is good, what to improve and how, plus which agencies&apos; published requirements you match and why.
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
