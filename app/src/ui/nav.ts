import { router, type Href } from 'expo-router';

/** Back if there is somewhere to go back to (e.g. after a page reload there is not), otherwise to `fallback`. */
export function goBack(fallback: Href) {
  if (router.canGoBack()) router.back();
  else router.replace(fallback);
}
