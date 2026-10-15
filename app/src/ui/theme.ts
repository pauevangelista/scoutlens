// Colours from the prototype, light and dark.
import { useColorScheme } from 'react-native';

const light = {
  bg: '#EEF1F3',
  surface: '#FFFFFF',
  ink: '#1B2430',
  muted: '#55606C',
  line: '#CDD4D9',
  accent: '#0B6B77',
  accentInk: '#FFFFFF',
  accentSoft: '#D9EDEF',
  warn: '#8A5A00',
  warnSoft: '#FBEFD6',
  err: '#A12B2B',
};

const dark: typeof light = {
  bg: '#12181F',
  surface: '#1B232C',
  ink: '#E8EDF1',
  muted: '#A2ADB8',
  line: '#38434E',
  accent: '#4FC3CF',
  accentInk: '#0B1A1D',
  accentSoft: '#17383C',
  warn: '#F0C36A',
  warnSoft: '#3A2E12',
  err: '#FF9C9C',
};

export type Colors = typeof light;

export function useColors(): Colors {
  return useColorScheme() === 'dark' ? dark : light;
}
