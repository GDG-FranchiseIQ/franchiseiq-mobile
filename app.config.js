/** @type {import('expo/config').ExpoConfig} */
module.exports = ({ config }) => ({
  ...config,
  ios: {
    ...(config.ios ?? {}),
    infoPlist: {
      ...(config.ios?.infoPlist ?? {}),
      NSAppTransportSecurity: {
        ...(config.ios?.infoPlist?.NSAppTransportSecurity ?? {}),
        NSAllowsArbitraryLoads: true,
        NSAllowsArbitraryLoadsInWebContent: true,
      },
    },
  },
  android: {
    ...(config.android ?? {}),
    usesCleartextTraffic: true,
  },
  extra: {
    ...config.extra,
    apiBaseUrl: process.env.EXPO_PUBLIC_API_BASE_URL ?? "",
    wsBaseUrl: process.env.EXPO_PUBLIC_WS_BASE_URL ?? "",
    webDashboardUrl: process.env.EXPO_PUBLIC_WEB_DASHBOARD_URL ?? "https://example.com",
    useMockWs: process.env.EXPO_PUBLIC_USE_MOCK_WS === "true",
    firebase: {
      apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY ?? "",
      authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN ?? "",
      projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID ?? "",
      storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET ?? "",
      messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? "",
      appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID ?? "",
    },
  },
});
