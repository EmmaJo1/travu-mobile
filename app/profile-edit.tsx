import { Feather } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import {
  Alert,
  Animated,
  Easing,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import AppTextInput from '@/components/common/AppTextInput';
import Text from '@/components/common/AppText';
import { MOCK_MY_PAGE_PROFILE } from '@/constants/mockMyPageProfile';
import { Colors, Radius, Shadows, Spacing, Typography } from '@/constants/theme';
import { useUserProfile, type UserProfile } from '@/providers/UserProfileProvider';

const TRAVEL_STYLE_OPTIONS = [
  'Photo walk',
  'Solo trip',
  'Slow travel',
  'Art & museum',
  'Nature',
  'Food',
  'City wandering',
] as const;

const BASED_IN_SHEET_ANIMATION_DURATION = 300;

type BasedInPlace = NonNullable<UserProfile['basedInPlace']>;

const BASED_IN_CITY_OPTIONS: BasedInPlace[] = [
  {
    displayName: 'Seoul, South Korea',
    city: 'Seoul',
    country: 'South Korea',
    countryCode: 'KR',
    latitude: 37.5665,
    longitude: 126.978,
    placeId: 'profile-city-seoul-kr',
  },
  {
    displayName: 'Paris, France',
    city: 'Paris',
    country: 'France',
    countryCode: 'FR',
    latitude: 48.8566,
    longitude: 2.3522,
    placeId: 'profile-city-paris-fr',
  },
  {
    displayName: 'Tokyo, Japan',
    city: 'Tokyo',
    country: 'Japan',
    countryCode: 'JP',
    latitude: 35.6762,
    longitude: 139.6503,
    placeId: 'profile-city-tokyo-jp',
  },
  {
    displayName: 'New York, United States',
    city: 'New York',
    region: 'New York',
    country: 'United States',
    countryCode: 'US',
    latitude: 40.7128,
    longitude: -74.006,
    placeId: 'profile-city-new-york-us',
  },
  {
    displayName: 'Seoul, United States',
    city: 'Seoul',
    region: 'Iowa',
    country: 'United States',
    countryCode: 'US',
    placeId: 'profile-city-seoul-iowa-us',
  },
  {
    displayName: 'Seoul, Australia',
    city: 'Seoul',
    region: 'New South Wales',
    country: 'Australia',
    countryCode: 'AU',
    placeId: 'profile-city-seoul-nsw-au',
  },
  {
    displayName: 'Seoul, Ukraine',
    city: 'Seoul',
    region: 'Kyiv Oblast',
    country: 'Ukraine',
    countryCode: 'UA',
    placeId: 'profile-city-seoul-kyiv-ua',
  },
] as const;

function getBasedInSubtitle(place: BasedInPlace) {
  return place.region ? `${place.region}, ${place.country}` : place.country;
}

export default function ProfileEditScreen() {
  const router = useRouter();
  const { profile, updateProfile } = useUserProfile();
  const [name, setName] = React.useState(profile.name);
  const [basedIn, setBasedIn] = React.useState(profile.basedIn);
  const [basedInPlace, setBasedInPlace] = React.useState(profile.basedInPlace);
  const [isBasedInPickerOpen, setBasedInPickerOpen] = React.useState(false);
  const [bio, setBio] = React.useState(profile.bio);
  const [travelStyles, setTravelStyles] = React.useState<string[]>(profile.travelStyles);
  const [profileImageUri, setProfileImageUri] = React.useState(profile.profileImageUri);
  const avatarSource = profileImageUri
    ? { uri: profileImageUri }
    : MOCK_MY_PAGE_PROFILE.profileImage;

  const toggleTravelStyle = React.useCallback((style: string) => {
    setTravelStyles((currentStyles) => (
      currentStyles.includes(style)
        ? currentStyles.filter((item) => item !== style)
        : [...currentStyles, style]
    ));
  }, []);

  const handlePressPhoto = React.useCallback(async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permission.granted) {
        Alert.alert(
          '\uC0AC\uC9C4 \uC811\uADFC \uAD8C\uD55C\uC774 \uD544\uC694\uD574\uC694',
          '\uC0AC\uC9C4\uCCA9\uC5D0\uC11C \uD504\uB85C\uD544 \uC0AC\uC9C4\uC744 \uC120\uD0DD\uD558\uB824\uBA74 \uAD8C\uD55C\uC744 \uD5C8\uC6A9\uD574\uC8FC\uC138\uC694.',
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.9,
      });

      if (result.canceled) {
        return;
      }

      const selectedUri = result.assets[0]?.uri;
      if (selectedUri) {
        setProfileImageUri(selectedUri);
      }
    } catch (error) {
      console.warn('Profile image selection failed:', error);
      Alert.alert(
        '\uC0AC\uC9C4\uC744 \uBD88\uB7EC\uC624\uC9C0 \uBABB\uD588\uC5B4\uC694',
        '\uC7A0\uC2DC \uD6C4 \uB2E4\uC2DC \uC2DC\uB3C4\uD574\uC8FC\uC138\uC694.',
      );
    }
  }, []);

  const handleSaveProfile = React.useCallback(() => {
    updateProfile({
      name: name.trim() || MOCK_MY_PAGE_PROFILE.userName,
      basedIn: basedIn.trim(),
      basedInPlace,
      bio: bio.trim() || MOCK_MY_PAGE_PROFILE.tagline,
      travelStyles,
      profileImageUri,
    });
    router.back();
  }, [basedIn, basedInPlace, bio, name, profileImageUri, router, travelStyles, updateProfile]);

  const handleSelectBasedIn = React.useCallback((place: BasedInPlace) => {
    setBasedIn(place.displayName);
    setBasedInPlace(place);
    setBasedInPickerOpen(false);
  }, []);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <StatusBar style="dark" />
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          hitSlop={10}
          onPress={() => router.back()}
          style={styles.headerSide}
        >
          <Feather name="chevron-left" size={30} color={Colors.foundation.black} />
        </Pressable>
        <Text style={styles.headerTitle}>{'\uD504\uB85C\uD544 \uD3B8\uC9D1'}</Text>
        <Pressable
          accessibilityRole="button"
          hitSlop={10}
          onPress={handleSaveProfile}
          style={styles.headerSide}
        >
          <Text style={styles.saveText}>{'\uC800\uC7A5'}</Text>
        </Pressable>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardAvoider}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.content}
        >
          <View style={styles.avatarSection}>
            <View style={styles.avatarWrap}>
              <Image source={avatarSource} style={styles.avatar} resizeMode="cover" />
              <Pressable
                accessibilityRole="button"
                hitSlop={8}
                onPress={handlePressPhoto}
                style={styles.cameraButton}
              >
                <Feather name="camera" size={20} color={Colors.foundation.black} />
              </Pressable>
            </View>
            <Pressable accessibilityRole="button" onPress={handlePressPhoto}>
              <Text style={styles.photoButtonText}>{'\uC0AC\uC9C4 \uBCC0\uACBD'}</Text>
            </Pressable>
          </View>

          <View style={styles.formGroup}>
            <FieldLabel label="Name" />
            <AppTextInput
              value={name}
              onChangeText={setName}
              placeholder={'\uC774\uB984\uC744 \uC785\uB825\uD558\uC138\uC694'}
              placeholderTextColor={Colors.foundation.grey500}
              style={[styles.input, styles.singleLineInput, styles.nameInput]}
            />
          </View>

          <View style={styles.formGroup}>
            <FieldLabel label="Based in" />
            <Pressable
              accessibilityRole="button"
              onPress={() => setBasedInPickerOpen(true)}
              style={styles.basedInSelectField}
            >
              <Text
                numberOfLines={1}
                style={[styles.basedInSelectText, !basedIn && styles.basedInSelectPlaceholder]}
              >
                {basedIn || '\uB3C4\uC2DC \uB610\uB294 \uAD6D\uAC00\uB97C \uAC80\uC0C9\uD558\uC138\uC694'}
              </Text>
              <Feather name="chevron-right" size={18} color={Colors.foundation.black} />
            </Pressable>
          </View>

          <View style={styles.formGroup}>
            <View style={styles.labelRow}>
              <FieldLabel label="Bio" />
              <Text style={styles.countText}>{bio.length} / 120</Text>
            </View>
            <AppTextInput
              value={bio}
              onChangeText={setBio}
              placeholder={'\uB098\uB97C \uD45C\uD604\uD558\uB294 \uC9E7\uC740 \uBB38\uC7A5\uC744 \uC785\uB825\uD558\uC138\uC694'}
              placeholderTextColor={Colors.foundation.grey500}
              multiline
              maxLength={120}
              style={[styles.input, styles.bioInput]}
            />
          </View>

          <View style={styles.formGroup}>
            <FieldLabel label="Travel style" />
            <Text style={styles.helperText}>
              {'\uC88B\uC544\uD558\uB294 \uC5EC\uD589 \uBC29\uC2DD\uC744 \uC120\uD0DD\uD558\uBA74 \uAE30\uB85D \uC9C8\uBB38\uACFC \uC5EC\uD589 \uC694\uC57D\uC744 \uB354 \uC798 \uB9DE\uCDB0\uB4DC\uB824\uC694.'}
            </Text>
            <View style={styles.chipWrap}>
              {TRAVEL_STYLE_OPTIONS.map((style) => {
                const selected = travelStyles.includes(style);
                return (
                  <Pressable
                    accessibilityRole="button"
                    key={style}
                    onPress={() => toggleTravelStyle(style)}
                    style={[styles.styleChip, selected && styles.styleChipSelected]}
                  >
                    <Text style={[styles.styleChipText, selected && styles.styleChipTextSelected]}>
                      {style}
                    </Text>
                    {selected ? <Feather name="check" size={14} color={Colors.foundation.white} /> : null}
                  </Pressable>
                );
              })}
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
      <BasedInLocationPicker
        selectedPlace={basedInPlace}
        visible={isBasedInPickerOpen}
        onClose={() => setBasedInPickerOpen(false)}
        onSelect={handleSelectBasedIn}
      />
    </SafeAreaView>
  );
}

function BasedInLocationPicker({
  visible,
  selectedPlace,
  onClose,
  onSelect,
}: {
  visible: boolean;
  selectedPlace?: BasedInPlace;
  onClose: () => void;
  onSelect: (place: BasedInPlace) => void;
}) {
  const { height } = useWindowDimensions();
  const [query, setQuery] = React.useState('');
  const [isPresented, setPresented] = React.useState(visible);
  const sheetTranslateY = React.useRef(new Animated.Value(height)).current;
  const normalizedQuery = query.trim().toLowerCase();
  const recentPlaces = React.useMemo(
    () => (selectedPlace ? [selectedPlace] : [BASED_IN_CITY_OPTIONS[0]]),
    [selectedPlace],
  );
  const searchResults = React.useMemo(() => {
    if (!normalizedQuery) {
      return [];
    }

    return BASED_IN_CITY_OPTIONS.filter((place) => {
      const searchableText = [
        place.displayName,
        place.city,
        place.region,
        place.country,
        place.countryCode,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return searchableText.includes(normalizedQuery);
    });
  }, [normalizedQuery]);

  React.useEffect(() => {
    if (visible) {
      setPresented(true);
      setQuery('');
    }
  }, [visible]);

  React.useEffect(() => {
    if (!isPresented) {
      return undefined;
    }

    sheetTranslateY.stopAnimation();

    if (visible) {
      sheetTranslateY.setValue(height);
      const openAnimation = Animated.timing(sheetTranslateY, {
        toValue: 0,
        duration: BASED_IN_SHEET_ANIMATION_DURATION,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      });
      openAnimation.start();

      return () => openAnimation.stop();
    }

    const closeAnimation = Animated.timing(sheetTranslateY, {
      toValue: height,
      duration: BASED_IN_SHEET_ANIMATION_DURATION,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: true,
    });
    closeAnimation.start(({ finished }) => {
      if (finished) {
        setPresented(false);
      }
    });

    return () => closeAnimation.stop();
  }, [height, isPresented, sheetTranslateY, visible]);

  const handleUseCurrentLocation = React.useCallback(() => {
    Alert.alert(
      '\uD604\uC7AC \uC704\uCE58 \uC0AC\uC6A9',
      '\uD604\uC7AC \uC704\uCE58 \uAE30\uBC18 \uB3C4\uC2DC \uC120\uD0DD\uC740 \uCD94\uD6C4 \uC704\uCE58 \uAD8C\uD55C\uACFC \uC5ED\uC9C0\uC624\uCF54\uB529\uC744 \uC5F0\uACB0\uD560 \uC608\uC815\uC785\uB2C8\uB2E4.',
    );
  }, []);

  const handleRequestClose = React.useCallback(() => {
    if (visible) {
      onClose();
    }
  }, [onClose, visible]);

  const renderLocationRow = (place: BasedInPlace) => {
    const selected = selectedPlace?.placeId === place.placeId;

    return (
      <Pressable
        accessibilityRole="button"
        key={place.placeId ?? place.displayName}
        onPress={() => {
          if (visible) {
            onSelect(place);
          }
        }}
        style={[styles.locationResultRow, selected && styles.locationResultRowSelected]}
      >
        <View style={styles.locationIconWrap}>
          <Feather
            name={selected ? 'map-pin' : 'map-pin'}
            size={18}
            color={selected ? '#2F6BFF' : Colors.foundation.black}
          />
        </View>
        <View style={styles.locationResultTextBlock}>
          <Text style={styles.locationResultTitle}>{place.city}</Text>
          <Text style={styles.locationResultSubtitle}>{getBasedInSubtitle(place)}</Text>
        </View>
        {selected ? <Feather name="check" size={18} color={Colors.foundation.black} /> : null}
      </Pressable>
    );
  };

  if (!isPresented) {
    return null;
  }

  return (
    <Modal animationType="none" transparent visible={isPresented} onRequestClose={handleRequestClose}>
      <View style={styles.locationModalRoot}>
        <Pressable style={StyleSheet.absoluteFill} onPress={handleRequestClose} />
        <Animated.View
          style={[
            styles.locationSheet,
            { transform: [{ translateY: sheetTranslateY }] },
          ]}
        >
          <View style={styles.locationHandle} />
          <Text style={styles.locationTitle}>{'\uAE30\uBC18 \uC704\uCE58 \uC120\uD0DD'}</Text>
          <Text style={styles.locationDescription}>
            {'\uC815\uD655\uD55C \uC8FC\uC18C\uAC00 \uC544\uB2CC \uB3C4\uC2DC/\uC9C0\uC5ED \uB2E8\uC704\uB85C \uD45C\uC2DC\uD574\uC694'}
          </Text>

          <View style={styles.locationSearchBox}>
            <Feather name="search" size={18} color={Colors.foundation.grey600} />
            <AppTextInput
              value={query}
              onChangeText={setQuery}
              placeholder={'\uB3C4\uC2DC \uB610\uB294 \uAD6D\uAC00\uB97C \uAC80\uC0C9\uD558\uC138\uC694'}
              placeholderTextColor={Colors.foundation.grey500}
              style={styles.locationSearchInput}
            />
            {query ? (
              <Pressable accessibilityRole="button" onPress={() => setQuery('')} style={styles.locationClearButton}>
                <Feather name="x" size={14} color={Colors.foundation.white} />
              </Pressable>
            ) : null}
          </View>

          <Pressable
            accessibilityRole="button"
            onPress={handleUseCurrentLocation}
            style={styles.currentLocationButton}
          >
            <Feather name="map-pin" size={18} color="#2F6BFF" />
            <Text style={styles.currentLocationText}>{'\uD604\uC7AC \uC704\uCE58 \uC0AC\uC6A9'}</Text>
          </Pressable>

          <ScrollView
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.locationListContent}
          >
            {normalizedQuery ? (
              <>
                <Text style={styles.locationSectionLabel}>{'\uAC80\uC0C9 \uACB0\uACFC'}</Text>
                <View style={styles.locationResultGroup}>
                  {searchResults.length > 0 ? (
                    searchResults.map(renderLocationRow)
                  ) : (
                    <View style={styles.locationEmptyRow}>
                      <Text style={styles.locationEmptyText}>
                        {'\uAC80\uC0C9\uB41C \uB3C4\uC2DC\uAC00 \uC5C6\uC5B4\uC694.'}
                      </Text>
                    </View>
                  )}
                </View>
              </>
            ) : (
              <>
                <Text style={styles.locationSectionLabel}>{'\uCD5C\uADFC \uAC80\uC0C9'}</Text>
                <View style={styles.locationResultGroup}>
                  {recentPlaces.map((place) => (
                    <Pressable
                      accessibilityRole="button"
                      key={`recent-${place.placeId ?? place.displayName}`}
                      onPress={() => {
                        if (visible) {
                          onSelect(place);
                        }
                      }}
                      style={styles.recentLocationRow}
                    >
                      <Feather name="clock" size={18} color={Colors.foundation.black} />
                      <Text style={styles.recentLocationText}>{place.displayName}</Text>
                    </Pressable>
                  ))}
                </View>
              </>
            )}
          </ScrollView>

    
        </Animated.View>
      </View>
    </Modal>
  );
}

function FieldLabel({ label }: { label: string }) {
  return <Text style={styles.fieldLabel}>{label}</Text>;
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.light.bgScreen,
  },
  header: {
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xl,
  },
  headerSide: {
    width: 56,
    height: 40,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  headerTitle: {
    ...Typography.title2,
    color: Colors.foundation.black,
  },
  saveText: {
    ...Typography.body1Regular,
    color: Colors.foundation.black,
    alignSelf: 'flex-end',
  },
  keyboardAvoider: {
    flex: 1,
  },
  content: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing['4xl'],
    gap: Spacing['2xl'],
  },
  avatarSection: {
    alignItems: 'center',
    gap: Spacing.md,
  },
  avatarWrap: {
    width: 120,
    height: 120,
    borderRadius: 60,
    position: 'relative',
  },
  avatar: {
    width: '100%',
    height: '100%',
    borderRadius: 60,
    backgroundColor: Colors.foundation.grey100,
  },
  cameraButton: {
    position: 'absolute',
    right: -2,
    bottom: 4,
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.foundation.white,
    ...Shadows.cardSmall,
  },
  photoButtonText: {
    ...Typography.body2Emphasized,
    color: Colors.foundation.black,
  },
  formGroup: {
    gap: Spacing.sm,
  },
  fieldLabel: {
    ...Typography.body2Emphasized,
    color: Colors.foundation.black,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  input: {
    paddingHorizontal: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.foundation.grey100,
    borderRadius: Radius.sm,
    ...Typography.body2Regular,
    color: Colors.foundation.black,
    backgroundColor: Colors.foundation.white,
  },
  singleLineInput: {
    height: 52,
    paddingVertical: 0,
    textAlignVertical: 'center',
    includeFontPadding: true,
  },
  nameInput: {
    paddingTop: 0,
    paddingBottom: 0,
    lineHeight: undefined,
  },
  basedInSelectField: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.foundation.grey100,
    borderRadius: Radius.sm,
    backgroundColor: Colors.foundation.white,
  },
  basedInSelectText: {
    flex: 1,
    ...Typography.body2Regular,
    color: Colors.foundation.black,
  },
  basedInSelectPlaceholder: {
    color: Colors.foundation.grey500,
  },
  bioInput: {
    minHeight: 128,
    paddingVertical: Spacing.md,
    textAlignVertical: 'top',
  },
  helperText: {
    ...Typography.captionRegular,
    color: Colors.foundation.grey500,
  },
  countText: {
    ...Typography.captionRegular,
    color: Colors.foundation.grey500,
  },
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
    paddingTop: Spacing.xs,
  },
  styleChip: {
    minHeight: 40,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.foundation.grey100,
    borderRadius: Radius.full,
    backgroundColor: Colors.foundation.white,
  },
  styleChipSelected: {
    borderColor: Colors.foundation.black,
    backgroundColor: Colors.foundation.black,
  },
  styleChipText: {
    ...Typography.body2Regular,
    color: Colors.foundation.black,
  },
  styleChipTextSelected: {
    ...Typography.body2Emphasized,
    color: Colors.foundation.white,
  },
  locationModalRoot: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.52)',
  },
  locationSheet: {
    maxHeight: '78%',
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.md,
    paddingBottom: Spacing['3xl'],
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    backgroundColor: Colors.foundation.white,
  },
  locationHandle: {
    alignSelf: 'center',
    width: 52,
    height: 5,
    marginBottom: Spacing.xl,
    borderRadius: Radius.full,
    backgroundColor: Colors.foundation.grey300,
  },
  locationTitle: {
    ...Typography.title2,
    textAlign: 'center',
    color: Colors.foundation.black,
  },
  locationDescription: {
    ...Typography.captionRegular,
    marginTop: Spacing.sm,
    textAlign: 'center',
    color: Colors.foundation.grey600,
  },
  locationSearchBox: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.xl,
    paddingHorizontal: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.foundation.grey100,
    borderRadius: Radius.sm,
    backgroundColor: Colors.foundation.white,
  },
  locationSearchInput: {
    flex: 1,
    height: 52,
    paddingVertical: 0,
    paddingTop: 0,
    paddingBottom: 0,
    textAlignVertical: 'center',
    includeFontPadding: true,
    ...Typography.body2Regular,
    color: Colors.foundation.black,
  },
  locationClearButton: {
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.full,
    backgroundColor: Colors.foundation.grey300,
  },
  currentLocationButton: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.foundation.grey100,
    borderRadius: Radius.sm,
    backgroundColor: Colors.foundation.white,
  },
  currentLocationText: {
    ...Typography.body2Emphasized,
    color: '#2F6BFF',
  },
  locationListContent: {
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.lg,
  },
  locationSectionLabel: {
    ...Typography.captionEmphasized,
    marginBottom: Spacing.md,
    color: Colors.foundation.black,
  },
  locationResultGroup: {
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.foundation.grey100,
    borderRadius: Radius.sm,
    backgroundColor: Colors.foundation.white,
  },
  locationResultRow: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.foundation.grey100,
  },
  locationResultRowSelected: {
    borderWidth: 1,
    borderColor: '#7AA5FF',
    backgroundColor: 'rgba(47, 107, 255, 0.06)',
  },
  locationIconWrap: {
    width: 24,
    alignItems: 'center',
  },
  locationResultTextBlock: {
    flex: 1,
    gap: 2,
  },
  locationResultTitle: {
    ...Typography.body2Regular,
    color: Colors.foundation.black,
  },
  locationResultSubtitle: {
    ...Typography.captionRegular,
    color: Colors.foundation.grey600,
  },
  recentLocationRow: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.md,
  },
  recentLocationText: {
    ...Typography.body2Regular,
    color: Colors.foundation.black,
  },
  locationEmptyRow: {
    minHeight: 56,
    justifyContent: 'center',
    paddingHorizontal: Spacing.md,
  },
  locationEmptyText: {
    ...Typography.body2Regular,
    color: Colors.foundation.grey600,
  },
  locationCancelButton: {
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.foundation.grey100,
    borderRadius: Radius.sm,
    backgroundColor: Colors.foundation.white,
  },
  locationCancelText: {
    ...Typography.body2Emphasized,
    color: Colors.foundation.black,
  },
});
