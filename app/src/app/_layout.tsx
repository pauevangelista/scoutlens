import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { SubmissionProvider } from '@/state/submission';

export default function RootLayout() {
  return (
    <SubmissionProvider>
      <StatusBar style="auto" />
      <Stack screenOptions={{ headerShown: false, title: 'ScoutLens' }} />
    </SubmissionProvider>
  );
}
