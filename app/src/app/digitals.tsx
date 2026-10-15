import { useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';

import { GUIDE } from '@/feedback/guide';
import { BackButton, Button, Card, H1, H2, Lede, Screen } from '@/ui/components';
import { goBack } from '@/ui/nav';
import { colors, type } from '@/ui/theme';

/** "How to take digitals". Notes link here with ?section=<id>, and the page scrolls to that section. */
export default function Digitals() {
  const { section } = useLocalSearchParams<{ section?: string }>();
  const scrollRef = useRef<ScrollView>(null);
  const [contentY, setContentY] = useState<number | null>(null);
  const [listY, setListY] = useState<number | null>(null);
  const [sectionY, setSectionY] = useState<Record<string, number>>({});

  const target = section && GUIDE.some((g) => g.id === section) ? section : null;
  const targetY = target ? sectionY[target] : undefined;

  useEffect(() => {
    if (contentY !== null && listY !== null && targetY !== undefined) {
      scrollRef.current?.scrollTo({ y: contentY + listY + targetY - 12, animated: false });
    }
  }, [contentY, listY, targetY]);

  return (
    <Screen scrollRef={scrollRef} onContentLayout={setContentY} footer={<Button label="Back" onPress={() => goBack('/notes')} />}>
      <BackButton onPress={() => goBack('/notes')} />
      <H1 style={{ marginTop: 28 }}>How to take digitals</H1>
      <Lede>Digitals are simple, unedited photos agencies use to see you as you are. You only need a phone, a window and a plain wall.</Lede>

      <View style={{ gap: 12, marginTop: 26 }} onLayout={(e) => setListY(e.nativeEvent.layout.y)}>
        {GUIDE.map((g) => (
          <View key={g.id} nativeID={`guide-${g.id}`} onLayout={(e) => setSectionY((p) => ({ ...p, [g.id]: e.nativeEvent.layout.y }))}>
            <Card style={g.id === target ? { borderColor: colors.cobalt, borderWidth: 2, padding: 19 } : undefined}>
              <H2>{g.title}</H2>
              <Text style={[type.body, { color: colors.muted, marginTop: 8 }]}>{g.intro}</Text>
              <View role="list" style={{ marginTop: 12, gap: 8 }}>
                {g.steps.map((step) => (
                  <View key={step} role="listitem" style={{ flexDirection: 'row', gap: 10 }}>
                    <Text style={[type.body, { color: colors.cobalt }]}>•</Text>
                    <Text style={[type.body, { color: colors.carbon, flex: 1 }]}>{step}</Text>
                  </View>
                ))}
              </View>
            </Card>
          </View>
        ))}
      </View>
    </Screen>
  );
}
