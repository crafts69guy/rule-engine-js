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
    }),
    commonjs(),
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
            modules: false,
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
    exports: format === 'cjs' ? 'named' : 'auto',
  },
});

export default [
  // UMD build (browser) - includes all dependencies
  createConfig('umd', 'dist/index.js'),

  // UMD minified - includes all dependencies
  createConfig('umd', 'dist/index.min.js', { minify: true }),

  // ESM build - external dependencies
  createConfig('es', 'dist/index.esm.js', {
    external: createExternal('esm'),
  }),

  // CommonJS build - external dependencies
  createConfig('cjs', 'dist/index.cjs.js', {
    external: createExternal('cjs'),
  }),
];
