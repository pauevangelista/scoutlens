import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';

import { GUIDE } from '@/feedback/guide';
import { Actions, Button, H1, H2, Lede, Panel, Screen, styles as ui } from '@/ui/components';
import { useColors } from '@/ui/theme';

/** "How to take digitals". Tips link here with ?section=<id>, and the page scrolls to that section. */
export default function Digitals() {
  const c = useColors();
  const { section } = useLocalSearchParams<{ section?: string }>();
  const scrollRef = useRef<ScrollView>(null);
  const [stackY, setStackY] = useState<number | null>(null);
  const [sectionY, setSectionY] = useState<Record<string, number>>({});

  const target = section && GUIDE.some((g) => g.id === section) ? section : null;
  const targetY = target ? sectionY[target] : undefined;

  useEffect(() => {
    if (stackY !== null && targetY !== undefined) scrollRef.current?.scrollTo({ y: stackY + targetY - 12, animated: false });
  }, [stackY, targetY]);

  return (
    <Screen scrollRef={scrollRef} onStackLayout={setStackY}>
      <View>
        <H1>How to take digitals</H1>
        <Lede style={{ marginTop: 12 }}>
          Digitals (or polaroids) are simple, unedited photos agencies use to see you as you are. You only need a phone, a window and a plain wall.
        </Lede>
      </View>

      {GUIDE.map((g) => {
        const current = g.id === target;
        return (
          <View key={g.id} nativeID={`guide-${g.id}`} onLayout={(e) => setSectionY((p) => ({ ...p, [g.id]: e.nativeEvent.layout.y }))}>
            <Panel style={current ? { borderColor: c.accent, borderWidth: 2 } : undefined}>
              <H2>{g.title}</H2>
              <Text style={[ui.body, { color: c.muted, marginTop: 8 }]}>{g.intro}</Text>
              <View role="list" style={{ marginTop: 12, gap: 8 }}>
                {g.steps.map((step) => (
                  <View key={step} role="listitem" style={{ flexDirection: 'row', gap: 10 }}>
                    <Text style={[ui.body, { color: c.accent }]}>•</Text>
                    <Text style={[ui.body, { color: c.ink, flex: 1 }]}>{step}</Text>
                  </View>
                ))}
              </View>
            </Panel>
          </View>
        );
      })}

      <Actions>
        <Button label="Back" onPress={() => (router.canGoBack() ? router.back() : router.replace('/feedback'))} />
      </Actions>
    </Screen>
  );
}
