// postcss.config.js
module.exports = {
  plugins: [
    require('cssnano')({
      preset: ['default', {
        discardComments: { removeAll: true },  // comments ඉවත් කරනවා
        normalizeWhitespace: true,             // whitespace compress කරනවා
        minifySelectors: true,                 // selectors shorten කරනවා
      }]
    })
  ]
};
