const assert = require('node:assert/strict');
const { appendFileSync, readFileSync, writeFileSync } = require('node:fs');
const { tmpdir } = require('node:os');
const { join } = require('node:path');

function releaseMetadata(tag, version, changelog) {
  assert.equal(tag, `v${version}`, 'Release tag must match package.json version');
  const lines = changelog.split('\n');
  const start = lines.findIndex((line) => line.startsWith(`## [${version}]`));
  assert.ok(start >= 0, `Missing changelog section for ${version}`);
  const next = lines.findIndex((line, index) => index > start && line.startsWith('## ['));
  const notes = lines
    .slice(start + 1, next === -1 ? undefined : next)
    .join('\n')
    .trim();
  assert.ok(notes, 'Release notes must not be empty');
  const prerelease = version.includes('-');
  return { version, dist_tag: prerelease ? 'next' : 'latest', prerelease, notes };
}

if (process.argv[2] === '--self-test') {
  const notes = '### Changed\n\n- Requires Node.js 22+.';
  assert.deepEqual(
    releaseMetadata(
      'v2.0.0-rc.1',
      '2.0.0-rc.1',
      `## [2.0.0-rc.1]\n${notes}\n## [1.0.7]\nOld release`
    ),
    {
      version: '2.0.0-rc.1',
      dist_tag: 'next',
      prerelease: true,
      notes,
    }
  );
  assert.equal(releaseMetadata('v2.0.0', '2.0.0', `## [2.0.0]\n${notes}`).dist_tag, 'latest');
  assert.throws(() => releaseMetadata('v2.0.0', '1.0.7', ''), /must match/);
  assert.throws(() => releaseMetadata('v2.0.0', '2.0.0', '## [1.0.7]\nOld'), /Missing changelog/);
  assert.throws(
    () => releaseMetadata('v2.0.0', '2.0.0', '## [2.0.0]\n\n## [1.0.7]'),
    /must not be empty/
  );
  console.log('Release metadata checks passed.');
} else {
  const { version } = JSON.parse(readFileSync('package.json', 'utf8'));
  const release = releaseMetadata(process.argv[2], version, readFileSync('CHANGELOG.md', 'utf8'));
  const notesFile = join(tmpdir(), 'rule-engine-js-release-notes.md');
  writeFileSync(notesFile, release.notes + '\n');
  if (process.env.GITHUB_OUTPUT) {
    appendFileSync(
      process.env.GITHUB_OUTPUT,
      `version=${release.version}\ndist_tag=${release.dist_tag}\nprerelease=${release.prerelease}\nnotes_file=${notesFile}\n`
    );
  }
  console.log(`Validated ${release.version}; npm tag: ${release.dist_tag}`);
}
