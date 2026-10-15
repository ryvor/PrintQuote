import fs from 'node:fs';
const pkg = JSON.parse(fs.readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const api = JSON.parse(fs.readFileSync(new URL('../server/package.json', import.meta.url), 'utf8'));
const changelog = fs.readFileSync(new URL('../CHANGELOG.md', import.meta.url), 'utf8');
const tag = process.env.RELEASE_TAG || process.env.GITHUB_REF_NAME;
if (!/^\d+\.\d+\.\d+$/.test(pkg.version)) throw new Error('package.json must contain an X.Y.Z version');
if (api.version !== pkg.version) throw new Error(`API version ${api.version} differs from ${pkg.version}`);
if (!changelog.split('\n').some(line => line.startsWith(`## [${pkg.version}]`))) {
  throw new Error(`CHANGELOG.md is missing ## [${pkg.version}]`);
}
if (tag && /^v\d/.test(tag) && tag !== `v${pkg.version}`) throw new Error(`Tag ${tag} does not match package version v${pkg.version}`);
console.log(`Release metadata verified: v${pkg.version}`);
