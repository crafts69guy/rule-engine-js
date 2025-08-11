import { createRequire } from 'module';
import { existsSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

async function testESMBuild() {
  console.log('\n🧪 Testing ESM Build...');

  try {
    const { createRuleEngine, createRuleHelpers, OPERATOR_NAMES } = await import(
      '../dist/index.esm.js'
    );

    const engine = createRuleEngine();
    const helpers = createRuleHelpers();

    // Test basic functionality
    const rule = helpers.and(helpers.eq('name', 'test'), helpers.gte('age', 18));

    const context = { name: 'test', age: 25 };
    const result = engine.evaluateExpr(rule, context);

    if (!result.success) {
      throw new Error('Rule evaluation failed');
    }

    console.log('✅ ESM build works');
    console.log(`✅ Available operators: ${engine.getOperators().length}`);
    console.log(`✅ OPERATOR_NAMES exported: ${Object.keys(OPERATOR_NAMES).length}`);

    return true;
  } catch (error) {
    console.error('❌ ESM build failed:', error.message);
    return false;
  }
}

async function testCJSBuild() {
  console.log('\n🧪 Testing CommonJS Build...');

  try {
    const require = createRequire(import.meta.url);
    const { createRuleEngine, createRuleHelpers, OPERATOR_NAMES } = require('../dist/index.cjs');

    const engine = createRuleEngine();
    const helpers = createRuleHelpers();

    // Test basic functionality
    const rule = helpers.and(helpers.eq('name', 'test'), helpers.gte('age', 18));

    const context = { name: 'test', age: 25 };
    const result = engine.evaluateExpr(rule, context);

    if (!result.success) {
      throw new Error('Rule evaluation failed');
    }

    console.log('✅ CJS build works');
    console.log(`✅ Available operators: ${engine.getOperators().length}`);
    console.log(`✅ OPERATOR_NAMES exported: ${Object.keys(OPERATOR_NAMES).length}`);

    return true;
  } catch (error) {
    console.error('❌ CJS build failed:', error.message);
    return false;
  }
}

function testUMDBuild() {
  console.log('\n🧪 Testing UMD Build...');

  const umdPath = join(rootDir, 'dist', 'index.js');
  const minPath = join(rootDir, 'dist', 'index.min.js');

  if (!existsSync(umdPath)) {
    console.error('❌ UMD build not found');
    return false;
  }

  if (!existsSync(minPath)) {
    console.error('❌ UMD minified build not found');
    return false;
  }

  try {
    const content = readFileSync(umdPath, 'utf8');

    // Check for UMD pattern
    if (
      !content.includes('(function (global, factory)') &&
      !content.includes("typeof exports === 'object'")
    ) {
      throw new Error('UMD pattern not found');
    }

    // Check for global export
    if (!content.includes('RuleEngineJS')) {
      throw new Error('Global RuleEngineJS not found');
    }

    console.log('✅ UMD build structure looks correct');

    // Check minified version
    const minContent = readFileSync(minPath, 'utf8');
    if (minContent.length >= content.length) {
      console.log('⚠️  Minified version might not be properly minified');
    } else {
      console.log('✅ Minified build is smaller than regular build');
    }

    return true;
  } catch (error) {
    console.error('❌ UMD build validation failed:', error.message);
    return false;
  }
}

async function runAllTests() {
  console.log('🚀 Running Comprehensive Build Tests...\n');

  // Check if builds exist
  const requiredFiles = [
    'dist/index.js',
    'dist/index.min.js',
    'dist/index.esm.js',
    'dist/index.cjs',
  ];

  const missingFiles = requiredFiles.filter((file) => !existsSync(join(rootDir, file)));

  if (missingFiles.length > 0) {
    console.error('❌ Missing build files:', missingFiles);
    console.log('Run "npm run build" first');
    process.exit(1);
  }

  let allPassed = true;

  // Test ESM build
  if (!(await testESMBuild())) {
    allPassed = false;
  }

  // Test CJS build
  if (!(await testCJSBuild())) {
    allPassed = false;
  }

  // Test UMD build
  if (!testUMDBuild()) {
    allPassed = false;
  }

  if (allPassed) {
    console.log('\n🎉 All build tests passed!');
    console.log('\n📋 Summary:');
    console.log('✅ ESM build works');
    console.log('✅ CommonJS build works');
    console.log('✅ UMD build structure is correct');
  } else {
    console.log('\n❌ Some tests failed. Please check the output above.');
    process.exit(1);
  }
}

runAllTests().catch(console.error);
