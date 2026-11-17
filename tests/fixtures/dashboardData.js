// A small dashboard.json in the US-28 shape. Site totals agree across the
// occupant charts, as they do in the real pipeline output. No 2024: the study skipped it.
export const dashboardData = {
  generatedAt: '2026-11-11T00:00:00.000Z',
  years: [2023, 2025, 2026],
  charts: {
    'occupancy-by-year': {
      2023: [{ occupied: 233, empty: 397, excluded: 0, available: 630 }],
      2025: [{ occupied: 780, empty: 1606, excluded: 0, available: 2386 }],
      2026: [{ occupied: 760, empty: 1423, excluded: 0, available: 2183 }],
    },
    'occupancy-by-site': {
      2023: [
        { siteId: 'Site 1', propertyName: 'Site 1', occupied: 24, empty: 66, excluded: 0, available: 90 },
        { siteId: 'Site 2', propertyName: 'Site 2', occupied: 18, empty: 72, excluded: 0, available: 90 },
      ],
      2025: [
        { siteId: 'Site 1', propertyName: 'Site 1', occupied: 100, empty: 300, excluded: 0, available: 400 },
      ],
      2026: [
        { siteId: 'Site 1', propertyName: 'Site 1', occupied: 200, empty: 200, excluded: 0, available: 400 },
      ],
    },
    // Unknown only exists from 2026, so earlier years have it at zero.
    'occupants-by-year-type': {
      2023: [{ Bee: 40, Wasp: 18, Unknown: 0, Other: 220, total: 278 }],
      2025: [{ Bee: 678, Wasp: 298, Unknown: 0, Other: 127, total: 1103 }],
      2026: [{ Bee: 533, Wasp: 241, Unknown: 29, Other: 77, total: 880 }],
    },
    // Site 2 was only monitored in 2023, so later years leave it out.
    'occupants-by-site': {
      2023: [
        { siteId: 'Site 1', propertyName: 'Site 1', total: 28 },
        { siteId: 'Site 2', propertyName: 'Site 2', total: 20 },
      ],
      2025: [{ siteId: 'Site 1', propertyName: 'Site 1', total: 209 }],
      2026: [{ siteId: 'Site 1', propertyName: 'Site 1', total: 243 }],
    },
    // Ants and pill bugs were not recorded separately in 2023.
    'other-by-site-type': {
      2023: [
        { siteId: 'Site 1', propertyName: 'Site 1', Spider: 20, 'Ant(s)': 0, 'Pill Bug': 0, Other: 4, total: 24 },
        { siteId: 'Site 2', propertyName: 'Site 2', Spider: 5, 'Ant(s)': 0, 'Pill Bug': 0, Other: 1, total: 6 },
      ],
      2025: [
        { siteId: 'Site 1', propertyName: 'Site 1', Spider: 5, 'Ant(s)': 0, 'Pill Bug': 0, Other: 3, total: 8 },
      ],
      2026: [
        { siteId: 'Site 1', propertyName: 'Site 1', Spider: 9, 'Ant(s)': 0, 'Pill Bug': 1, Other: 0, total: 10 },
      ],
    },
    'occupants-by-site-type': {
      2023: [
        { siteId: 'Site 1', propertyName: 'Site 1', Bee: 2, Wasp: 2, Unknown: 0, Other: 24, total: 28 },
        { siteId: 'Site 2', propertyName: 'Site 2', Bee: 6, Wasp: 8, Unknown: 0, Other: 6, total: 20 },
      ],
      2025: [
        { siteId: 'Site 1', propertyName: 'Site 1', Bee: 181, Wasp: 20, Unknown: 0, Other: 8, total: 209 },
      ],
      2026: [
        { siteId: 'Site 1', propertyName: 'Site 1', Bee: 175, Wasp: 44, Unknown: 14, Other: 10, total: 243 },
      ],
    },
  },
}

export function stubResizeObserver(vi) {
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    }
  )
}
