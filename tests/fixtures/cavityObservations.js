// Helper for the US-28 dashboard metric tests: builds one public survey record
// (the shape generatePublicDataset emits) with only the fields a test cares about.
export function obs(observationStatus, surveyDate, extra = {}) {
  return {
    tunnelId: 'T1',
    surveyDate,
    observationStatus,
    occupantType: null,
    plugComposition: null,
    wholeOrHole: null,
    ...extra,
  }
}
