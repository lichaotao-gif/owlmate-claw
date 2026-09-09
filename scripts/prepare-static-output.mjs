import { existsSync } from 'node:fs';
import { readdir, rename, rm } from 'node:fs/promises';
import path from 'node:path';

const outputRoot = path.resolve('dist/client');
const configuredBasePath = process.env.PUBLIC_BASE_PATH?.trim() ?? '';
const segments = configuredBasePath.split('/').filter(Boolean);

if (segments.length > 0) {
  const nestedProjectRoot = path.join(outputRoot, ...segments);
  const nestedAssets = path.join(nestedProjectRoot, '_next');
  const rootAssets = path.join(outputRoot, '_next');

  if (!existsSync(nestedAssets)) {
    throw new Error(`Expected static assets at ${nestedAssets}`);
  }

  await rm(rootAssets, { recursive: true, force: true });
  await rename(nestedAssets, rootAssets);

  let directory = nestedProjectRoot;
  while (directory !== outputRoot && (await readdir(directory)).length === 0) {
    await rm(directory, { recursive: true });
    directory = path.dirname(directory);
  }
}
