import React, { useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import MapView, { PROVIDER_GOOGLE } from 'react-native-maps';

import Text from '@/components/common/AppText';
import MapStateCard from '@/components/map/MapStateCard';
import NumberedPlaceMarker from '@/components/map/NumberedPlaceMarker';
import type { TripPlacesMapProps } from '@/components/map/TripPlacesMap.types';
import { Colors, Radius, Spacing, Typography } from '@/constants/theme';
import { getMapViewport } from '@/services/maps/viewport';

const MAP_EDGE_PADDING = { bottom: 44, left: 36, right: 36, top: 44 };

export default function TripPlacesMap({
  emptyDescription = '장소에 위치 정보를 추가하면 지도에 표시돼요.',
  emptyTitle = '지도에 표시할 장소가 없어요',
  distanceKm,
  errorDescription = '네트워크 상태를 확인한 뒤 다시 시도해주세요.',
  excludedCoordinateCount = 0,
  height = 240,
  isError = false,
  isLoading = false,
  markerVariant = 'numbered',
  markers,
  onMarkerPress,
  onRetry,
  selectedMarkerId,
  style,
}: TripPlacesMapProps) {
  const mapRef = useRef<MapView>(null);
  const [isMapReady, setMapReady] = useState(false);
  const coordinates = useMemo(
    () => markers.map(({ latitude, longitude }) => ({ latitude, longitude })),
    [markers],
  );
  const coordinateSignature = coordinates
    .map(({ latitude, longitude }) => `${latitude}:${longitude}`)
    .join('|');

  useEffect(() => {
    if (!isMapReady || !mapRef.current) {
      return;
    }

    const viewport = getMapViewport(coordinates);
    if (viewport.type === 'single') {
      mapRef.current.animateToRegion({
        latitude: viewport.coordinate.latitude,
        longitude: viewport.coordinate.longitude,
        latitudeDelta: viewport.latitudeDelta,
        longitudeDelta: viewport.longitudeDelta,
      }, 280);
    } else if (viewport.type === 'bounds') {
      mapRef.current.fitToCoordinates(viewport.coordinates, {
        animated: true,
        edgePadding: MAP_EDGE_PADDING,
      });
    }
    // Refit only when the displayed coordinate set changes, never on user gestures.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coordinateSignature, isMapReady]);

  if (isLoading) {
    return <MapStateCard height={height} isLoading title="지도를 준비하고 있어요" style={style} />;
  }

  if (isError) {
    return (
      <MapStateCard
        description={errorDescription}
        height={height}
        onRetry={onRetry}
        title="장소 지도를 불러오지 못했어요"
        style={style}
      />
    );
  }

  if (markers.length === 0) {
    return (
      <MapStateCard
        description={emptyDescription}
        height={height}
        title={emptyTitle}
        style={style}
      />
    );
  }

  const firstMarker = markers[0];

  return (
    <View style={[styles.container, { height }, style]}>
      <MapView
        ref={mapRef}
        initialRegion={{
          latitude: firstMarker.latitude,
          longitude: firstMarker.longitude,
          latitudeDelta: 0.018,
          longitudeDelta: 0.018,
        }}
        mapPadding={MAP_EDGE_PADDING}
        onMapReady={() => setMapReady(true)}
        provider={PROVIDER_GOOGLE}
        showsMyLocationButton={false}
        showsUserLocation={false}
        style={StyleSheet.absoluteFill}
      >
        {markers.map((marker) => (
          <NumberedPlaceMarker
            key={`${marker.id}-${marker.number}-${markerVariant}`}
            marker={marker}
            onPress={onMarkerPress}
            selected={marker.id === selectedMarkerId}
            variant={markerVariant}
          />
        ))}
      </MapView>
      {distanceKm != null ? (
        <View pointerEvents="none" style={styles.distanceNotice}>
          <Text style={styles.distanceNoticeText}>
            기록된 장소 기준 예상 이동 · {distanceKm.toLocaleString()} km
          </Text>
        </View>
      ) : null}
      {excludedCoordinateCount > 0 ? (
        <View pointerEvents="none" style={styles.partialNotice}>
          <Text style={styles.partialNoticeText}>
            {excludedCoordinateCount}개 장소는 위치 정보가 없어 지도에서 제외됐어요.
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    maxWidth: 350,
    alignSelf: 'center',
    overflow: 'hidden',
    borderRadius: Radius.sm,
    backgroundColor: Colors.foundation.white,
  },
  partialNotice: {
    position: 'absolute',
    right: Spacing.sm,
    bottom: Spacing.sm,
    left: Spacing.sm,
    alignItems: 'center',
  },
  distanceNotice: {
    position: 'absolute',
    top: Spacing.sm,
    left: Spacing.sm,
  },
  distanceNoticeText: {
    ...Typography.captionRegular,
    overflow: 'hidden',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.full,
    color: Colors.foundation.grey800,
    backgroundColor: 'rgba(255, 255, 255, 0.90)',
  },
  partialNoticeText: {
    ...Typography.captionRegular,
    overflow: 'hidden',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.full,
    color: Colors.foundation.grey800,
    backgroundColor: 'rgba(255, 255, 255, 0.90)',
    textAlign: 'center',
  },
});
