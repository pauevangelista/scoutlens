import { Redirect, router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { measurementFields, rubric } from '@/scoring/rubric';
import { useSubmission } from '@/state/submission';
import { Button, Field, H1, H2, Lede, Screen, StepBar } from '@/ui/components';
import { goBack } from '@/ui/nav';
import { colors, type } from '@/ui/theme';

/**
 * 8 Your details. Height, age and city for agency matching; optional measurements for the model card.
 * There is no weight field and no BMI.
 */
export default function Details() {
  const s = useSubmission();
  if (!s.consented) return <Redirect href="/consent" />;

  const height = measurementFields.find((f) => f.id === 'height');
  const optional = measurementFields.filter((f) => f.id !== 'height');

  return (
    <Screen footer={<Button label="Continue" onPress={() => router.push('/photos')} />}>
      <StepBar step={4} onBack={() => goBack('/experience')} />
      <H1 style={{ marginTop: 40 }}>Your details</H1>
      <Lede>Agencies ask for these. We never ask for your weight.</Lede>

      <View style={[styles.grid, { marginTop: 26 }]}>
        {height && (
          <Field
            style={styles.half}
            label={`${height.label} (${height.unit})`}
            inputMode="decimal"
            value={s.measurements.height ?? ''}
            onChangeText={(v) => s.setMeasurement('height', v)}
          />
        )}
        <Field style={styles.half} label={rubric.modelCard.age.label} inputMode="numeric" value={s.age} onChangeText={s.setAge} />
        <Field style={styles.full} label="City or country" autoComplete="off" value={s.city} onChangeText={s.setCity} />
      </View>

      <View style={styles.sectionHead}>
        <H2>Measurements</H2>
        <Text style={[type.caption, { color: colors.muted }]}>Optional</Text>
      </View>
      <Text style={[type.small, { color: colors.muted, marginTop: 6 }]}>For your model card. We only show them back to you.</Text>

      <View style={[styles.grid, { marginTop: 16 }]}>
        {optional.map((f) => (
          <Field
            key={f.id}
            style={styles.half}
            label={`${f.label} (${f.unit})`}
            inputMode="decimal"
            placeholder={f.id === 'shoe' ? 'e.g. 40' : undefined}
            value={s.measurements[f.id] ?? ''}
            onChangeText={(v) => s.setMeasurement(f.id, v)}
          />
        ))}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', columnGap: 12, rowGap: 16 },
  half: { flexBasis: '40%', flexGrow: 1 },
  full: { flexBasis: '100%' },
  sectionHead: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginTop: 32 },
});
