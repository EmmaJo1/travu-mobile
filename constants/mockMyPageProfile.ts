import type { ImageSourcePropType } from 'react-native';

export const MOCK_MY_PAGE_PROFILE = {
  userName: 'User_name',
  profileImage: require('../assets/images/home-photo-candidate-2.png') as ImageSourcePropType,
  recordCount: 11,
  countryCount: 22,
  tripCount: 12,
  tagline: '여행을 기록하며 나를 만듭니다',
} as const;
