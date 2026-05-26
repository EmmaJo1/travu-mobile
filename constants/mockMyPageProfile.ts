import type { ImageSourcePropType } from 'react-native';

import { FIGMA_IMAGES } from '@/constants/figmaImages';

export const MOCK_MY_PAGE_PROFILE = {
  userName: 'User_name',
  profileImage: FIGMA_IMAGES.profile.avatar,
  recordCount: 11,
  countryCount: 22,
  tripCount: 12,
  /** 사용자 자기소개/상태 메시지 — ProfileSummary tagline prop으로 전달 */
  tagline: '여행을 기록하며 나를 만듭니다',
} as const;
