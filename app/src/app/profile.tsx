import * as ImagePicker from 'expo-image-picker';
import { Link, Redirect, router } from 'expo-router';
import { useState } from 'react';
import { Image, Pressable, StyleSheet, Text, TextInput, useWindowDimensions, View } from 'react-native';

import { measurePhoto } from '@/photo/measure';
import { slotCopy } from '@/scoring/photo-slots';
import { experienceLevels, measurementFields, requiredPhotos, rubric } from '@/scoring/rubric';
import { useSubmission } from '@/state/submission';
import { Actions, Button, ChoiceGroup, H2, Lede, Note, Panel, Screen, styles as ui } from '@/ui/components';
import { useColors, type Colors } from '@/ui/theme';

const GENDERS = ['Woman', 'Man', 'Non-binary', 'Another description'];
const AGE_BANDS = ['18 to 21', '22 to 25', '26 to 30', '31 or older'];

export default function Profile() {
  const c = useColors();
  const { width } = useWindowDimensions();
  const s = useSubmission();
  const [error, setError] = useState('');

  if (!s.consented) return <Redirect href="/consent" />;

  async function pick(slot: string) {
    setError('');
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 1 });
    if (result.canceled || !result.assets?.[0]) return;
    const asset = result.assets[0];
    try {
      if (!asset.width || !asset.height) throw new Error('no size');
      const analysis = await measurePhoto(asset.uri);
      s.setPhoto(slot, { uri: asset.uri, shortSidePx: Math.min(asset.width, asset.height), analysis });
    } catch {
      setError("We couldn't read that file. Use a JPG or PNG photo.");
    }
  }

  function seeFeedback() {
    if (!requiredPhotos.some((id) => s.photos[id])) {
      setError('Add at least one photo to get feedback.');
      return;
    }
    setError('');
    router.push('/feedback');
  }

  const ageField = rubric.modelCard.age;
  const experienceLabel = experienceLevels.find((l) => l.id === s.experience)?.label ?? null;

  const narrow = width < 680;
  const twoCols = width >= 520;

  return (
    <Screen step={1}>
      <H2>Add your photos</H2>
      <Lede style={{ marginTop: -12 }}>Use natural light, a plain background and no filters or retouching.</Lede>
      <View style={{ flexDirection: narrow ? 'column' : 'row', gap: 16 }}>
        {requiredPhotos.map((id) => {
          const copy = slotCopy(id);
          const photo = s.photos[id];
          return (
            <View key={id} style={{ flex: narrow ? undefined : 1 }}>
              <View>
                <Pressable
                  role="button"
                  accessibilityLabel={photo ? `Replace ${copy.name} photo` : `Add ${copy.name} photo`}
                  onPress={() => pick(id)}
                  style={[local.frame, { backgroundColor: c.surface, borderColor: c.line }]}>
                  {photo ? (
                    <Image source={{ uri: photo.uri }} style={StyleSheet.absoluteFill} resizeMode="cover" accessibilityLabel={`${copy.name} preview`} />
                  ) : (
                    <View style={local.empty}>
                      <Text style={[ui.h3, { color: c.ink }]}>{copy.name}</Text>
                      <Text style={[ui.small, { color: c.muted }]}>Tap to add a photo</Text>
                    </View>
                  )}
                  <CropMarks color={photo ? '#FFFFFF' : c.ink} />
                </Pressable>
                {photo && (
                  <Button
                    label="Remove"
                    variant="secondary"
                    onPress={() => s.setPhoto(id, undefined)}
                    style={[local.remove, { backgroundColor: c.surface }]}
                  />
                )}
              </View>
              {copy.tip ? <Text style={[ui.small, { color: c.muted, marginTop: 8 }]}>{copy.tip}</Text> : null}
            </View>
          );
        })}
      </View>

      <H2 style={{ marginTop: 16 }}>Your model card</H2>
      <Lede style={{ marginTop: -12 }}>
        Agencies ask for these details with your digitals. We never ask for your weight.{' '}
        <Link href={{ pathname: '/digitals', params: { section: 'measuring' } }} style={{ color: c.accent, textDecorationLine: 'underline' }}>
          How to measure yourself
        </Link>
      </Lede>
      <Panel style={{ gap: 20 }}>
        <View style={local.grid}>
          {measurementFields.map((f) => (
            <View key={f.id} style={{ width: twoCols ? '48%' : '100%', flexGrow: 1 }}>
              <Text style={[ui.label, { color: c.ink }]}>{`${f.label} (${f.unit})`}</Text>
              <TextInput
                accessibilityLabel={`${f.label} (${f.unit})`}
                inputMode="decimal"
                keyboardType="decimal-pad"
                value={s.measurements[f.id] ?? ''}
                onChangeText={(v) => s.setMeasurement(f.id, v)}
                style={inputStyle(c)}
              />
            </View>
          ))}
          <View style={{ width: twoCols ? '48%' : '100%', flexGrow: 1 }}>
            <Text style={[ui.label, { color: c.ink }]}>{`${ageField.label} (${ageField.unit})`}</Text>
            <TextInput
              accessibilityLabel={`${ageField.label} (${ageField.unit})`}
              inputMode="numeric"
              keyboardType="number-pad"
              value={s.age}
              onChangeText={s.setAge}
              style={inputStyle(c)}
            />
          </View>
        </View>
        <ChoiceGroup
          label="Experience"
          emptyLabel="Not chosen"
          options={experienceLevels.map((l) => l.label)}
          value={experienceLabel}
          onChange={(label) => s.setExperience(experienceLevels.find((l) => l.label === label)?.id ?? null)}
        />
        <Note>
          Division: each agency uses its own categories, so you choose a division for each agency on the agencies screen.
        </Note>
      </Panel>

      <H2 style={{ marginTop: 16 }}>Help us test for fairness (optional)</H2>
      <Panel style={{ gap: 20 }}>
        <Note>
          These answers are never used for your feedback or agency matches. They let the study check that feedback doesn&apos;t differ between groups.
        </Note>
        <ChoiceGroup
          label="Gender"
          emptyLabel="Prefer not to say"
          options={GENDERS}
          value={s.groupAttributes.gender}
          onChange={(gender) => s.setGroupAttributes({ ...s.groupAttributes, gender })}
        />
        <ChoiceGroup
          label="Age band"
          emptyLabel="Prefer not to say"
          options={AGE_BANDS}
          value={s.groupAttributes.ageBand}
          onChange={(ageBand) => s.setGroupAttributes({ ...s.groupAttributes, ageBand })}
        />
      </Panel>

      <Text role="alert" aria-live="assertive" style={[local.error, { color: c.err }]}>
        {error}
      </Text>
      <Actions>
        <Button label="See my feedback" onPress={seeFeedback} />
        <Button
          label="Back"
          variant="secondary"
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/consent'))}
        />
      </Actions>
    </Screen>
  );
}

function CropMarks({ color }: { color: string }) {
  const t = 2;
  const l = 16;
  const corners = [
    { top: 0, left: 0 },
    { top: 0, right: 0 },
    { bottom: 0, left: 0 },
    { bottom: 0, right: 0 },
  ];
  return (
    <View pointerEvents="none" style={local.marks}>
      {corners.map((pos, i) => (
        <View key={i} style={[local.corner, pos]}>
          <View style={{ position: 'absolute', ...pos, width: l, height: t, backgroundColor: color }} />
          <View style={{ position: 'absolute', ...pos, width: t, height: l, backgroundColor: color }} />
        </View>
      ))}
    </View>
  );
}

function inputStyle(c: Colors) {
  return {
    fontSize: 16,
    minHeight: 44,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderRadius: 6,
    borderColor: c.line,
    backgroundColor: c.bg,
    color: c.ink,
  };
}

const local = StyleSheet.create({
  frame: { aspectRatio: 3 / 4, borderWidth: 1, overflow: 'hidden' },
  empty: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 6 },
  marks: { position: 'absolute', top: 8, left: 8, right: 8, bottom: 8 },
  corner: { position: 'absolute', width: 16, height: 16 },
  remove: { position: 'absolute', right: 12, bottom: 12, minHeight: 36, paddingVertical: 4, paddingHorizontal: 12 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
  error: { fontWeight: '600', minHeight: 22, fontSize: 16 },
});
