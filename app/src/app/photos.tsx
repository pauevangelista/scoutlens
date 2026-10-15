import * as ImagePicker from 'expo-image-picker';
import { Redirect, router } from 'expo-router';
import { useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { measurePhoto } from '@/photo/measure';
import { slotCopy } from '@/scoring/photo-slots';
import { requiredPhotos } from '@/scoring/rubric';
import { useSubmission } from '@/state/submission';
import { Button, Card, CropMarks, H1, Lede, PlusIcon, Screen, StepBar, TextButton, TipPanel } from '@/ui/components';
import { goBack } from '@/ui/nav';
import { colors, radii, type } from '@/ui/theme';

/** 9 Your digitals. Photos stay on the device; each one is measured locally when it is added. */
export default function Photos() {
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

  function getNotes() {
    if (!requiredPhotos.some((id) => s.photos[id])) {
      setError('Add at least one photo to get your notes.');
      return;
    }
    setError('');
    router.push('/reading');
  }

  return (
    <Screen
      footer={
        <>
          {error ? (
            <Text role="alert" aria-live="assertive" style={[type.bodyStrong, { color: colors.cobalt }]}>
              {error}
            </Text>
          ) : null}
          <Button variant="accent" label="Get my notes" onPress={getNotes} />
        </>
      }>
      <StepBar step={5} onBack={() => goBack('/details')} />
      <H1 style={{ marginTop: 40 }}>Your digitals</H1>
      <Lede>Natural light, a plain wall, no filters. Wear the same simple outfit in all three.</Lede>

      <View style={styles.grid}>
        {requiredPhotos.map((id) => {
          const copy = slotCopy(id);
          const photo = s.photos[id];
          return (
            <View key={id} style={{ flex: 1 }}>
              <Pressable
                role="button"
                accessibilityLabel={photo ? `Replace ${copy.name.toLowerCase()} photo` : `Add ${copy.name.toLowerCase()} photo`}
                onPress={() => pick(id)}
                style={({ pressed }) => [photo ? styles.filled : styles.empty, { opacity: pressed ? 0.85 : 1 }]}>
                {photo ? (
                  <>
                    <Image source={{ uri: photo.uri }} style={StyleSheet.absoluteFill} resizeMode="cover" accessibilityLabel={`${copy.name} preview`} />
                    <CropMarks color={colors.white} />
                  </>
                ) : (
                  <>
                    <PlusIcon />
                    <Text style={[type.pill, { color: colors.carbon }]}>Add photo</Text>
                  </>
                )}
              </Pressable>
              <Text style={[type.label, { color: colors.carbon, marginTop: 8 }]}>{copy.name}</Text>
              {photo ? (
                <TextButton label="Remove" accessibilityLabel={`Remove ${copy.name.toLowerCase()} photo`} onPress={() => s.setPhoto(id, undefined)} />
              ) : (
                <Text style={[type.fine, { color: colors.muted, marginTop: 2 }]}>{copy.short}</Text>
              )}
            </View>
          );
        })}
      </View>

      <TipPanel
        lead="Not sure how to shoot these?"
        style={styles.help}
        after={<TextButton tone="accent" label="Read the digitals guide" onPress={() => router.push({ pathname: '/digitals', params: { section: 'shots' } })} />}>
        Stand a step away from a plain wall, face a window, and ask a friend to hold the phone at chest height.
      </TipPanel>

      <Card style={styles.fair}>
        <Text style={[type.small, { color: colors.carbon, flex: 1 }]}>
          <Text style={type.smallStrong}>Help check ScoutLens is fair</Text>
          {'\n'}
          <Text style={{ color: colors.muted }}>Optional. Never changes your feedback.</Text>
        </Text>
        <Button small variant="outline" label="Answer" accessibilityLabel="Answer the optional fairness questions" onPress={() => router.push('/fairness')} />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', gap: 12, marginTop: 26 },
  filled: { aspectRatio: 3 / 4, borderRadius: radii.photo, backgroundColor: colors.photoPlaceholder, overflow: 'hidden' },
  empty: {
    aspectRatio: 3 / 4,
    borderRadius: radii.photo,
    backgroundColor: colors.white,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: colors.mutedOnDark,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  help: { marginTop: 24, borderRadius: radii.card, paddingVertical: 18, paddingHorizontal: 20 },
  fair: { marginTop: 16, flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 16 },
});
