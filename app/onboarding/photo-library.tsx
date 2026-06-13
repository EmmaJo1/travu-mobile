import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { type Href, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import {
  Image,
  Pressable,
  StyleSheet,
  View,
  type ImageSourcePropType,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import Text from '@/components/common/AppText';
import OnboardingSwipeContainer from '@/components/onboarding/OnboardingSwipeContainer';
import { FIGMA_IMAGES } from '@/constants/figmaImages';
import { Colors, FontFamily, Radius, Typography } from '@/constants/theme';
import { usePhotoImportFlow } from '@/hooks/usePhotoImportFlow';

const WARM_WHITE = Colors.warm.white;
const MAIN_THUMBNAILS = FIGMA_IMAGES.record.sydney.dayThumbnails;
const LEFT_THUMBNAILS = FIGMA_IMAGES.record.portugal.dayThumbnails;
const RIGHT_THUMBNAILS = FIGMA_IMAGES.record.kyoto.dayThumbnails;

export default function OnboardingPhotoLibraryScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { skipOnboarding } = usePhotoImportFlow();

  const helperBottom = Math.max(insets.bottom + 2, 22);
  const skipBottom = helperBottom + 28;
  const connectBottom = skipBottom + 42;

  const handleConnectPhotoLibrary = React.useCallback(() => {
    // TODO: Restore requestAccessAndStartAnalysis()
    // after real photo library permission flow is implemented.
    router.push('/onboarding/analyzing' as Href);
  }, [router]);

  const handleSkip = React.useCallback(async () => {
    await skipOnboarding();
    router.replace('/(tabs)' as Href);
  }, [router, skipOnboarding]);

  return (
    <OnboardingSwipeContainer currentStep="photo-library" style={styles.screen}>
      <StatusBar style="dark" />

      <View style={styles.contentLayer}>
        <View style={styles.pageIndicator}>
          {[0, 1, 2, 3].map((index) => (
            <View
              key={index}
              style={[
                styles.pageDot,
                index === 1 && styles.pageDotActive,
              ]}
            />
          ))}
        </View>

        <View style={styles.copyBlock}>
          <Text style={styles.title}>
            지난 여행도{'\n'}
            다시 꺼내 볼까요?
          </Text>

          <Text style={styles.description}>
            사진첩을 연결하면 촬영 시간과 위치를 기준으로{'\n'}
            지난 여행의 순간을 찾아드려요
          </Text>
        </View>

        <View pointerEvents="none" style={styles.polaroidStage}>
          <BackgroundPolaroidCard
            variant="left"
            coverImage={FIGMA_IMAGES.archive.photoFrame}
            thumbnails={LEFT_THUMBNAILS}
            style={styles.leftBackCard}
          />

          <BackgroundPolaroidCard
            variant="right"
            coverImage={FIGMA_IMAGES.home.heroParis}
            thumbnails={RIGHT_THUMBNAILS}
            style={styles.rightBackCard}
          />

          <PhotoMemoryCard
            coverImage={FIGMA_IMAGES.record.sydney.cover}
            thumbnails={MAIN_THUMBNAILS}
            style={styles.mainCard}
          />
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="사진첩 연결하기"
          onPress={handleConnectPhotoLibrary}
          style={({ pressed }) => [
            styles.connectButton,
            { bottom: connectBottom },
            pressed && styles.connectButtonPressed,
          ]}
        >
          <Text style={styles.connectButtonLabel}>사진첩 연결하기</Text>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="사진첩 연결 나중에 하기"
          hitSlop={8}
          onPress={handleSkip}
          style={[styles.skipButton, { bottom: skipBottom }]}
        >
          <Text style={styles.skipLabel}>나중에 할게요</Text>
        </Pressable>

        <View style={[styles.helperRow, { bottom: helperBottom }]}>
          <Feather name="info" size={12} color={Colors.foundation.grey400} />
          <Text style={styles.helperText}>언제든 추가할 수 있어요</Text>
        </View>
      </View>
    </OnboardingSwipeContainer>
  );
}

function PhotoMemoryCard({
  coverImage,
  thumbnails,
  style,
}: {
  coverImage: ImageSourcePropType;
  thumbnails: ImageSourcePropType[];
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[styles.polaroidCard, style]}>
      <View style={styles.mainImageWrap}>
        <Image source={coverImage} style={styles.cardImage} resizeMode="cover" />
        <LinearGradient
          pointerEvents="none"
          colors={[
            'rgba(0, 0, 0, 0)',
            'rgba(51, 51, 51, 0.18)',
            'rgba(51, 51, 51, 0.70)',
          ]}
          locations={[0.68, 0.84, 1]}
          style={StyleSheet.absoluteFillObject}
        />
        <View style={styles.mainCardCopy}>
          <Text style={styles.mainCardCity}>시드니</Text>
          <Text style={styles.mainCardMeta}>2025.3.5-3.15</Text>
          <Text style={styles.mainCardPhotoCount}>743 photos</Text>
        </View>
      </View>

      <View style={styles.thumbnailRow}>
        {thumbnails.slice(0, 5).map((thumbnail, index) => (
          <Image
            key={index}
            source={thumbnail}
            style={styles.thumbnail}
            resizeMode="cover"
          />
        ))}
      </View>
    </View>
  );
}

function BackgroundPolaroidCard({
  variant,
  coverImage,
  thumbnails,
  style,
}: {
  variant: 'left' | 'right';
  coverImage: ImageSourcePropType;
  thumbnails: ImageSourcePropType[];
  style?: StyleProp<ViewStyle>;
}) {
  const cardImageStyle =
    variant === 'right' ? styles.rightBackgroundCardImage : styles.leftBackgroundCardImage;
  const thumbnailStyles =
    variant === 'right' ? RIGHT_BACKGROUND_THUMBNAIL_STYLES : LEFT_BACKGROUND_THUMBNAIL_STYLES;

  return (
    <View style={[styles.backgroundCard, style]}>
      <Image source={coverImage} style={cardImageStyle} resizeMode="cover" />
      {thumbnails.slice(0, 5).map((thumbnail, index) => (
        <Image
          key={index}
          source={thumbnail}
          style={[styles.backgroundThumbnail, thumbnailStyles[index]]}
          resizeMode="cover"
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: WARM_WHITE,
  },
  contentLayer: {
    ...StyleSheet.absoluteFillObject,
  },
  pageIndicator: {
    position: 'absolute',
    top: 88,
    left: '50%',
    width: 108,
    height: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 20,
    transform: [{ translateX: -54 }],
  },
  pageDot: {
    width: 12,
    height: 12,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: '#C3C3C3',
    backgroundColor: Colors.foundation.white,
  },
  pageDotActive: {
    borderColor: Colors.foundation.black,
    backgroundColor: Colors.foundation.black,
  },
  copyBlock: {
    position: 'absolute',
    top: 145,
    left: 20,
    right: 20,
  },
  title: {
    width: 198,
    ...Typography.title1,
    color: Colors.foundation.black,
    letterSpacing: 0,
  },
  description: {
    marginTop: 12,
    maxWidth: 310,
    ...Typography.body1Regular,
    color: Colors.foundation.grey600,
    letterSpacing: 0,
  },
  polaroidStage: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 650,
  },
  backgroundCard: {
    width: 203,
    height: 283,
    backgroundColor: Colors.foundation.white,
    borderRadius: Radius.xs,
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1.77 },
    shadowOpacity: 0.25,
    shadowRadius: 1.77,
    elevation: 2,
  },
  leftBackCard: {
    position: 'absolute',
    left: -102,
    top: 352,
    opacity: 0.8,
    transform: [{ rotate: '-5.13deg' }],
    zIndex: 1,
  },
  rightBackCard: {
    position: 'absolute',
    right: -43,
    top: 355,
    opacity: 0.8,
    transform: [{ rotate: '4.35deg' }],
    zIndex: 1,
  },
  leftBackgroundCardImage: {
    position: 'absolute',
    left: 14.01,
    top: 14.47,
    width: 178.06,
    height: 211.9,
  },
  rightBackgroundCardImage: {
    position: 'absolute',
    left: 17.16,
    top: 14.36,
    width: 178.06,
    height: 211.9,
  },
  backgroundThumbnail: {
    position: 'absolute',
    width: 31.49,
    height: 32.86,
  },
  polaroidCard: {
    position: 'absolute',
    width: 227,
    height: 314,
    top: 0,
    alignSelf: 'center',
    zIndex: 3,
    borderRadius: Radius.xs,
    backgroundColor: Colors.foundation.white,
    shadowColor: '#000000',
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
  },
  mainCard: {
    position: 'absolute',
    top: 328,
    left: '50%',
    transform: [{ translateX: -113 }],
  },
  mainImageWrap: {
    position: 'absolute',
    left: 14,
    right: 13,
    top: 17,
    height: 230,
    overflow: 'hidden',
  },
  cardImage: {
    width: '100%',
    height: '100%',
  },
  mainCardCopy: {
    position: 'absolute',
    left: 11,
    bottom: 12,
    gap: 2,
  },
  mainCardCity: {
    fontFamily: FontFamily.pretendardSemiBold,
    fontSize: 14,
    lineHeight: 20,
    color: Colors.foundation.white,
    letterSpacing: 0,
  },
  mainCardMeta: {
    fontFamily: FontFamily.pretendard,
    fontSize: 12,
    lineHeight: 16,
    color: Colors.foundation.white,
    letterSpacing: 0,
  },
  mainCardPhotoCount: {
    fontFamily: FontFamily.pretendardMedium,
    fontSize: 12,
    lineHeight: 16,
    color: Colors.foundation.white,
    letterSpacing: 0,
  },
  thumbnailRow: {
    position: 'absolute',
    left: 17,
    right: 17,
    bottom: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  thumbnail: {
    width: 34,
    height: 36,
  },
  connectButton: {
    position: 'absolute',
    left: 35,
    right: 35,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.sm,
    backgroundColor: Colors.foundation.black,
  },
  connectButtonPressed: {
    opacity: 0.82,
  },
  connectButtonLabel: {
    ...Typography.body2Emphasized,
    color: Colors.foundation.white,
    textAlign: 'center',
    letterSpacing: 0,
  },
  skipButton: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  skipLabel: {
    ...Typography.body2Emphasized,
    color: Colors.foundation.grey600,
    textAlign: 'center',
    textDecorationLine: 'underline',
    letterSpacing: 0,
  },
  helperRow: {
    position: 'absolute',
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  helperText: {
    ...Typography.captionEmphasized,
    color: Colors.foundation.grey400,
    letterSpacing: 0,
  },
});

const LEFT_BACKGROUND_THUMBNAIL_STYLES = [
  { left: 33.79, top: 236.55 },
  { left: 70.18, top: 236.55 },
  { left: 106.55, top: 236.55 },
  { left: 142.99, top: 236.55 },
  { left: 179.36, top: 236.55 },
] as const;

const RIGHT_BACKGROUND_THUMBNAIL_STYLES = [
  { left: 14.06, top: 236.55 },
  { left: 50.48, top: 236.55 },
  { left: 86.88, top: 236.55 },
  { left: 123.38, top: 236.55 },
  { left: 159.83, top: 236.55 },
] as const;
