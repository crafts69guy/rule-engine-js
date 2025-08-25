import { spawn } from 'child_process';
import { existsSync, statSync } from 'fs';

function runCommand(command, args = [], options = {}) {
  return new Promise((resolve, reject) => {
    console.log(`🔍 Running: ${command} ${args.join(' ')}`);

    const process = spawn(command, args, {
      stdio: 'inherit',
      shell: true,
      ...options,
    });

    process.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`${command} failed with code ${code}`));
      }
    });
  });
}

async function checkFileSize(file, maxSize, description) {
  if (!existsSync(file)) {
    console.log(`❌ ${description}: File ${file} not found`);
    return false;
  }

  const stats = statSync(file);
  const sizeKB = stats.size / 1024;
  const maxSizeKB = maxSize / 1024;

  if (sizeKB <= maxSizeKB) {
    console.log(`✅ ${description}: ${sizeKB.toFixed(1)}KB (limit: ${maxSizeKB}KB)`);
    return true;
  } else {
    console.log(`❌ ${description}: ${sizeKB.toFixed(1)}KB exceeds limit of ${maxSizeKB}KB`);
    return false;
  }
}

async function runQualityChecks() {
  console.log('🚀 Running Quality Checks...\n');

  const checks = [
    {
      name: 'Linting',
      command: 'npm',
      args: ['run', 'lint'],
      required: true,
    },
    {
      name: 'Format Check',
      command: 'npm',
      args: ['run', 'format:check'],
      required: true,
    },
    {
      name: 'Tests',
      command: 'npm',
      args: ['run', 'test'],
      required: true,
    },
    {
      name: 'Build',
      command: 'npm',
      args: ['run', 'build'],
      required: true,
    },
    {
      name: 'Bundle Analysis',
      command: 'npm',
      args: ['run', 'build:analyze'],
      required: false,
    },
  ];

  let allPassed = true;

  for (const check of checks) {
    try {
      console.log(`\n📋 ${check.name}`);
      console.log('='.repeat(40));
      await runCommand(check.command, check.args);
      console.log(`✅ ${check.name} passed\n`);
    } catch (error) {
      console.error(`❌ ${check.name} failed:`, error.message);
      if (check.required) {
        allPassed = false;
      }
    }
  }

  // File size checks
  console.log('\n📏 File Size Checks');
  console.log('='.repeat(40));

  const sizeChecks = [
    { file: 'dist/index.min.js', maxSize: 50 * 1024, description: 'Minified UMD bundle' },
    { file: 'dist/index.esm.js', maxSize: 70 * 1024, description: 'ESM bundle' },
    { file: 'dist/index.cjs', maxSize: 70 * 1024, description: 'CommonJS bundle' },
  ];

  for (const { file, maxSize, description } of sizeChecks) {
    const passed = await checkFileSize(file, maxSize, description);
    if (!passed) {
      allPassed = false;
    }
  }

  // Package structure checks
  console.log('\n📁 Package Structure Checks');
  console.log('='.repeat(40));

  const requiredFiles = [
    'dist/index.js',
    'dist/index.min.js',
    'dist/index.esm.js',
    'dist/index.cjs',
    'types/index.d.ts',
    'README.md',
    'LICENSE',
    'package.json',
  ];

  for (const file of requiredFiles) {
    if (existsSync(file)) {
      console.log(`✅ ${file} exists`);
    } else {
      console.log(`❌ ${file} missing`);
      allPassed = false;
    }
  }

  // Summary
  console.log('\n📊 Quality Check Summary');
  console.log('='.repeat(40));

  if (allPassed) {
    console.log('🎉 All quality checks passed!');
    console.log('✨ Your package is ready for publishing!');
  } else {
    console.log('❌ Some quality checks failed.');
    console.log('🔧 Please fix the issues above before publishing.');
    process.exit(1);
  }
}

runQualityChecks().catch((error) => {
  console.error('Quality check process failed:', error);
  process.exit(1);
});
