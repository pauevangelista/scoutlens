import { Redirect, router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Animated, Easing, Image, Platform, StyleSheet, Text, View } from 'react-native';

import { requiredPhotos } from '@/scoring/rubric';
import { useSubmission } from '@/state/submission';
import { Brand, Button, CropMarks, Lede, Screen } from '@/ui/components';
import { useReducedMotion } from '@/ui/motion';
import { colors, radii, type } from '@/ui/theme';

const FRAME = { width: 250, height: 334, inset: 14 };
const SWEEP_MS = 2600;

/** 10 Reading your photos. A short moment; the checks already ran on the device when each photo was added. */
export default function Reading() {
  const s = useSubmission();
  const first = requiredPhotos.map((id) => s.photos[id]).find(Boolean);

  if (!s.consented) return <Redirect href="/consent" />;
  if (!first) return <Redirect href="/photos" />;

  return (
    <Screen tone="dark" footer={<Button variant="light" label="See my notes" onPress={() => router.push('/notes')} />}>
      <Brand tone="dark" large />
      <View style={styles.frame}>
        <Image source={{ uri: first.uri }} style={StyleSheet.absoluteFill} resizeMode="cover" accessibilityLabel="Your photo" />
        <CropMarks color={colors.white} inset={FRAME.inset} length={16} thickness={2} opacity={0.55} />
        <ScanLine />
      </View>
      <Text role="heading" aria-level={1} style={[type.moment, styles.center, { color: colors.white, marginTop: 40 }]}>
        Reading your photos
      </Text>
      <Lede tone="dark" style={[type.body, styles.center, { maxWidth: 290 }]}>
        Checking light, focus and framing, and your details. Everything stays on your device.
      </Lede>
    </Screen>
  );
}

/** The only ambient motion in the app. Stands still at the middle when reduced motion is on. */
function ScanLine() {
  const reduced = useReducedMotion();
  const travel = FRAME.height * 0.84;
  const [y] = useState(() => new Animated.Value(travel / 2));

  useEffect(() => {
    if (reduced) {
      y.setValue(travel / 2);
      return;
    }
    y.setValue(0);
    const ease = Easing.inOut(Easing.ease);
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(y, { toValue: travel, duration: SWEEP_MS / 2, easing: ease, useNativeDriver: Platform.OS !== 'web' }),
        Animated.timing(y, { toValue: 0, duration: SWEEP_MS / 2, easing: ease, useNativeDriver: Platform.OS !== 'web' }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [reduced, travel, y]);

  return <Animated.View aria-hidden style={[styles.scan, { transform: [{ translateY: y }] }]} />;
}

const styles = StyleSheet.create({
  frame: {
    alignSelf: 'center',
    marginTop: 56,
    width: FRAME.width,
    height: FRAME.height,
    borderRadius: radii.hero,
    backgroundColor: colors.carbonSurface,
    overflow: 'hidden',
  },
  scan: { position: 'absolute', left: FRAME.inset, right: FRAME.inset, top: FRAME.height * 0.06, height: 2, backgroundColor: colors.cobalt },
  center: { textAlign: 'center', alignSelf: 'center' },
});
