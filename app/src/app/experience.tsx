import { Redirect, router } from 'expo-router';

import { EXPERIENCE_OPTIONS } from '@/onboarding/answers';
import { useSubmission } from '@/state/submission';
import { Button, H1, Lede, OptionGroup, OptionRow, Screen, StepBar } from '@/ui/components';
import { goBack } from '@/ui/nav';

/** 7 Experience. Compared only with what agencies publish (open calls vs portfolio submissions). */
export default function ExperienceScreen() {
  const s = useSubmission();
  if (!s.consented) return <Redirect href="/consent" />;

  return (
    <Screen footer={<Button label="Continue" disabled={!s.experience} onPress={() => router.push('/details')} />}>
      <StepBar step={3} onBack={() => goBack('/aim')} />
      <H1 style={{ marginTop: 40 }}>How much experience do you have?</H1>
      <Lede>Some agencies run open calls for new faces, others want a portfolio.</Lede>
      <OptionGroup label="How much experience do you have?">
        {EXPERIENCE_OPTIONS.map((o) => (
          <OptionRow key={o.id} title={o.label} subtitle={o.hint} selected={s.experience === o.id} onPress={() => s.setExperience(o.id)} />
        ))}
      </OptionGroup>
    </Screen>
  );
}
