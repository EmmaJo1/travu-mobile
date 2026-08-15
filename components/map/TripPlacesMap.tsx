import React from 'react';

import MapStateCard from '@/components/map/MapStateCard';
import type { TripPlacesMapProps } from '@/components/map/TripPlacesMap.types';

export default function TripPlacesMap({
  emptyDescription = '장소에 위치 정보를 추가하면 지도에 표시돼요.',
  emptyTitle = '지도에 표시할 장소가 없어요',
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
      description={emptyDescription}
      height={height}
      title={emptyTitle}
      style={style}
    />
  );
}
