const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// expo-sqlite ships a wasm build that metro must treat as an asset on web.
config.resolver.assetExts.push('wasm');

module.exports = config;
