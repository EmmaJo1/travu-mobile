import { useSyncExternalStore } from 'react';

let isActiveTraveling = false;
const listeners = new Set<() => void>();

function emitChange() {
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot() {
  return isActiveTraveling;
}

export function setActiveTraveling(nextIsTraveling: boolean) {
  if (isActiveTraveling === nextIsTraveling) {
    return;
  }

  isActiveTraveling = nextIsTraveling;
  emitChange();
}

export function useIsActiveTraveling() {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
