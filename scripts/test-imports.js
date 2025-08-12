import { execSync } from 'child_process';
import { writeFileSync, unlinkSync, existsSync } from 'fs';

console.log('🧪 Testing Import Methods\n');

// Test data for validation
const testData = {
  user: { name: 'Test User', age: 25, email: 'test@example.com' },
};

let allPassed = true;

// Helper function to run test and capture output
function runTest(name, code, isModule = true) {
  const filename = isModule ? 'temp-test.mjs' : 'temp-test.cjs';

  try {
    writeFileSync(filename, code);
    const output = execSync(`node ${filename}`, {
      encoding: 'utf8',
      timeout: 10000,
    });

    console.log(`✅ ${name}`);
    if (output.trim()) {
      console.log(`   Output: ${output.trim()}`);
    }
    return true;
  } catch (error) {
    console.log(`❌ ${name}`);
    console.log(`   Error: ${error.message.split('\n')[0]}`);
    allPassed = false;
    return false;
  } finally {
    if (existsSync(filename)) {
      unlinkSync(filename);
    }
  }
}

console.log('📦 Testing Source Import Methods:\n');

// Test 1: ESM import from source
runTest(
  'ESM import from source',
  `
import { createRuleEngine, createRuleHelpers } from './src/index.js';

const engine = createRuleEngine();
const rules = createRuleHelpers();

const rule = rules.eq('user.name', 'Test User');
const result = engine.evaluateExpr(rule, ${JSON.stringify(testData)});

console.log('ESM source import works:', result.success);
`
);

// Test 2: Dynamic import from source
runTest(
  'Dynamic import from source',
  `
async function test() {
  try {
    const module = await import('./src/index.js');
    const engine = module.createRuleEngine();
    const rules = module.createRuleHelpers();
    
    const rule = rules.eq('user.name', 'Test User');
    const result = engine.evaluateExpr(rule, ${JSON.stringify(testData)});
    
    console.log('Dynamic source import works:', result.success);
  } catch (error) {
    console.error('Dynamic import failed:', error.message);
    process.exit(1);
  }
}

test();
`
);

console.log('\n📊 Source Import Test Summary:');
if (allPassed) {
  console.log('✅ All source import tests passed');
} else {
  console.log('❌ Some source import tests failed');
  console.log('🔧 Please check your src/index.js exports');
}

console.log('\n🎉 Import methods test completed!');
