// A small dashboard.json in the US-28 shape. No 2024: the study skipped it.
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
