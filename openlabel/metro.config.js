const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

const config = getDefaultConfig(__dirname);

// expo-sqlite's web build imports a `.wasm` module (wa-sqlite). Metro doesn't
// treat .wasm as an asset by default, so register it for the web bundle.
config.resolver.assetExts.push('wasm');

module.exports = withNativeWind(config, { input: './global.css' });
