import { Feather } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import AppTextInput from '@/components/common/AppTextInput';
import Text from '@/components/common/AppText';
import { MOCK_MY_PAGE_PROFILE } from '@/constants/mockMyPageProfile';
import { Colors, Radius, Shadows, Spacing, Typography } from '@/constants/theme';
import { useUserProfile } from '@/providers/UserProfileProvider';

const TRAVEL_STYLE_OPTIONS = [
  'Photo walk',
  'Solo trip',
  'Slow travel',
  'Art & museum',
  'Nature',
  'Food',
  'City wandering',
] as const;

export default function ProfileEditScreen() {
  const router = useRouter();
  const { profile, updateProfile } = useUserProfile();
  const [name, setName] = React.useState(profile.name);
  const [basedIn, setBasedIn] = React.useState(profile.basedIn);
  const [bio, setBio] = React.useState(profile.bio);
  const [travelStyles, setTravelStyles] = React.useState<string[]>(profile.travelStyles);
  const [profileImageUri, setProfileImageUri] = React.useState(profile.profileImageUri);
  const showBasedInPlaceholder = basedIn.length === 0;
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
      bio: bio.trim() || MOCK_MY_PAGE_PROFILE.tagline,
      travelStyles,
      profileImageUri,
    });
    router.back();
  }, [basedIn, bio, name, profileImageUri, router, travelStyles, updateProfile]);

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
              style={[styles.input, styles.singleLineInput]}
            />
          </View>

          <View style={styles.formGroup}>
            <FieldLabel label="Based in" />
            <View style={styles.basedInInputFrame}>
              <AppTextInput
                value={basedIn}
                onChangeText={setBasedIn}
                placeholder=""
                placeholderTextColor={Colors.foundation.grey500}
                style={styles.basedInInput}
              />
              {showBasedInPlaceholder ? (
                <Text pointerEvents="none" style={styles.basedInPlaceholder}>
                  {'\uB3C4\uC2DC\uB97C \uC785\uB825\uD558\uC138\uC694'}
                </Text>
              ) : null}
            </View>
            <Text style={styles.helperText}>
              {'\uD3C9\uC18C \uC0DD\uD65C\uD558\uB294 \uB3C4\uC2DC\uB97C \uAE30\uC900\uC73C\uB85C \uC5EC\uD589 \uC0AC\uC9C4\uC744 \uB354 \uC815\uD655\uD558\uAC8C \uAC10\uC9C0\uD574\uC694.'}
            </Text>
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
    </SafeAreaView>
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
    includeFontPadding: false,
  },
  basedInInputFrame: {
    height: 52,
    borderWidth: 1,
    borderColor: Colors.foundation.grey100,
    borderRadius: Radius.sm,
    backgroundColor: Colors.foundation.white,
    position: 'relative',
  },
  basedInInput: {
    height: 50,
    paddingHorizontal: Spacing.lg,
    paddingVertical: 0,
    textAlignVertical: 'center',
    includeFontPadding: false,
    ...Typography.body2Regular,
    color: Colors.foundation.black,
    backgroundColor: 'transparent',
  },
  basedInPlaceholder: {
    position: 'absolute',
    left: Spacing.lg,
    right: Spacing.lg,
    top: Spacing.lg,
    ...Typography.body2Regular,
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
});
