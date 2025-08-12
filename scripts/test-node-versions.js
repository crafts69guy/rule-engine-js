import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('🧪 Testing Node.js Version Compatibility\n');

// Get current Node.js version
const currentVersion = process.version;
console.log(`📍 Current Node.js version: ${currentVersion}`);

// Check package.json engines requirement
try {
  const packageJsonPath = join(__dirname, '..', 'package.json');
  const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
  const nodeRequirement = packageJson.engines?.node;
  console.log(`📋 Required Node.js version: ${nodeRequirement || 'Not specified'}\n`);
} catch (error) {
  console.log('⚠️  Could not read package.json engines field\n');
  console.log(`Error: ${error.message}\n`);
}

// Test basic Node.js compatibility
console.log('🔍 Testing Node.js Features Compatibility:');

const tests = [
  {
    name: 'ES Modules Support',
    test: () => {
      try {
        // Test if we can use import.meta
        return typeof import.meta === 'object' && import.meta.url;
      } catch (e) {
        return false;
      }
    }
  },
  {
    name: 'Modern JavaScript Features',
    test: () => {
      try {
        // Test optional chaining, nullish coalescing
        const obj = { a: { b: 1 } };
        const result = obj?.a?.b ?? 0;
        // Test BigInt
        const bigInt = BigInt(123);
        return result === 1 && typeof bigInt === 'bigint';
      } catch (e) {
        return false;
      }
    }
  },
  {
    name: 'Performance API',
    test: () => {
      try {
        const start = performance.now();
        const end = performance.now();
        return typeof start === 'number' && end >= start;
      } catch (e) {
        return false;
      }
    }
  },
  {
    name: 'Buffer Support',
    test: () => {
      try {
        const buffer = Buffer.from('test', 'utf8');
        return buffer.toString() === 'test';
      } catch (e) {
        return false;
      }
    }
  },
  {
    name: 'WeakMap/WeakSet Support',
    test: () => {
      try {
        const wm = new WeakMap();
        const ws = new WeakSet();
        const obj = {};
        wm.set(obj, 'value');
        ws.add(obj);
        return wm.get(obj) === 'value' && ws.has(obj);
      } catch (e) {
        return false;
      }
    }
  },
  {
    name: 'Promise Support',
    test: () => {
      try {
        return typeof Promise === 'function' && typeof Promise.resolve === 'function';
      } catch (e) {
        return false;
      }
    }
  },
  {
    name: 'Async/Await Support',
    test: () => {
      try {
        const asyncFn = async () => 'test';
        return typeof asyncFn === 'function' && asyncFn.constructor.name === 'AsyncFunction';
      } catch (e) {
        return false;
      }
    }
  }
];

let allPassed = true;

tests.forEach(({ name, test }) => {
  try {
    const passed = test();
    console.log(`${passed ? '✅' : '❌'} ${name}`);
    if (!passed) allPassed = false;
  } catch (error) {
    console.log(`❌ ${name} - Error: ${error.message}`);
    allPassed = false;
  }
});

console.log('\n📊 Node.js Compatibility Summary:');
if (allPassed) {
  console.log('✅ All Node.js compatibility tests passed');
} else {
  console.log('❌ Some Node.js compatibility tests failed');
  console.log('⚠️  This may indicate compatibility issues with current Node.js version');
}

// Test if current Node.js version meets minimum requirements
const nodeVersion = parseInt(currentVersion.replace('v', '').split('.')[0]);
const minVersion = 16; // From your package.json engines

console.log(`\n🔍 Version Check: Node.js ${nodeVersion} >= ${minVersion}`);
if (nodeVersion >= minVersion) {
  console.log('✅ Node.js version meets requirements');
} else {
  console.log('❌ Node.js version is below minimum requirement');
  console.log('💡 Please upgrade to Node.js 16 or higher');
  process.exit(1);
}

console.log('\n🎉 Node.js version compatibility check completed!');
