import { describe, expect, it } from 'vitest'
import {
  addSiteStats,
  calculateSiteStats,
  getLatestSurveyYear,
  SITE_STAT_FIELDS,
} from '../../src/pipeline/siteStats.js'
import { PUBLIC_SITE_FIELDS } from '../../src/pipeline/publicFields.js'

const site = (siteId) => ({ siteId, propertyName: siteId, latitude: 40, longitude: -105 })
const survey = (siteId, tunnelId, surveyDate, observationStatus = 'Empty') => ({
  siteId,
  tunnelId,
  surveyDate,
  observationStatus,
})

// US-37: the per-site figures the map and site details panel show, now
// calculated in the pipeline (previously in the browser, see US-15/US-14).
describe('addSiteStats - US-37', () => {
  it('adds survey dates, visit count and surveyed tunnel count', () => {
    const [result] = addSiteStats(
      [site('S1')],
      [
        survey('S1', 'T1', '2025-07-02'),
        survey('S1', 'T2', '2025-07-01', 'Complete'),
        survey('S1', 'T2', '2025-07-01', 'Complete'),
      ]
    )

    expect(result).toMatchObject({
      firstSurveyDate: '2025-07-01',
      lastSurveyDate: '2025-07-02',
      surveyDateCount: 2,
      tunnelCount: 2,
    })
  })

  it('counts an occupied tunnel once, using only Complete, Active and Reopened', () => {
    const [result] = addSiteStats(
      [site('S1')],
      [
        survey('S1', 'T1', '2025-07-01', 'Complete'),
        survey('S1', 'T1', '2025-07-15', 'Active'), // same tunnel: counts once
        survey('S1', 'T2', '2025-07-01', 'Reopened'),
        survey('S1', 'T3', '2025-07-01', 'Empty'),
        survey('S1', 'T4', '2025-07-01', 'Retired hole'),
      ]
    )

    expect(result.occupiedTunnelCount).toBe(2)
    expect(result.tunnelCount).toBe(4)
  })

  it('flags only sites surveyed in the latest season in the dataset', () => {
    const results = addSiteStats(
      [site('Active'), site('Retired'), site('Never surveyed')],
      [
        survey('Active', 'T1', '2023-05-07'),
        survey('Active', 'T1', '2026-10-01'),
        survey('Retired', 'T2', '2023-10-08'),
      ]
    )
    const flags = Object.fromEntries(
      results.map((result) => [result.siteId, result.surveyedInLatestSeason])
    )

    expect(flags).toEqual({ Active: true, Retired: false, 'Never surveyed': false })
  })

  it('gives a site with no observations null dates and zero counts', () => {
    const [result] = addSiteStats([site('S1')], [])

    expect(result).toEqual({
      ...site('S1'),
      city: null,
      state: null,
      elevationMeters: null,
      firstSurveyDate: null,
      lastSurveyDate: null,
      surveyedInLatestSeason: false,
      surveyDateCount: 0,
      tunnelCount: 0,
      occupiedTunnelCount: 0,
    })
  })

  it('never copies private fields, even from a raw site record', () => {
    const raw = {
      ...site('S1'),
      city: 'Longmont',
      observerId: 'o-1',
      observerEmail: 'private@example.com',
      observerFirstName: 'Private',
      observerLastName: 'Observer',
      notes: 'Confidential staff note',
      isPublic: true,
    }

    const [result] = addSiteStats([raw], [survey('S1', 'T1', '2025-07-01')])
    const text = JSON.stringify(result)

    for (const field of ['observerId', 'observerEmail', 'observerFirstName', 'observerLastName', 'notes', 'isPublic']) {
      expect(result).not.toHaveProperty(field)
    }
    expect(text).not.toContain('private@example.com')
    expect(text).not.toContain('Confidential')
    expect(result.city).toBe('Longmont')
  })

  it('adds exactly the documented stat fields and keeps the site fields', () => {
    const [result] = addSiteStats([site('S1')], [survey('S1', 'T1', '2025-07-01')])

    expect(Object.keys(result)).toEqual([...PUBLIC_SITE_FIELDS, ...SITE_STAT_FIELDS])
  })
})

describe('calculateSiteStats', () => {
  it('ignores observations without a siteId and malformed dates', () => {
    const stats = calculateSiteStats([
      { tunnelId: 'T0', surveyDate: '2025-01-01' },
      { siteId: 'S1', tunnelId: 'T1', surveyDate: 'July 1' },
    ])

    expect(stats.size).toBe(1)
    expect(stats.get('S1').surveyDates.size).toBe(0)
    expect([...stats.get('S1').tunnelIds]).toEqual(['T1'])
  })
})

describe('getLatestSurveyYear', () => {
  it('returns the latest survey year across all sites', () => {
    const stats = calculateSiteStats([
      { siteId: 'S1', tunnelId: 'T1', surveyDate: '2023-05-07' },
      { siteId: 'S2', tunnelId: 'T2', surveyDate: '2026-10-01' },
    ])

    expect(getLatestSurveyYear(stats)).toBe('2026')
  })

  it('returns null when there are no valid survey dates', () => {
    expect(getLatestSurveyYear(calculateSiteStats([]))).toBeNull()
  })
})
