import { execSync } from 'child_process';
import { writeFileSync, unlinkSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = dirname(__dirname);

console.log('🧪 Testing Built Package Imports\n');
console.log(`📍 Project root: ${projectRoot}`);

const testData = {
  user: { name: 'Test User', age: 25, email: 'test@example.com' }
};

let allPassed = true;

// Check if dist files exist
const distFiles = [
  'dist/index.js',
  'dist/index.min.js',
  'dist/index.esm.js',
  'dist/index.cjs'
];

console.log('\n📁 Checking build files:');
distFiles.forEach(file => {
  const fullPath = join(projectRoot, file);
  if (existsSync(fullPath)) {
    console.log(`✅ ${file} exists`);
  } else {
    console.log(`❌ ${file} missing (checked: ${fullPath})`);
    allPassed = false;
  }
});

if (!allPassed) {
  console.log('\n❌ Build files missing. Run "npm run build" first.');
  process.exit(1);
}

// Helper function to run test and capture output
function runTest(name, code, isModule = true) {
  // Use .mjs for ES modules and .cjs for CommonJS (without .js suffix)
  const filename = isModule ? 'temp-test.mjs' : 'temp-test.cjs';
  const fullPath = join(projectRoot, filename);

  try {
    writeFileSync(fullPath, code);
    const output = execSync(`node ${filename}`, {
      encoding: 'utf8',
      timeout: 10000,
      cwd: projectRoot
    });

    console.log(`✅ ${name}`);
    if (output.trim()) {
      console.log(`   Output: ${output.trim()}`);
    }
    return true;
  } catch (error) {
    console.log(`❌ ${name}`);
    console.log(`   Error: ${error.message.split('\n')[0]}`);
    // Log more details for debugging
    if (error.stderr) {
      console.log(`   Stderr: ${error.stderr.toString().split('\n')[0]}`);
    }
    allPassed = false;
    return false;
  } finally {
    if (existsSync(fullPath)) {
      unlinkSync(fullPath);
    }
  }
}

console.log('\n📦 Testing Built Package Import Methods:\n');

// Test 1: ESM build import
runTest(
  'ESM build import',
  `
import { createRuleEngine, createRuleHelpers } from './dist/index.esm.js';

const engine = createRuleEngine();
const rules = createRuleHelpers();

const rule = rules.eq('user.name', 'Test User');
const result = engine.evaluateExpr(rule, ${JSON.stringify(testData)});

console.log('ESM build import works:', result.success);
`
);

// Test 2: CommonJS build require
runTest(
  'CommonJS build require',
  `
const { createRuleEngine, createRuleHelpers } = require('./dist/index.cjs');

const engine = createRuleEngine();
const rules = createRuleHelpers();

const rule = rules.eq('user.name', 'Test User');
const result = engine.evaluateExpr(rule, ${JSON.stringify(testData)});

console.log('CommonJS build require works:', result.success);
`,
  false
);

// Test 3: UMD build verification (structure check instead of Node.js require)
runTest(
  'UMD build structure verification',
  `
import { readFileSync } from 'fs';

try {
  const umdContent = readFileSync('./dist/index.js', 'utf8');
  
  // Check for UMD pattern
  const hasUMDPattern = umdContent.includes('typeof exports') && 
                       umdContent.includes('typeof module') &&
                       umdContent.includes('typeof define');
  
  console.log('UMD pattern detected:', hasUMDPattern);
  
  // Check for global export
  const hasGlobalExport = umdContent.includes('RuleEngineJS');
  console.log('Global export (RuleEngineJS) detected:', hasGlobalExport);
  
  // Check for main functions
  const hasCreateRuleEngine = umdContent.includes('createRuleEngine');
  console.log('createRuleEngine function detected:', hasCreateRuleEngine);
  
  if (hasUMDPattern && hasGlobalExport && hasCreateRuleEngine) {
    console.log('UMD build structure is valid for browser usage');
  } else {
    throw new Error('UMD build missing required patterns');
  }
  
} catch (error) {
  console.error('UMD verification failed:', error.message);
  throw error;
}
`
);

// Test 4: Dynamic import of ESM build
runTest(
  'Dynamic import of ESM build',
  `
async function test() {
  try {
    const module = await import('./dist/index.esm.js');
    const engine = module.createRuleEngine();
    const rules = module.createRuleHelpers();
    
    const rule = rules.eq('user.name', 'Test User');
    const result = engine.evaluateExpr(rule, ${JSON.stringify(testData)});
    
    console.log('Dynamic ESM build import works:', result.success);
  } catch (error) {
    console.error('Dynamic import failed:', error.message);
    process.exit(1);
  }
}

test();
`
);

// Test 5: Package.json exports validation
runTest(
  'Package.json exports validation',
  `
import { readFileSync } from 'fs';

try {
  const pkg = JSON.parse(readFileSync('./package.json', 'utf8'));
  console.log('Package main:', pkg.main);
  console.log('Package module:', pkg.module);
  console.log('Package browser:', pkg.browser);
  console.log('Package types:', pkg.types);
  
  // Validate exports field
  if (pkg.exports) {
    console.log('Package exports:', JSON.stringify(pkg.exports, null, 2));
  }
  
  // Test default import
  const { createRuleEngine } = await import('./dist/index.esm.js');
  console.log('Default export works:', !!createRuleEngine);
} catch (error) {
  console.error('Package validation failed:', error.message);
  throw error;
}
`
);

console.log('\n📊 Built Package Import Test Summary:');
if (allPassed) {
  console.log('✅ All built package import tests passed');
  console.log('🎉 Your package is ready for publishing!');
} else {
  console.log('❌ Some built package import tests failed');
  console.log('🔧 Please check your build configuration');
}

console.log('\n🎉 Built package import test completed!');
