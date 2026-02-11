module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      [
        'module-resolver',
        {
          root: ['.'],
          alias: {
            '@/hooks': './src/hooks',
            '@/components': './src/components',
            '@': '.',
          },
        },
      ],
    ],
  };
};
