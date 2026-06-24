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
  dayDateKey?: string;
  addedPhotoUris?: string[];
}

export interface TimelinePhotoMetadata {
  id: string;
  uri?: string;
  imageSource?: ImageSourcePropType;
  takenAt?: string;
  dateTimeOriginal?: string;
  createdAt?: string;
  latitude?: number;
  longitude?: number;
  placeName?: string;
  categoryLabel?: string;
  cityLabel?: string;
}

type TimelinePhotoGroup = {
  id: string;
  photos: TimelinePhotoMetadata[];
  representativeTime: Date;
  placeName: string;
  categoryLabel: string;
  cityLabel: string;
  latitude?: number;
  longitude?: number;
};

const LOCATION_GROUP_RADIUS_METERS = 180;
const TIME_GROUP_WINDOW_MS = 90 * 60 * 1000;
const FALLBACK_IMAGE = require('../assets/images/home-photo-candidate-1.png');

// TODO: Replace mock timeline items with timeline generated from selected day's photo metadata.
// Use photo takenAt/EXIF time and GPS coordinates to group photos by place and time.
// timeLabel should be derived from the representative takenAt value of each photo group.
// TODO: Generate place detail records from photo metadata groups when media analysis is connected.
export const HOME_TIMELINE_ITEMS: HomeTimelineItem[] = [
  {
    id: 'notre-dame',
    dayDateKey: '2025-11-02',
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
    dayDateKey: '2025-11-02',
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
    dayDateKey: '2025-11-02',
    timeLabel: '6 PM',
    placeName: '루브르 박물관',
    categoryLabel: '관광명소',
    cityLabel: '파리',
    memoCount: 11,
    photoCount: 70,
    imageSource: require('../assets/images/home-photo-candidate-3.png'),
  },
];

export function generateHomeTimelineItemsForDay({
  selectedDateKey,
  photos,
  fallbackItems = HOME_TIMELINE_ITEMS,
}: {
  selectedDateKey: string;
  photos?: TimelinePhotoMetadata[];
  fallbackItems?: HomeTimelineItem[];
}): HomeTimelineItem[] {
  const selectedDayPhotos = (photos ?? []).filter((photo) => {
    const photoDate = getPhotoDate(photo);
    return photoDate ? toDateKey(photoDate) === selectedDateKey : false;
  });

  if (selectedDayPhotos.length === 0) {
    return fallbackItems.filter((item) => item.dayDateKey === selectedDateKey);
  }

  return groupTimelinePhotos(selectedDayPhotos)
    .sort((a, b) => a.representativeTime.getTime() - b.representativeTime.getTime())
    .map((group) => {
      const firstPhoto = group.photos[0];

      return {
        id: group.id,
        dayDateKey: selectedDateKey,
        timeLabel: formatTimelineTimeLabel(group.representativeTime),
        placeName: group.placeName,
        categoryLabel: group.categoryLabel,
        cityLabel: group.cityLabel,
        memoCount: 0,
        photoCount: group.photos.length,
        imageSource: firstPhoto?.imageSource ?? (firstPhoto?.uri ? { uri: firstPhoto.uri } : FALLBACK_IMAGE),
        addedPhotoUris: group.photos
          .map((photo) => photo.uri)
          .filter((uri): uri is string => Boolean(uri)),
      };
    });
}

function groupTimelinePhotos(photos: TimelinePhotoMetadata[]): TimelinePhotoGroup[] {
  return photos.reduce<TimelinePhotoGroup[]>((groups, photo) => {
    const photoTime = getPhotoDate(photo) ?? new Date(0);
    const matchingGroup = groups.find((group) => isPhotoInGroup(photo, photoTime, group));

    if (matchingGroup) {
      matchingGroup.photos.push(photo);
      if (photoTime.getTime() < matchingGroup.representativeTime.getTime()) {
        matchingGroup.representativeTime = photoTime;
      }
      return groups;
    }

    groups.push({
      id: createGroupId(photo, photoTime, groups.length),
      photos: [photo],
      representativeTime: photoTime,
      placeName: photo.placeName ?? (hasPhotoLocation(photo) ? '장소 확인 중' : '위치 미정'),
      categoryLabel: photo.categoryLabel ?? '사진 위치',
      cityLabel: photo.cityLabel ?? '',
      latitude: photo.latitude,
      longitude: photo.longitude,
    });

    return groups;
  }, []);
}

function isPhotoInGroup(
  photo: TimelinePhotoMetadata,
  photoTime: Date,
  group: TimelinePhotoGroup,
): boolean {
  const timeDiff = Math.abs(photoTime.getTime() - group.representativeTime.getTime());
  const isCloseInTime = timeDiff <= TIME_GROUP_WINDOW_MS;

  if (!hasPhotoLocation(photo) || group.latitude == null || group.longitude == null) {
    return isCloseInTime && group.placeName === '위치 미정';
  }

  const distance = getDistanceMeters(
    photo.latitude,
    photo.longitude,
    group.latitude,
    group.longitude,
  );

  return isCloseInTime && distance <= LOCATION_GROUP_RADIUS_METERS;
}

function getPhotoDate(photo: TimelinePhotoMetadata): Date | null {
  const timestamp = photo.dateTimeOriginal ?? photo.takenAt ?? photo.createdAt;
  if (!timestamp) {
    return null;
  }

  const date = new Date(timestamp);
  return Number.isNaN(date.getTime()) ? null : date;
}

function toDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function formatTimelineTimeLabel(date: Date): string {
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const period = hours >= 12 ? 'PM' : 'AM';
  const hour12 = hours % 12 || 12;

  if (minutes === 0) {
    return `${hour12} ${period}`;
  }

  return `${hour12}:${`${minutes}`.padStart(2, '0')} ${period}`;
}

function hasPhotoLocation(photo: TimelinePhotoMetadata): photo is TimelinePhotoMetadata & {
  latitude: number;
  longitude: number;
} {
  return typeof photo.latitude === 'number' && typeof photo.longitude === 'number';
}

function createGroupId(photo: TimelinePhotoMetadata, photoTime: Date, groupIndex: number): string {
  const locationKey = hasPhotoLocation(photo)
    ? `${photo.latitude.toFixed(4)}-${photo.longitude.toFixed(4)}`
    : 'unknown-location';

  return `timeline-${toDateKey(photoTime)}-${locationKey}-${groupIndex}`;
}

function getDistanceMeters(
  firstLatitude: number,
  firstLongitude: number,
  secondLatitude: number,
  secondLongitude: number,
): number {
  const earthRadiusMeters = 6371000;
  const firstLatRad = toRadians(firstLatitude);
  const secondLatRad = toRadians(secondLatitude);
  const deltaLat = toRadians(secondLatitude - firstLatitude);
  const deltaLon = toRadians(secondLongitude - firstLongitude);
  const haversine =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(firstLatRad) *
      Math.cos(secondLatRad) *
      Math.sin(deltaLon / 2) *
      Math.sin(deltaLon / 2);

  return earthRadiusMeters * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
}

function toRadians(value: number): number {
  return (value * Math.PI) / 180;
}
