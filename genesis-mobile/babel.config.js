module.exports = function(api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      [
        'module-resolver',
        {
          root: ['./'],
          alias: {
            '@': './src',
            '@config': './src/config',
            '@screens': './src/screens',
            '@store': './src/store',
            '@services': './src/services',
            '@theme': './src/theme',
            '@types': './src/types',
            '@components': './src/components',
            '@assets': './src/assets',
          },
        },
      ],
    ],
  };
};
