export type TripDateRangeSource = {
  createdAt?: string | null;
  endDate?: string | null;
  startDate?: string | null;
};

export type TripDayDateSource = {
  date: string;
};

function normalizeDateKey(value?: string | null) {
  const dateKey = value?.trim().slice(0, 10) ?? '';
  return /^\d{4}-\d{2}-\d{2}$/.test(dateKey) ? dateKey : '';
}

function formatDatePart(dateKey: string, includeYear = true) {
  const [year, month, day] = dateKey.split('-').map(Number);

  if (!year || !month || !day) {
    return '';
  }

  return includeYear ? `${year}.${month}.${day}` : `${month}.${day}`;
}

export function resolveTripDateRange(
  source: TripDateRangeSource,
  tripDays?: TripDayDateSource[] | null,
) {
  const activeDayKeys = (tripDays ?? [])
    .map((day) => normalizeDateKey(day.date))
    .filter(Boolean)
    .sort();

  if (activeDayKeys.length > 0) {
    return {
      endDate: activeDayKeys[activeDayKeys.length - 1],
      startDate: activeDayKeys[0],
    };
  }

  const startDate = normalizeDateKey(source.startDate) || normalizeDateKey(source.createdAt);
  const endDate = normalizeDateKey(source.endDate) || startDate;

  return { endDate, startDate };
}

export function formatTripDateRangeLabel(
  source: TripDateRangeSource,
  tripDays?: TripDayDateSource[] | null,
) {
  const { endDate, startDate } = resolveTripDateRange(source, tripDays);

  if (!startDate) {
    return '';
  }

  if (!endDate || endDate === startDate) {
    return formatDatePart(startDate);
  }

  const includeEndYear = startDate.slice(0, 4) !== endDate.slice(0, 4);
  return `${formatDatePart(startDate)}-${formatDatePart(endDate, includeEndYear)}`;
}
