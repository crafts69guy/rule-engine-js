#!/usr/bin/env node

/**
 * Setup script for Husky Git hooks
 * Run with: npm run husky:setup
 */

import { execSync } from 'child_process';
import { writeFileSync, mkdirSync, existsSync, chmodSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = dirname(__dirname);

console.log('🐕 Setting up Husky Git hooks...\n');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function success(message) {
  log(`✅ ${message}`, 'green');
}

function warning(message) {
  log(`⚠️  ${message}`, 'yellow');
}

function error(message) {
  log(`❌ ${message}`, 'red');
}

function info(message) {
  log(`ℹ️  ${message}`, 'blue');
}

try {
  // 1. Install Husky
  info('Installing Husky...');
  execSync('npm install --save-dev husky', { cwd: projectRoot, stdio: 'inherit' });
  success('Husky installed');

  // 2. Initialize Husky
  info('Initializing Husky...');
  execSync('npx husky install', { cwd: projectRoot, stdio: 'inherit' });
  success('Husky initialized');

  // 3. Create .husky directory if it doesn't exist
  const huskyDir = join(projectRoot, '.husky');
  if (!existsSync(huskyDir)) {
    mkdirSync(huskyDir, { recursive: true });
  }

  // 4. Create pre-commit hook
  info('Creating pre-commit hook...');
  const preCommitContent = `#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

# Run the comprehensive pre-commit script
npm run pre-commit
`;

  const preCommitPath = join(huskyDir, 'pre-commit');
  writeFileSync(preCommitPath, preCommitContent);
  chmodSync(preCommitPath, 0o755);
  success('Pre-commit hook created');

  // 5. Create commit-msg hook
  info('Creating commit-msg hook...');
  const commitMsgContent = `#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

# Validate commit message format
node scripts/validate-commit-msg.js $1
`;

  const commitMsgPath = join(huskyDir, 'commit-msg');
  writeFileSync(commitMsgPath, commitMsgContent);
  chmodSync(commitMsgPath, 0o755);
  success('Commit-msg hook created');

  // 6. Create pre-push hook
  info('Creating pre-push hook...');
  const prePushContent = `#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

# Run comprehensive pre-push checks
npm run pre-push
`;

  const prePushPath = join(huskyDir, 'pre-push');
  writeFileSync(prePushPath, prePushContent);
  chmodSync(prePushPath, 0o755);
  success('Pre-push hook created');

  // 7. Install additional dependencies
  info('Installing additional dependencies...');
  const devDeps = ['lint-staged', '@commitlint/cli', '@commitlint/config-conventional'];

  try {
    execSync(`npm install --save-dev ${devDeps.join(' ')}`, {
      cwd: projectRoot,
      stdio: 'inherit',
    });
    success('Additional dependencies installed');
  } catch (err) {
    console.error(err.message);
    warning('Some optional dependencies may not have installed correctly');
  }

  // 8. Create commit message validator
  info('Creating commit message validator...');
  const validatorContent = `#!/usr/bin/env node

/**
 * Simple commit message validator
 */

import { readFileSync } from 'fs';

const commitMsgFile = process.argv[2];
const commitMsg = readFileSync(commitMsgFile, 'utf8').trim();

// Skip merge and revert commits
if (commitMsg.startsWith('Merge') || commitMsg.startsWith('Revert')) {
  process.exit(0);
}

const firstLine = commitMsg.split('\\n')[0];

// Basic validation
if (firstLine.length < 10) {
  console.error('❌ Commit message too short (minimum 10 characters)');
  process.exit(1);
}

if (firstLine.length > 72) {
  console.error('❌ Commit message first line too long (maximum 72 characters)');
  process.exit(1);
}

// Check for WIP or temp messages
if (/^(wip|work in progress|temp|temporary|debug)/i.test(firstLine)) {
  console.error('❌ Commit message suggests work in progress');
  process.exit(1);
}

// Check for generic messages
if (/^(update|fix|change|modify)$/i.test(firstLine)) {
  console.error('❌ Commit message is too generic');
  process.exit(1);
}

console.log('✅ Commit message validation passed');
`;

  const validatorPath = join(projectRoot, 'scripts', 'validate-commit-msg.js');
  mkdirSync(dirname(validatorPath), { recursive: true });
  writeFileSync(validatorPath, validatorContent);
  chmodSync(validatorPath, 0o755);
  success('Commit message validator created');

  // 9. Update package.json scripts (show recommended changes)
  info('Recommended package.json script additions:');
  console.log(`
Add these scripts to your package.json:

{
  "scripts": {
    "prepare": "husky install",
    "pre-commit": "lint-staged && npm run test:quick",
    "pre-push": "npm run test && npm run build && npm run quality:check",
    "test:quick": "npm test -- --passWithNoTests --bail"
  },
  "lint-staged": {
    "*.{js,mjs,cjs}": [
      "eslint --max-warnings 0 --fix",
      "prettier --write"
    ],
    "*.{json,md,yml,yaml}": [
      "prettier --write"
    ]
  }
}
`);

  success('Husky setup completed! 🎉');
  console.log('\n📋 What was set up:');
  console.log('  • Pre-commit hook (runs linting, formatting, quick tests)');
  console.log('  • Commit message validation (enforces good commit messages)');
  console.log('  • Pre-push hook (runs full test suite and quality checks)');
  console.log('  • Additional dev dependencies for better workflow');

  console.log('\n🚀 Next steps:');
  console.log('  1. Update your package.json with the recommended scripts above');
  console.log(
    '  2. Commit these changes: git add . && git commit -m "feat: setup Husky git hooks"'
  );
  console.log('  3. Test the hooks by making a new commit');
} catch (err) {
  error('Setup failed:');
  console.error(err.message);
  process.exit(1);
}
