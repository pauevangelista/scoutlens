// Module hooks so Node's built-in test runner can load the app's TypeScript the way Metro does:
// resolves the '@/' alias, extensionless relative imports, and JSON imports (rubric.json).
// Node strips the TypeScript types itself (Node 22.18+ / 23.6+), so no extra packages are needed.
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const SRC = new URL('../src/', import.meta.url);

export async function resolve(specifier, context, nextResolve) {
  let spec = specifier;
  if (spec.startsWith('@/')) spec = new URL(spec.slice(2), SRC).href;
  if ((spec.startsWith('.') || spec.startsWith('file:')) && !/\.[cm]?[jt]sx?$|\.json$/.test(spec)) {
    const url = new URL(spec, context.parentURL);
    if (existsSync(fileURLToPath(url) + '.ts')) spec = url.href + '.ts';
  }
  return nextResolve(spec, context);
}

export async function load(url, context, nextLoad) {
  if (url.endsWith('.json')) return nextLoad(url, { ...context, importAttributes: { type: 'json' } });
  return nextLoad(url, context);
}
