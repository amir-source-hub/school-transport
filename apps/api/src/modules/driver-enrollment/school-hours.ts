export function schoolHours(school: { openingTime: string; closingTime: string; closingTimes: string[] }, direction: string) {
  const closing = [...(school.closingTimes ?? []), school.closingTime].filter(Boolean).sort().at(-1) ?? school.closingTime;
  return {
    scheduledStopTime: direction === 'FROM_SCHOOL' ? closing : school.openingTime,
    scheduledReturnStopTime: direction === 'ROUND_TRIP' ? closing : null,
  };
}
