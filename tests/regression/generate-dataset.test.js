import { expect, it } from 'vitest'
import { generatePublicDataset } from '../../src/pipeline/generatePublicDataset.js'
import { makeRepresentativeDataset } from '../fixtures/publicDataset.js'

it('US-24: transforms a verified wholly synthetic production-shaped dataset', () => {
  const input = makeRepresentativeDataset()
  expect(input.sites).toHaveLength(6)
  expect(input.tunnels).toHaveLength(2973)
  expect(input.surveys).toHaveLength(42420)
  expect(new Set(input.surveys.map(s => s.surveyDate)).size).toBe(53)
  expect(new Set(input.surveys.map(s => JSON.stringify([s.tunnelId, s.surveyDate]))).size).toBe(42420)
  const output = generatePublicDataset(input)
  expect(output.sites).toHaveLength(6)
  expect(output.observations).toHaveLength(42420)
  expect(new Set(output.observations.map(s => s.tunnelId)).size).toBe(2973)
  const siteIds = new Set(output.sites.map(s => s.siteId))
  const tunnelSites = new Map(input.tunnels.map(t => [t.tunnelId, t.siteId]))
  expect(output.observations.every(s => siteIds.has(s.siteId))).toBe(true)
  expect(output.observations.every(s => s.siteId === tunnelSites.get(s.tunnelId))).toBe(true)
  const reversed = { ...input, sites: input.sites.toReversed(), tunnels: input.tunnels.toReversed(),
    surveys: input.surveys.toReversed() }
  // US-37: each site's precomputed figures agree with an independent count
  // over the public observations (what the browser used to calculate).
  for (const site of output.sites) {
    const own = output.observations.filter(s => s.siteId === site.siteId)
    const dates = [...new Set(own.map(s => s.surveyDate))].sort()
    expect(site.tunnelCount).toBe(new Set(own.map(s => s.tunnelId)).size)
    expect(site.surveyDateCount).toBe(dates.length)
    expect(site.firstSurveyDate).toBe(dates[0])
    expect(site.lastSurveyDate).toBe(dates.at(-1))
    expect(site.occupiedTunnelCount).toBe(new Set(own
      .filter(s => ['Complete', 'Active', 'Reopened'].includes(s.observationStatus))
      .map(s => s.tunnelId)).size)
  }
  const repeat = generatePublicDataset(reversed)
  expect(JSON.stringify(repeat.sites)).toBe(JSON.stringify(output.sites))
  expect(JSON.stringify(repeat.observations)).toBe(JSON.stringify(output.observations))
})
