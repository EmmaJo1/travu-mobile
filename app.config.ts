import type { ConfigContext, ExpoConfig } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => {
  const androidMapsApiKey = process.env.GOOGLE_MAPS_ANDROID_API_KEY;
  const iosMapsApiKey = process.env.GOOGLE_MAPS_IOS_API_KEY;

  return {
    ...config,
    name: config.name ?? 'travu-mobile',
    slug: config.slug ?? 'travu-mobile',
    plugins: [
      ...(config.plugins ?? []),
      ['react-native-maps', {
        ...(androidMapsApiKey ? { androidGoogleMapsApiKey: androidMapsApiKey } : {}),
        ...(iosMapsApiKey ? { iosGoogleMapsApiKey: iosMapsApiKey } : {}),
      }],
    ],
    android: {
      ...config.android,
      config: {
        ...config.android?.config,
        ...(androidMapsApiKey
          ? { googleMaps: { apiKey: androidMapsApiKey } }
          : {}),
      },
    },
    ios: {
      ...config.ios,
      config: {
        ...config.ios?.config,
        ...(iosMapsApiKey ? { googleMapsApiKey: iosMapsApiKey } : {}),
      },
    },
  };
};
