const webpack = require('webpack');

module.exports = {
  // ...existing config (CRA will merge this)
  resolve: {
    fallback: {
      http: require.resolve('stream-http'),
      https: require.resolve('https-browserify'),
      zlib: require.resolve('browserify-zlib'),
      stream: require.resolve('stream-browserify'),
      crypto: require.resolve('crypto-browserify'),
    },
  },
  plugins: [
    new webpack.ProvidePlugin({
      process: 'process/browser',
      Buffer: ['buffer', 'Buffer'],
    }),
  ],
  devServer: (configFunction) => (proxy, allowedHost) => {
    const config = configFunction(proxy, allowedHost);
    config.headers = {
      ...(config.headers || {}),
      'Cross-Origin-Opener-Policy': 'same-origin-allow-popups',
    };
    return config;
  },
};
