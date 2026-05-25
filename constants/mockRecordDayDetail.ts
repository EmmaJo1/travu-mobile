import type { ImageSourcePropType } from 'react-native';

import type { DateBadgeListItem } from '@/components/record/DateBadgeList';
import type { DaySelectorItem } from '@/components/record/DaySelectorSheet';
import type { PlaceEntry } from '@/components/trip/PlaceEntryCard';
import {
  RECORD_DAY_ENTRY_IMAGES,
  RECORD_TRIP_IMAGES,
} from '@/constants/recordTripImages';

const SYDNEY_DAY_THUMBS = RECORD_TRIP_IMAGES.sydney.dayThumbnails;

export const RECORD_DAY_OPTIONS: DaySelectorItem[] = [
  {
    id: 'rd-1',
    dayNumber: 1,
    dateLabel: '2025.3.4',
    weekdayLabel: '화',
    photoCount: 42,
  },
  {
    id: 'rd-2',
    dayNumber: 2,
    dateLabel: '2025.3.5',
    weekdayLabel: '수',
    photoCount: 38,
  },
  {
    id: 'rd-3',
    dayNumber: 3,
    dateLabel: '2025.3.6',
    weekdayLabel: '목',
    photoCount: 48,
  },
  {
    id: 'rd-4',
    dayNumber: 4,
    dateLabel: '2025.3.7',
    weekdayLabel: '금',
    photoCount: 32,
  },
];

/** Figma day-recording-detail — DateBadge 가로 스크롤 행 */
export const RECORD_DAY_BADGES: DateBadgeListItem[] = [
  { id: 'rd-1', date: '3.4', day: '화', image: SYDNEY_DAY_THUMBS[0] },
  { id: 'rd-2', date: '3.5', day: '수', image: SYDNEY_DAY_THUMBS[1] },
  { id: 'rd-3', date: '3.6', day: '목', image: SYDNEY_DAY_THUMBS[2] },
  { id: 'rd-4', date: '3.7', day: '금', image: SYDNEY_DAY_THUMBS[3] },
];

export interface RecordDayMockEntry extends PlaceEntry {
  photoSources?: ImageSourcePropType[];
}

/** Figma 1207:2245 PlaceEntryCard — 원본 텍스트·이미지 */
export const RECORD_DAY_ENTRIES: RecordDayMockEntry[] = [
  {
    id: 'entry-1',
    time: '3 PM',
    place: '본다이 비치',
    category: '관광명소',
    city: '시드니',
    text: '호주는 남반구라 3월에도 너무 후덥지근했다. 시드니에서 제일 유명한 바닷가라 그런지 사람이 정말 많았다. 항상 사진으로만 보았던 아이스버그 수영장을 직접 볼 수 있어서 좋았다.',
    photoSources: [
      RECORD_DAY_ENTRY_IMAGES.bondi1,
      RECORD_DAY_ENTRY_IMAGES.bondi2,
      RECORD_DAY_ENTRY_IMAGES.bondi3,
      RECORD_DAY_ENTRY_IMAGES.bondi4,
    ],
    onEdit: () => {},
  },
  {
    id: 'entry-2',
    time: '6 PM',
    place: '천문대',
    category: '관광명소',
    city: '파리',
    text: '어제도 갔지만 너무 좋아서 오늘도 또 갔다. 역시 천문대에서 보는 노을은 정말이지 아름다웠다. 다만 아쉬운 점은 한국인이 너무 많아서 그냥 한강에 온 것 같은 기분이었다',
    photoSources: [
      RECORD_DAY_ENTRY_IMAGES.observatory1,
      RECORD_DAY_ENTRY_IMAGES.observatory2,
    ],
    onEdit: () => {},
  },
  {
    id: 'entry-3',
    time: '8 PM',
    place: '글렌모어 호텔',
    category: '음식점',
    city: '시드니',
    text: '오페라 하우스 야경을 볼 수 있는 루프탑으로 유명한 글렌모어 호텔에 갔다. 역시 유명한 곳이라서 그런지 루프탑은 자리를 잡기 어려웠다. 난간에서 잠깐 즐기며 야경을 바라봤는데 정말 상쾌하고 아름다웠다.',
    photoSources: [
      RECORD_DAY_ENTRY_IMAGES.glenmore1,
      RECORD_DAY_ENTRY_IMAGES.glenmore2,
      RECORD_DAY_ENTRY_IMAGES.glenmore3,
      RECORD_DAY_ENTRY_IMAGES.glenmore4,
    ],
    onEdit: () => {},
  },
];

export const DEFAULT_RECORD_DAY = RECORD_DAY_OPTIONS[2];
