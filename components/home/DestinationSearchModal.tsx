import React from 'react';

import DestinationSelectModal from '@/components/common/DestinationSelectModal';
import type { DestinationOption } from '@/constants/mockTripDestinations';

interface DestinationSearchModalProps {
  visible: boolean;
  currentDestination: DestinationOption;
  onCancel: () => void;
  onSave: (destination: DestinationOption) => void;
}

export default function DestinationSearchModal({
  visible,
  currentDestination,
  onCancel,
  onSave,
}: DestinationSearchModalProps) {
  return (
    <DestinationSelectModal
      visible={visible}
      selectedDestination={currentDestination}
      initialScope="domestic"
      initialCategoryId="popular"
      onClose={onCancel}
      onSelectDestination={onSave}
    />
  );
}
