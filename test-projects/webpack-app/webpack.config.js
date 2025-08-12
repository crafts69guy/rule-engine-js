import HtmlWebpackPlugin from 'html-webpack-plugin';


export default {
  entry: './src/index.js',
  plugins: [
    new HtmlWebpackPlugin({
      template: './src/index.html'
    })
  ],
  resolve: {
    extensions: ['.js']
  }
};
