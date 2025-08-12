module.exports = {
  presets: [
    ['@babel/preset-env', {
      targets: {
        node: '16',
        browsers: ['> 1%', 'last 2 versions', 'not dead']
      },
      modules: false // Keep ES modules for tree shaking
    }]
  ]
};
