import { FIGMA_IMAGES } from '@/constants/figmaImages';
import { RECORD_TRIP_IMAGES } from '@/constants/recordTripImages';
import type {
  PhotoImportProvider,
  PhotoImportStatus,
  PhotoImportTripCandidate,
} from '@/services/photoImport/types';

export const MOCK_PHOTO_IMPORT_CANDIDATES: PhotoImportTripCandidate[] = [
  {
    id: 'paris-2025',
    city: '파리',
    country: '프랑스',
    dateRange: '2025. 8. 25 - 9. 2',
    photoCount: 600,
    image: FIGMA_IMAGES.archive.photoFrame,
    initiallySelected: true,
  },
  {
    id: 'new-york-2026',
    city: '뉴욕',
    country: '미국',
    dateRange: '2026. 1. 15 - 1. 30',
    photoCount: 160,
    image: RECORD_TRIP_IMAGES.sydney.dayThumbnails[1],
    initiallySelected: true,
  },
  {
    id: 'kyoto-2026',
    city: '교토',
    country: '일본',
    dateRange: '2026. 3. 30 - 4. 3',
    photoCount: 160,
    image: RECORD_TRIP_IMAGES.kyoto.cover,
    initiallySelected: false,
  },
];

export const MOCK_PHOTO_IMPORT_TRIP_COUNT = MOCK_PHOTO_IMPORT_CANDIDATES.length;

let mockStatus: PhotoImportStatus = 'not_started';
let savedCandidateIds: string[] = [];

export const mockPhotoImportProvider: PhotoImportProvider = {
  async requestPhotoLibraryAccess() {
    // TODO: Replace mock permission result with real photo library permission request.
    return 'granted';
  },
  async startAnalysis() {
    mockStatus = 'analyzing';
  },
  async getStatus() {
    return mockStatus;
  },
  async getCandidates() {
    return MOCK_PHOTO_IMPORT_CANDIDATES;
  },
  async saveCandidates(candidateIds: string[]) {
    savedCandidateIds = candidateIds;
    mockStatus = 'reviewed';
  },
  async skipOnboarding() {
    mockStatus = 'skipped';
    savedCandidateIds = [];
  },
};
