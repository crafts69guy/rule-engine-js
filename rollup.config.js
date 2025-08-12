import { nodeResolve } from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import babel from '@rollup/plugin-babel';
import terser from '@rollup/plugin-terser';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const pkg = require('./package.json');

// Helper function to create external dependencies list
const createExternal = (bundleType) => {
  const external = [];

  // For CJS and ESM, mark all dependencies as external
  if (bundleType === 'cjs' || bundleType === 'esm') {
    external.push(
      ...Object.keys(pkg.dependencies || {}),
      ...Object.keys(pkg.peerDependencies || {})
    );
  }

  return external;
};

// Base configuration
const createConfig = (format, filename, { minify = false, external = [] } = {}) => ({
  input: 'src/index.js',
  external,
  plugins: [
    nodeResolve({
      preferBuiltins: false,
      browser: format === 'umd',
      modulesOnly: format !== 'umd',
    }),
    commonjs({
      include: 'node_modules/**',
    }),
    babel({
      babelHelpers: 'bundled',
      exclude: 'node_modules/**',
      presets: [
        [
          '@babel/preset-env',
          {
            targets:
              format === 'umd'
                ? {
                    browsers: ['> 1%', 'last 2 versions', 'not dead'],
                  }
                : {
                    node: '16',
                  },
            modules: false, // Keep ES modules for Rollup
            bugfixes: true,
            useBuiltIns: false,
          },
        ],
      ],
    }),
    ...(minify
      ? [
          terser({
            compress: {
              drop_console: true,
              drop_debugger: true,
              pure_funcs: ['console.log', 'console.warn'],
              passes: 2,
              dead_code: true,
              unused: true,
            },
            mangle: {
              properties: {
                regex: /^_/,
              },
            },
            format: {
              comments: false,
            },
          }),
        ]
      : []),
  ],
  output: {
    file: filename,
    format,
    name: format === 'umd' ? 'RuleEngineJS' : undefined,
    sourcemap: true,
    ...(format === 'cjs'
      ? {
          exports: 'named',
          interop: 'compat',
          esModule: false,
        }
      : format === 'umd'
        ? {
            exports: 'named',
          }
        : {
            exports: 'auto',
          }),
    // Add banner with version info
    banner: `/**
 * Rule Engine JS v${pkg.version}
 * ${pkg.description}
 * 
 * @license ${pkg.license}
 * @author ${pkg.author}
 */`,
  },
});

export default [
  // UMD build (browser) - includes all dependencies
  createConfig('umd', 'dist/index.js'),

  // UMD minified - includes all dependencies, optimized for production
  createConfig('umd', 'dist/index.min.js', { minify: true }),

  // ESM build - external dependencies, optimized for tree shaking
  createConfig('es', 'dist/index.esm.js', {
    external: createExternal('esm'),
  }),

  // CommonJS build - external dependencies
  createConfig('cjs', 'dist/index.cjs', {
    external: createExternal('cjs'),
  }),
];
