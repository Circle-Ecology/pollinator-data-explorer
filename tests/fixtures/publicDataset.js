// Wholly synthetic, explicitly authorized normalized records for US-24 only.
export function makePublicDataset() {
  return {
    importBatchId: 'synthetic-batch', totalRows: 1, validRows: 1, invalidRows: 0,
    siteCount: 1, tunnelCount: 1, surveyDateCount: 1, unsurveyedRowCount: 0,
    errors: [], warnings: [],
    sites: [{ siteId: 'S1', propertyName: 'Synthetic Meadow', city: 'Example City',
      state: 'CO', latitude: 40, longitude: -105, elevationMeters: null, isPublic: true }],
    tunnels: [{ tunnelId: 'T1', siteId: 'S1' }],
    surveys: [{ tunnelId: 'T1', surveyDate: '2025-01-01', observationStatus: 'Complete',
      occupantType: 'Bee', nesterFamily: null, generalId: null, commonName: null,
      plugDepth: null, plugComposition: null, plugColor: null, plugConfidence: null,
      wholeOrHole: null, emergenceYear: null, manufacturedEmpty: false,
      recordStatus: 'approved', importBatchId: 'synthetic-batch' }],
  }
}

export function makeRepresentativeDataset() {
  const base = makePublicDataset()
  const sites = Array.from({ length: 6 }, (_, index) => ({ ...base.sites[0],
    siteId: `S${index + 1}`, propertyName: `Synthetic Site ${index + 1}` }))
  const tunnels = Array.from({ length: 2973 }, (_, index) => ({
    tunnelId: `T${String(index + 1).padStart(4, '0')}`, siteId: sites[index % 6].siteId,
  }))
  const surveys = Array.from({ length: 42420 }, (_, index) => ({ ...base.surveys[0],
    tunnelId: tunnels[index % tunnels.length].tunnelId,
    surveyDate: new Date(Date.UTC(2025, 0, 1 + (Math.floor(index / tunnels.length) + index % tunnels.length) % 53))
      .toISOString().slice(0, 10),
  }))
  return { ...base, totalRows: surveys.length, validRows: surveys.length,
    siteCount: sites.length, tunnelCount: tunnels.length, surveyDateCount: 53,
    sites, tunnels, surveys }
}
