import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

test('frontend Dockerfile does not run root postinstall before copying server', () => {
  const dockerfile = fs.readFileSync(new URL('../Dockerfile', import.meta.url), 'utf8');
  assert.match(dockerfile, /RUN\s+npm install\s+--ignore-scripts/);
  assert.match(dockerfile, /RUN\s+npm run build/);
});

test('API image independently installs backend dependencies', () => {
  const dockerfile = fs.readFileSync(new URL('../server/Dockerfile', import.meta.url), 'utf8');
  assert.match(dockerfile, /RUN\s+cd server && npm install/);
});
