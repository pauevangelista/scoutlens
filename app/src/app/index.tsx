import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { Brand, Button, CropMarks, Lede, Screen, Silhouette } from '@/ui/components';
import { colors, radii, type, weight } from '@/ui/theme';

/** 1 Welcome. Collects nothing. */
export default function Welcome() {
  return (
    <Screen
      tone="dark"
      footer={
        <>
          <Text style={[type.fine, { color: colors.mutedOnDark }]}>Your photos stay on your device while we test this first version.</Text>
          <Button variant="accent" label="Get started" onPress={() => router.push({ pathname: '/intro', params: { step: '1' } })} />
        </>
      }>
      <View style={styles.top}>
        <Brand tone="dark" large />
        <View style={styles.age}>
          <Text style={[type.fine, { color: colors.mutedOnDark, ...weight('500') }]}>18+</Text>
        </View>
      </View>

      <View style={styles.hero}>
        <Silhouette width={260} color={colors.white} opacity={0.1} />
        <CropMarks color={colors.white} inset={16} length={18} thickness={2} opacity={0.55} />
        <Text style={[type.tag, styles.caption]}>{'P1 Hero photo\nPortrait, window light, plain wall'}</Text>
      </View>

      <Text role="heading" aria-level={1} style={[type.hero, { color: colors.white, marginTop: 28, maxWidth: 340 }]}>
        Show them your best frame.
      </Text>
      <Lede tone="dark" style={{ ...type.body, maxWidth: 320 }}>
        Add your digitals. Get clear notes on what to fix, and see where to apply.
      </Lede>
    </Screen>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  age: { paddingVertical: 5, paddingHorizontal: 12, borderWidth: 1, borderColor: colors.neutralPillText, borderRadius: radii.pill },
  hero: { marginTop: 20, height: 408, borderRadius: radii.hero, backgroundColor: colors.carbonSurface, overflow: 'hidden' },
  caption: { position: 'absolute', left: 28, bottom: 26, color: colors.mutedOnDark, ...weight('400'), lineHeight: 17 },
});
