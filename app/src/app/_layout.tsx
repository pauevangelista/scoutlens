import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { SubmissionProvider } from '@/state/submission';
import { installFocusRing } from '@/ui/focus-ring';
import { colors } from '@/ui/theme';

installFocusRing();

export default function RootLayout() {
  return (
    <SubmissionProvider>
      <StatusBar style="auto" />
      {/* No transition animation: the design only shows motion on "reading your photos". */}
      <Stack screenOptions={{ headerShown: false, title: 'ScoutLens', animation: 'none', contentStyle: { backgroundColor: colors.ice } }} />
    </SubmissionProvider>
  );
}
