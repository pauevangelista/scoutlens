import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { SubmissionProvider } from '@/state/submission';
import { installFocusRing } from '@/ui/focus-ring';
import { colors, fontFiles } from '@/ui/theme';

installFocusRing();

export default function RootLayout() {
  // The font files ship inside the app bundle. If one fails to load, the fallback font is used instead.
  const [loaded, error] = useFonts(fontFiles);
  if (!loaded && !error) return null;

  return (
    <SubmissionProvider>
      <StatusBar style="auto" />
      {/* No transition animation: the design only shows motion on "reading your photos". */}
      <Stack screenOptions={{ headerShown: false, title: 'ScoutLens', animation: 'none', contentStyle: { backgroundColor: colors.ice } }} />
    </SubmissionProvider>
  );
}
