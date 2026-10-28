import React from 'react';

import MapStateCard from '@/components/map/MapStateCard';
import type { TripPlacesMapProps } from '@/components/map/TripPlacesMap.types';

export default function TripPlacesMapWeb({
  height = 240,
  isError = false,
  isLoading = false,
  onRetry,
  style,
}: TripPlacesMapProps) {
  if (isLoading) {
    return <MapStateCard height={height} isLoading title="지도를 준비하고 있어요" style={style} />;
  }

  if (isError) {
    return (
      <MapStateCard
        description="네트워크 상태를 확인한 뒤 다시 시도해주세요."
        height={height}
        onRetry={onRetry}
        title="장소 지도를 불러오지 못했어요"
        style={style}
      />
    );
  }

  return (
    <MapStateCard
      description="여행지도는 Android와 iOS 앱에서 확인할 수 있어요."
      height={height}
      title="모바일 여행지도"
      style={style}
    />
  );
}
