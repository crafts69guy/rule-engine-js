#!/usr/bin/env node

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

const firstLine = commitMsg.split('\n')[0];

// Basic validation
if (firstLine.length < 10) {
  console.error('❌ Commit message too short (minimum 10 characters)');
  process.exit(1);
}

if (firstLine.length > 120) {
  console.error('❌ Commit message first line too long (maximum 120 characters)');
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
