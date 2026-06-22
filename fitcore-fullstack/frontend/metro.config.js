const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

module.exports = (() => {
  const config = getDefaultConfig(__dirname);
  const { transformer, resolver, serializer } = config;

  // Removed manual getPolyfills override

  config.transformer = {
    ...transformer,
    babelTransformerPath: require.resolve('react-native-svg-transformer'),
  };
  config.resolver = {
    ...resolver,
    assetExts: resolver.assetExts.filter(ext => ext !== 'svg'),
    sourceExts: [...resolver.sourceExts, 'svg'],
    resolveRequest: (context, moduleName, platform) => {
      // react-native-worklets uses import.meta which breaks web — mock it
      if (platform === 'web' && (
        moduleName === 'react-native-worklets' ||
        moduleName === 'react-native-worklets-core'
      )) {
        return { type: 'empty' };
      }
      return context.resolveRequest(context, moduleName, platform);
    },
  };

  return config;
})();
