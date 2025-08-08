import { nodeResolve } from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import babel from '@rollup/plugin-babel';
import terser from '@rollup/plugin-terser';

const config = {
  input: 'src/index.js',
  external: [], // No external dependencies
  plugins: [
    nodeResolve({
      preferBuiltins: false
    }),
    commonjs(),
    babel({
      babelHelpers: 'bundled',
      exclude: 'node_modules/**'
    })
  ]
};

export default [
  // UMD build (browser)
  {
    ...config,
    output: {
      file: 'dist/index.js',
      format: 'umd',
      name: 'RuleEngineJS',
      sourcemap: true
    }
  },
  // UMD minified
  {
    ...config,
    output: {
      file: 'dist/index.min.js',
      format: 'umd',
      name: 'RuleEngineJS',
      sourcemap: true
    },
    plugins: [...config.plugins, terser()]
  },
  // ESM build
  {
    ...config,
    output: {
      file: 'dist/index.esm.js',
      format: 'es',
      sourcemap: true
    }
  },
  // CommonJS build  
  {
    ...config,
    output: {
      file: 'dist/index.cjs.js',
      format: 'cjs',
      exports: 'named',
      sourcemap: true
    }
  }
];
