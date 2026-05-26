import React from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import TripListCard, { type TripListItem } from '@/components/trip/TripListCard';

const CARDS_PER_ROW = 3;
const CARD_WIDTH = 101;
/** Figma TripListCardList — 카드 열 간격 */
const COLUMN_GAP = 16;
/** Figma: 선반(shelf)과 다음 카드 줄 caption 사이 간격 */
const SHELF_TO_NEXT_ROW_GAP = 16;

function chunkRows<T>(items: T[], size: number): T[][] {
  const rows: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    rows.push(items.slice(i, i + size));
  }
  return rows;
}

interface TripListCardListProps {
  trips: TripListItem[];
  onPressTrip: (trip: TripListItem) => void;
  style?: StyleProp<ViewStyle>;
}

/** Figma TripListCardList — 3열 카드 row + 바로 아래 shelf */
export default function TripListCardList({ trips, onPressTrip, style }: TripListCardListProps) {
  const rows = chunkRows(trips, CARDS_PER_ROW);

  return (
    <View style={[styles.list, style]}>
      {rows.map((rowTrips, rowIndex) => (
        <View key={rowIndex} style={[styles.rowGroup, rowIndex > 0 && styles.rowGroupSpaced]}>
          <View style={styles.row}>
            {rowTrips.map((trip) => (
              <TripListCard
                key={trip.id}
                trip={trip}
                onPress={() => onPressTrip(trip)}
                style={styles.card}
              />
            ))}
          </View>
          <View style={styles.shelf} />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    width: '100%',
  },
  rowGroup: {
    width: '100%',
  },
  rowGroupSpaced: {
    marginTop: SHELF_TO_NEXT_ROW_GAP,
  },
  row: {
    flexDirection: 'row',
    columnGap: COLUMN_GAP,
    justifyContent: 'center',
    width: '100%',
  },
  card: {
    width: CARD_WIDTH,
  },
  shelf: {
    width: '100%',
    height: 8,
    backgroundColor: '#5A4040',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
  },
});
