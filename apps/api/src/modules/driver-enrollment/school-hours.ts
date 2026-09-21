export function schoolHours(school: { openingTime: string; openingTimes?: string[]; closingTime: string; closingTimes: string[] }, direction: string) {
  const opening = [...(school.openingTimes ?? []), school.openingTime].filter(Boolean).sort().at(0) ?? school.openingTime;
  const closing = [...(school.closingTimes ?? []), school.closingTime].filter(Boolean).sort().at(-1) ?? school.closingTime;
  return {
    scheduledStopTime: direction === 'FROM_SCHOOL' ? closing : opening,
    scheduledReturnStopTime: direction === 'ROUND_TRIP' ? closing : null,
  };
}
