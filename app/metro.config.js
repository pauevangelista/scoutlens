// Lets the app import ../rubric.json from the repo root, so the rubric has a single source of truth.
const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

const projectRoot = __dirname;
const repoRoot = path.resolve(projectRoot, '..');

const config = getDefaultConfig(projectRoot);
config.watchFolders = [...(config.watchFolders ?? []), repoRoot];

module.exports = config;
