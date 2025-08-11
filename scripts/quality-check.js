import { spawn } from 'child_process';

function runCommand(command, args = []) {
  return new Promise((resolve, reject) => {
    console.log(`🔍 Running: ${command} ${args.join(' ')}`);

    const process = spawn(command, args, {
      stdio: 'inherit',
      shell: true,
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

async function runQualityChecks() {
  const checks = [
    { name: 'Linting', command: 'npm', args: ['run', 'lint'] },
    { name: 'Format Check', command: 'npm', args: ['run', 'format:check'] },
    { name: 'Tests', command: 'npm', args: ['run', 'test'] },
    { name: 'Build', command: 'npm', args: ['run', 'build'] },
  ];

  console.log('🚀 Running Quality Checks...\n');

  for (const check of checks) {
    try {
      console.log(`\n📋 ${check.name}`);
      console.log('='.repeat(40));
      await runCommand(check.command, check.args);
      console.log(`✅ ${check.name} passed\n`);
    } catch (error) {
      console.error(`❌ ${check.name} failed:`, error.message);
      process.exit(1);
    }
  }

  console.log('🎉 All quality checks passed!');
}

runQualityChecks().catch(console.error);
