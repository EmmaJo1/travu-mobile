# Expo SDK 57

This branch upgrades SDK 54 to SDK 57, React Native 0.86.3 and React 19.2.3. The npm lockfile pins the resolved dependencies. Use Node 22.13+ (Node 24 LTS was used for verification).

## Resume development

```sh
npm ci
npx expo start --clear --dev-client
```

The existing SDK 54 development client must be rebuilt. For an iPhone registered with the project's EAS account:

```sh
npx eas-cli build --platform ios --profile development
```

Install the resulting development build, then connect it to Metro. The project uses native Google Sign-In, so Expo Go does not replace the development client for all features. Reuse your existing local environment variables; no credentials are included in this change.

## Migration details

- Expo Router imports now use its own navigation entry points.
- Existing photo scanning uses `expo-media-library/legacy`, preserving its asset metadata and permission APIs.
- Removed obsolete app config flags and status bar background/translucency APIs.
- Replaced removed `StyleSheet.absoluteFillObject` with `StyleSheet.absoluteFill`.
- Updated Babel, React types, TypeScript, symbol types and color scheme fallbacks.
- Existing theme tokens and hardcoded style values were retained; no new visual values were introduced and `constants/theme.ts` was not modified.

## Verification and remaining device checks

- TypeScript: passed.
- Expo Doctor: 21/21 checks passed.
- Expo dependency compatibility check: passed using the installed SDK's bundled version map (offline mode).
- All four existing npm test scripts passed, including 44 place-search tests.
- ESLint: fails with 213 errors under the updated Expo/React Hooks rules, predominantly existing ref access and component patterns. These are not suppressed in this upgrade.
- Actual native compilation and device behavior require a fresh development build. Verify sign-in, photo permissions/scanning, navigation and animations on the device.
- Android blur needs a separate visual follow-up: the new BlurView API requires a `BlurTargetView` reference. Existing views without a target use the library's translucent fallback. iOS blur is unaffected by that Android-only API requirement.
