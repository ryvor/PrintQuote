import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
test('release metadata matches and changelog entry exists', () => {
  const result = execFileSync(process.execPath, ['scripts/check-release.mjs'], { cwd: root, encoding: 'utf8', env: { ...process.env, GITHUB_REF_NAME: '' } });
  assert.match(result, /verified/);
});
test('release notes are generated from changelog', () => {
  const notes = execFileSync(process.execPath, ['scripts/release-notes.mjs'], { cwd: root, encoding: 'utf8' });
  assert.match(notes, /PrintQuote v/);
  assert.match(notes, /CI & Release Hotfix/);
});
test('Docker release compose uses published images and persistent SQLite bind mount', () => {
  const compose = fs.readFileSync(path.join(root, 'docker-compose.release.yml'), 'utf8');
  assert.match(compose, /ghcr\.io\/ryvor\/printquote-web/);
  assert.match(compose, /ghcr\.io\/ryvor\/printquote-api/);
  assert.match(compose, /\/opt\/PrintQuote\/data:\/data/);
});

test('changelog parser accepts bracketed and unbracketed version headings', () => {
  const pattern = /^##\s+\[?v?(\d+\.\d+\.\d+)\]?(?=\s|$)/;
  for (const line of ['## 2.4.3 — Hotfix', '## [2.4.3] — Hotfix', '## v2.4.3']) {
    assert.equal(pattern.exec(line)?.[1], '2.4.3');
  }
  assert.equal(pattern.exec('## 2.4.30 — Different')?.[1], '2.4.30');
});
