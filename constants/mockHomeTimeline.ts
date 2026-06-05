import type { ImageSourcePropType } from 'react-native';

export interface HomeTimelineItem {
  id: string;
  timeLabel: string;
  placeName: string;
  categoryLabel: string;
  cityLabel: string;
  memoCount: number;
  photoCount: number;
  imageSource: ImageSourcePropType;
}

export const HOME_TIMELINE_ITEMS: HomeTimelineItem[] = [
  {
    id: 'notre-dame',
    timeLabel: '2 PM',
    placeName: '노트르담 대성당',
    categoryLabel: '관광명소',
    cityLabel: '파리',
    memoCount: 5,
    photoCount: 50,
    imageSource: require('../assets/images/home-photo-candidate-1.png'),
  },
  {
    id: 'sainte-chapelle',
    timeLabel: '4 PM',
    placeName: '생트 샤펠',
    categoryLabel: '관광명소',
    cityLabel: '파리',
    memoCount: 4,
    photoCount: 40,
    imageSource: require('../assets/images/home-photo-candidate-2.png'),
  },
  {
    id: 'louvre',
    timeLabel: '6 PM',
    placeName: '루브르 박물관',
    categoryLabel: '관광명소',
    cityLabel: '파리',
    memoCount: 11,
    photoCount: 70,
    imageSource: require('../assets/images/home-photo-candidate-3.png'),
  },
];
