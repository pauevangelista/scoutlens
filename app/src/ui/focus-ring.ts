// Visible keyboard focus on the web: a 3 px cobalt ring, or the lighter ring on dark screens.
import { Platform } from 'react-native';

import { colors } from './theme';

const FOCUSABLE = '[role="button"],[role="link"],[role="radio"],[role="checkbox"],a,input,textarea';

export function installFocusRing() {
  if (Platform.OS !== 'web' || typeof document === 'undefined' || document.getElementById('focus-ring')) return;
  const style = document.createElement('style');
  style.id = 'focus-ring';
  style.textContent = `
    :is(${FOCUSABLE}):focus-visible { outline: 3px solid ${colors.cobalt}; outline-offset: 2px; }
    [data-tone="dark"] :is(${FOCUSABLE}):focus-visible { outline-color: ${colors.focusOnDark}; }
  `;
  document.head.appendChild(style);
}
