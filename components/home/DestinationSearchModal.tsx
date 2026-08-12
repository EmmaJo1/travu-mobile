import React from 'react';

import DestinationSelectModal from '@/components/common/DestinationSelectModal';
import type { DestinationOption } from '@/constants/mockTripDestinations';

interface DestinationSearchModalProps {
  visible: boolean;
  currentDestinations: DestinationOption[];
  isSaving?: boolean;
  onCancel: () => void;
  onSave: (destinations: DestinationOption[]) => void;
}

export default function DestinationSearchModal({
  visible,
  currentDestinations,
  isSaving = false,
  onCancel,
  onSave,
}: DestinationSearchModalProps) {
  return (
    <DestinationSelectModal
      visible={visible}
      selectedDestinations={currentDestinations}
      isConfirming={isSaving}
      initialScope="domestic"
      initialCategoryId="popular"
      onClose={onCancel}
      onSelectDestination={() => {}}
      onConfirmDestinations={onSave}
    />
  );
}
