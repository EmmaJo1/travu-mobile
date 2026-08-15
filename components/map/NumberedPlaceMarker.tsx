import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Marker } from 'react-native-maps';

import Text from '@/components/common/AppText';
import { Colors, Radius, Shadows, Typography } from '@/constants/theme';
import type { TripMapMarker } from '@/services/maps/tripMapData';

interface NumberedPlaceMarkerProps {
  marker: TripMapMarker;
  onPress?: (marker: TripMapMarker) => void;
  selected?: boolean;
}

export default function NumberedPlaceMarker({
  marker,
  onPress,
  selected = false,
}: NumberedPlaceMarkerProps) {
  return (
    <Marker
      accessibilityLabel={`${marker.number}번 장소`}
      coordinate={{ latitude: marker.latitude, longitude: marker.longitude }}
      identifier={marker.id}
      onPress={() => onPress?.(marker)}
      tracksViewChanges={selected}
      zIndex={selected ? 2 : 1}
    >
      <View style={[styles.marker, selected && styles.markerSelected]}>
        <Text style={[styles.number, selected && styles.numberSelected]}>{marker.number}</Text>
      </View>
    </Marker>
  );
}

const styles = StyleSheet.create({
  marker: {
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Colors.foundation.white,
    borderRadius: Radius.full,
    backgroundColor: Colors.foundation.black,
    ...Shadows.cardSmall,
  },
  markerSelected: {
    width: 36,
    height: 36,
    backgroundColor: Colors.foundation.white,
    borderColor: Colors.foundation.black,
  },
  number: {
    ...Typography.captionEmphasized,
    color: Colors.foundation.white,
    textAlign: 'center',
  },
  numberSelected: {
    color: Colors.foundation.black,
  },
});
