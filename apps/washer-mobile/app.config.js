// Dynamic Expo config — reads secrets from environment variables.
// This file takes precedence over app.json at build time.
// See: https://docs.expo.dev/workflow/configuration/

/** @type {import('expo/config').ExpoConfig} */
module.exports = {
  name: 'Cleanly Washer',
  slug: 'cleanly-washer',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'light',
  splash: {
    image: './assets/splash-icon.png',
    resizeMode: 'contain',
    backgroundColor: '#1A2744',
  },
  ios: {
    supportsTablet: false,
    bundleIdentifier: 'com.cleanly.washer',
  },
  android: {
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      backgroundColor: '#1A2744',
    },
    package: 'com.cleanly.washer',
    config: {
      googleMaps: {
        apiKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY,
      },
    },
    permissions: [
      'android.permission.ACCESS_COARSE_LOCATION',
      'android.permission.ACCESS_FINE_LOCATION',
      'android.permission.ACCESS_BACKGROUND_LOCATION',
      'android.permission.FOREGROUND_SERVICE',
      'android.permission.FOREGROUND_SERVICE_LOCATION',
      'android.permission.RECORD_AUDIO',
    ],
  },
  web: {
    favicon: './assets/favicon.png',
  },
  plugins: [
    'expo-router',
    [
      'expo-location',
      {
        locationAlwaysAndWhenInUsePermission:
          'Cleanly needs your location to share it with customers during a job.',
        isAndroidBackgroundLocationEnabled: true,
        isAndroidForegroundServiceEnabled: true,
      },
    ],
    [
      'expo-image-picker',
      {
        photosPermission: 'Cleanly needs access to your photos for job evidence.',
        cameraPermission: 'Cleanly needs your camera to take before/after photos of service jobs.',
      },
    ],
  ],
  scheme: 'cleanly-washer',
  extra: {
    router: {},
    eas: {
      projectId: '3ab3cf7e-8a25-4ce5-84b4-b96a2cd6d34e',
    },
  },
  owner: 'cleanly2026',
};
