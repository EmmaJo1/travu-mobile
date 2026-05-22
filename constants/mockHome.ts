import type { ImageSourcePropType } from 'react-native';

export interface HomePhotoCandidate {
  id: string;
  image: ImageSourcePropType;
  title: string;
}

export interface HomeMockData {
  currentTrip: {
    destination: string;
    dateLabel: string;
    dayLabel: string;
    heroImage: ImageSourcePropType;
  };
  todaySummary: {
    distanceKm: number;
    visitedPlacesCount: number;
    recordedMomentsCount: number;
  };
  reflectionPrompt: {
    title: string;
    subtitle: string;
  };
  photoCandidates: HomePhotoCandidate[];
}

export const HOME_MOCK_DATA: HomeMockData = {
  currentTrip: {
    destination: 'Paris',
    dateLabel: '8. 25 Mon',
    dayLabel: 'Day 1',
    heroImage: require('../assets/images/home-hero-paris.png'),
  },
  todaySummary: {
    distanceKm: 20,
    visitedPlacesCount: 3,
    recordedMomentsCount: 7,
  },
  reflectionPrompt: {
    title: '오늘의 사진',
    subtitle: '오늘 가장 설렜던 순간은 언제인가요?',
  },
  photoCandidates: [
    {
      id: 'photo-1',
      image: require('../assets/images/home-photo-candidate-1.png'),
      title: 'Photo 1',
    },
    {
      id: 'photo-2',
      image: require('../assets/images/home-photo-candidate-2.png'),
      title: 'Photo 2',
    },
    {
      id: 'photo-3',
      image: require('../assets/images/home-photo-candidate-3.png'),
      title: 'Photo 3',
    },
  ],
};
