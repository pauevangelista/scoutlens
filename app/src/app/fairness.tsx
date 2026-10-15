import { Redirect } from 'expo-router';
import { Text, View } from 'react-native';

import { useSubmission } from '@/state/submission';
import { BackButton, Button, Chip, H1, Lede, Screen, TipPanel } from '@/ui/components';
import { goBack } from '@/ui/nav';
import { colors, type } from '@/ui/theme';

const GENDERS = ['Woman', 'Man', 'Non-binary', 'Another description'];
const AGE_BANDS = ['18 to 21', '22 to 25', '26 to 30', '31 or older'];

/**
 * Optional fairness questions. Kept apart from the submission: never passed to feedback or matching,
 * only used by the study to check that feedback is identical across groups.
 */
export default function Fairness() {
  const s = useSubmission();
  if (!s.consented) return <Redirect href="/consent" />;
  const g = s.groupAttributes;

  return (
    <Screen footer={<Button label="Done" onPress={() => goBack('/photos')} />}>
      <BackButton onPress={() => goBack('/photos')} />
      <H1 style={{ marginTop: 40 }}>Help check ScoutLens is fair</H1>
      <Lede>Optional. Your answers are only used to check that everyone gets the same feedback for the same photos.</Lede>
      <TipPanel lead="Never used for your notes.">These answers don&apos;t change your feedback or which agencies match.</TipPanel>

      <Group label="Gender" options={GENDERS} value={g.gender} onChange={(gender) => s.setGroupAttributes({ ...g, gender })} />
      <Group label="Age band" options={AGE_BANDS} value={g.ageBand} onChange={(ageBand) => s.setGroupAttributes({ ...g, ageBand })} />
    </Screen>
  );
}

function Group({ label, options, value, onChange }: {
  label: string;
  options: string[];
  value: string | null;
  onChange: (v: string | null) => void;
}) {
  return (
    <View style={{ marginTop: 28 }}>
      <Text style={[type.label, { color: colors.carbon }]}>{label}</Text>
      <View role="radiogroup" accessibilityLabel={label} style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
        <Chip label="Prefer not to say" selected={value === null} onPress={() => onChange(null)} />
        {options.map((o) => (
          <Chip key={o} label={o} selected={value === o} onPress={() => onChange(o)} />
        ))}
      </View>
    </View>
  );
}
