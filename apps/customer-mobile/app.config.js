// Dynamic Expo config — reads secrets from environment variables.
// This file takes precedence over app.json at build time.

/** @type {import('expo/config').ExpoConfig} */
module.exports = {
  name: 'Cleanly',
  slug: 'cleanly-customer',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'light',
  splash: {
    image: './assets/splash.png',
    resizeMode: 'contain',
    backgroundColor: '#ffffff',
  },
  assetBundlePatterns: ['**/*'],
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'com.cleanly.customer',
  },
  android: {
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      backgroundColor: '#ffffff',
    },
    package: 'com.cleanly.customer',
    config: {
      googleMaps: {
        apiKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY,
      },
    },
    permissions: ['android.permission.ACCESS_COARSE_LOCATION', 'android.permission.ACCESS_FINE_LOCATION'],
  },
  web: {
    favicon: './assets/favicon.png',
  },
  plugins: [
    'expo-router',
    [
      'expo-location',
      {
        locationWhenInUsePermission: 'Cleanly uses your location to show nearby services.',
      },
    ],
  ],
  scheme: 'cleanly-customer',
  extra: {
    eas: {
      projectId: '4b6cf4d4-8d8f-41a4-bf1d-346cbdad706b',
    },
    router: {},
  },
  owner: 'cleanly2026',
};
