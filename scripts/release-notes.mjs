import fs from 'node:fs';
const pkg = JSON.parse(fs.readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const changelog = fs.readFileSync(new URL('../CHANGELOG.md', import.meta.url), 'utf8');
const lines = changelog.split('\n');
const start = lines.findIndex(line => line.startsWith(`## [${pkg.version}]`));
if (start < 0) throw new Error(`No changelog entry for ${pkg.version}`);
const end = lines.findIndex((line, i) => i > start && line.startsWith('## ['));
const entry = lines.slice(start, end < 0 ? undefined : end).join('\n').trim();
const notes = `# PrintQuote v${pkg.version}\n\n${entry}\n\n` +
  `## Installation\n\nDocker images: \`ghcr.io/ryvor/printquote-web:v${pkg.version}\` and \`ghcr.io/ryvor/printquote-api:v${pkg.version}\`.\n` +
  `For source installations, see README.md. Back up your database before updating.\n`;
const out = process.argv[2];
if (out) fs.writeFileSync(out, notes); else process.stdout.write(notes);
