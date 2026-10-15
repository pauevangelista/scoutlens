import { Redirect, router } from 'expo-router';

import { AIMS } from '@/onboarding/answers';
import { useSubmission } from '@/state/submission';
import { Button, H1, Lede, OptionGroup, OptionRow, Screen, StepBar } from '@/ui/components';
import { goBack } from '@/ui/nav';

/** 6 Your aim. Orders agencies; never hides any. */
export default function AimScreen() {
  const s = useSubmission();
  if (!s.consented) return <Redirect href="/consent" />;

  return (
    <Screen footer={<Button label="Continue" disabled={!s.aim} onPress={() => router.push('/experience')} />}>
      <StepBar step={2} onBack={() => goBack('/consent')} />
      <H1 style={{ marginTop: 40 }}>What are you aiming for?</H1>
      <Lede>We show the best-fit agencies first. You can change this any time.</Lede>
      <OptionGroup label="What are you aiming for?">
        {AIMS.map((a) => (
          <OptionRow key={a.id} title={a.label} subtitle={a.hint} selected={s.aim === a.id} onPress={() => s.setAim(a.id)} />
        ))}
      </OptionGroup>
    </Screen>
  );
}
