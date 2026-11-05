import { describe, expect, it } from 'vitest'
import { generatePublicDataset } from '../../src/pipeline/generatePublicDataset.js'
import { makePublicDataset } from '../fixtures/publicDataset.js'

const SITE_KEYS = ['siteId', 'propertyName', 'city', 'state', 'latitude', 'longitude', 'elevationMeters']
const SURVEY_KEYS = ['siteId', 'tunnelId', 'surveyDate', 'observationStatus', 'occupantType', 'nesterFamily',
  'generalId', 'commonName', 'plugDepth', 'plugComposition', 'plugColor', 'plugConfidence',
  'wholeOrHole', 'emergenceYear', 'manufacturedEmpty', 'recordStatus']
const PRIVATE_KEYS = ['observerId', 'observerEmail', 'observerFirstName', 'observerLastName',
  'observerName', 'notes', 'importBatchId', 'internalComments', 'privateMetadata', 'unexpected']

function assertPublicKeys(value) {
  if (value === null || typeof value !== 'object') return
  for (const [key, child] of Object.entries(value)) {
    expect(PRIVATE_KEYS).not.toContain(key)
    assertPublicKeys(child)
  }
}

describe('US-24 public projection', () => {
  it('projects exactly the documented public keys and preserves the internal status contract', () => {
    const input = makePublicDataset()
    for (const record of [...input.sites, ...input.tunnels, ...input.surveys]) {
      for (const key of PRIVATE_KEYS) record[key] = { notes: 'synthetic secret' }
    }
    const output = generatePublicDataset(input)
    expect(Object.keys(output).sort()).toEqual(['observations', 'sites', 'status'])
    expect(Object.keys(output.sites[0])).toEqual(SITE_KEYS)
    expect(Object.keys(output.observations[0])).toEqual(SURVEY_KEYS)
    assertPublicKeys(JSON.parse(JSON.stringify({ sites: output.sites, observations: output.observations })))
    expect(output.status).toBe(input)
  })

  it.each(['pending', 'rejected', undefined, null, 'unknown', 'Approved', ' approved'])(
    'excludes status %s', (recordStatus) => {
      const input = makePublicDataset()
      input.surveys[0].recordStatus = recordStatus
      expect(generatePublicDataset(input).observations).toEqual([])
    })

  it('includes only approved surveys from a mixed input', () => {
    const input = makePublicDataset()
    input.surveys.push({ ...input.surveys[0], surveyDate: '2025-01-02', recordStatus: 'pending' })
    expect(generatePublicDataset(input).observations).toHaveLength(1)
  })

  it.each([false, null, undefined, 'true', 1])('excludes site visibility %s and its surveys', (isPublic) => {
    const input = makePublicDataset()
    input.sites[0].isPublic = isPublic
    const output = generatePublicDataset(input)
    expect(output.sites).toEqual([])
    expect(output.observations).toEqual([])
  })

  it('includes explicitly public sites even without approved surveys', () => {
    const input = makePublicDataset()
    input.surveys = []
    expect(generatePublicDataset(input).sites).toHaveLength(1)
  })

  it.each(['tunnel', 'site'])('excludes surveys with a missing parent %s', (parent) => {
    const input = makePublicDataset()
    if (parent === 'tunnel') input.tunnels = []
    else input.tunnels[0].siteId = 'MISSING'
    expect(generatePublicDataset(input).observations).toEqual([])
  })

  it('resolves real relationships rather than guessing from tunnel names', () => {
    const input = makePublicDataset()
    input.sites.push({ ...input.sites[0], siteId: 'PRIVATE', isPublic: false })
    input.tunnels[0] = { tunnelId: 'PRIVATE-looking-id', siteId: 'S1' }
    input.surveys[0].tunnelId = 'PRIVATE-looking-id'
    expect(generatePublicDataset(input).observations).toHaveLength(1)
  })

  it('attaches the resolved siteId to each public observation (US-14, #19)', () => {
    const input = makePublicDataset()
    input.sites.push({ ...input.sites[0], siteId: 'S2', propertyName: 'Second Site' })
    input.tunnels.push({ tunnelId: 'T2', siteId: 'S2' })
    input.surveys.push({ ...input.surveys[0], tunnelId: 'T2' })
    const output = generatePublicDataset(input)
    const bySiteId = Object.fromEntries(output.observations.map(s => [s.tunnelId, s.siteId]))
    expect(bySiteId).toEqual({ T1: 'S1', T2: 'S2' })
  })

  it('sorts sites and survey natural keys without mutating even frozen input', () => {
    const input = makePublicDataset()
    input.sites.unshift({ ...input.sites[0], siteId: 'S2' })
    input.surveys.unshift({ ...input.surveys[0], surveyDate: '2025-01-02' })
    const before = structuredClone(input)
    function freeze(value) {
      if (value && typeof value === 'object') { Object.freeze(value); Object.values(value).forEach(freeze) }
    }
    freeze(input)
    const output = generatePublicDataset(input)
    expect(output.sites.map(s => s.siteId)).toEqual(['S1', 'S2'])
    expect(output.observations.map(s => s.surveyDate)).toEqual(['2025-01-01', '2025-01-02'])
    expect(input).toEqual(before)
  })

  it('collapses identical public surveys but rejects conflicting approved natural keys', () => {
    const input = makePublicDataset()
    input.surveys.push({ ...input.surveys[0], notes: 'ignored synthetic note' })
    expect(generatePublicDataset(input).observations).toHaveLength(1)
    input.surveys[1].occupantType = 'Wasp'
    expect(() => generatePublicDataset(input)).toThrow('Conflicting public survey')
  })

  it.each(['sites', 'tunnels'])('rejects ambiguous duplicate %s identities', (collection) => {
    const input = makePublicDataset()
    input[collection].push({ ...input[collection][0] })
    expect(() => generatePublicDataset(input)).toThrow('Duplicate normalized identity')
  })

  it('accepts an empty normalized dataset', () => {
    const input = makePublicDataset()
    Object.assign(input, { totalRows: 0, validRows: 0, sites: [], tunnels: [], surveys: [] })
    expect(generatePublicDataset(input)).toEqual({ sites: [], observations: [], status: input })
  })

  it('normalizes absent optional public fields to null', () => {
    const input = makePublicDataset()
    delete input.surveys[0].commonName
    delete input.sites[0].elevationMeters
    const output = generatePublicDataset(input)
    expect(output.observations[0].commonName).toBeNull()
    expect(output.sites[0].elevationMeters).toBeNull()
  })

  it.each([null, {}, { sites: [], tunnels: [], surveys: [] }])('rejects malformed result %j', (input) => {
    expect(() => generatePublicDataset(input)).toThrow('Invalid normalized import')
  })

  it.each(['sites', 'tunnels', 'surveys'])('rejects missing or malformed %s arrays', (key) => {
    const input = makePublicDataset()
    delete input[key]
    expect(() => generatePublicDataset(input)).toThrow('Invalid normalized import')
    input[key] = [null]
    expect(() => generatePublicDataset(input)).toThrow('Invalid normalized record')
  })

  it.each([-1, NaN, '1', 1.5])('rejects invalid source count %s', (totalRows) => {
    const input = makePublicDataset()
    input.totalRows = totalRows
    expect(() => generatePublicDataset(input)).toThrow('Invalid normalized import')
  })

  it('does not refuse the whole batch over row-level errors elsewhere in the import (#45)', () => {
    const input = makePublicDataset()
    input.errors = [{ message: 'malformed coordinates on some other row' }]
    input.invalidRows = 1
    input.isValid = false
    const output = generatePublicDataset(input)
    expect(output.sites).toHaveLength(1)
    expect(output.observations).toHaveLength(1)
  })

  it.each([
    ['COORDINATE_CONFLICT', { propertyName: 'S1' }],
    ['PUBLIC_VISIBILITY_CONFLICT', { propertyName: 'S1' }],
    ['SITE_ATTRIBUTE_CONFLICT', { entityId: 'S1' }],
  ])('excludes a site named in a %s error rather than publish its arbitrarily first-seen value (#45 review)',
    (code, idFields) => {
      const input = makePublicDataset()
      input.errors = [{ code, message: 'conflict on some other row', ...idFields }]
      const output = generatePublicDataset(input)
      expect(output.sites).toEqual([])
      expect(output.observations).toEqual([])
    })

  it.each([
    ['TUNNEL_SITE_CONFLICT', { tunnelId: 'T1' }],
    ['TUNNEL_ATTRIBUTE_CONFLICT', { entityId: 'T1' }],
  ])('excludes a tunnel named in a %s error rather than publish its arbitrarily first-seen value (#45 review)',
    (code, idFields) => {
      const input = makePublicDataset()
      input.errors = [{ code, message: 'conflict on some other row', ...idFields }]
      const output = generatePublicDataset(input)
      expect(output.observations).toEqual([])
    })

  it('excludes a survey named in a DUPLICATE_SURVEY error rather than publish its arbitrarily first-seen value (#45 review)', () => {
    const input = makePublicDataset()
    input.errors = [{ code: 'DUPLICATE_SURVEY', message: 'conflict', tunnelId: 'T1', surveyDate: '2025-01-01' }]
    const output = generatePublicDataset(input)
    expect(output.observations).toEqual([])
  })

  it('still publishes an unrelated site/tunnel/survey when only a different entity has a conflict', () => {
    const input = makePublicDataset()
    input.sites.push({ ...input.sites[0], siteId: 'S2', propertyName: 'Second Site' })
    input.errors = [{ code: 'PUBLIC_VISIBILITY_CONFLICT', message: 'conflict', propertyName: 'S2' }]
    const output = generatePublicDataset(input)
    expect(output.sites.map(s => s.siteId)).toEqual(['S1'])
    expect(output.observations).toHaveLength(1)
  })

  it('does not exclude a site whose id happens to match a different entity type\'s conflict id (#45 review)', () => {
    const input = makePublicDataset()
    // A TUNNEL_ATTRIBUTE_CONFLICT naming entityId 'S1' must not be mistaken for a site conflict on 'S1'.
    input.errors = [{ code: 'TUNNEL_ATTRIBUTE_CONFLICT', message: 'conflict', entityId: 'S1', field: 'sunExposure' }]
    const output = generatePublicDataset(input)
    expect(output.sites.map(s => s.siteId)).toEqual(['S1'])
  })

  it('classifies every conflict code parseExportRows can emit (#45 review)', async () => {
    const { CONFLICT_CODES } = await import('../../src/us08/parseExportRows.js')
    const { readFileSync } = await import('node:fs')
    const source = readFileSync(new URL('../../src/us08/parseExportRows.js', import.meta.url), 'utf8')
    const emittedCodes = new Set([...source.matchAll(/'([A-Z][A-Z0-9_]*)'/g)].map(match => match[1]))
    emittedCodes.delete('MALFORMED_COORDINATES') // Excluded at parse time; not a kept-first-seen conflict.
    const classifiedCodes = new Set(Object.keys(CONFLICT_CODES).flatMap(entity => Object.keys(CONFLICT_CODES[entity])))
    expect(classifiedCodes).toEqual(emittedCodes)
  })

  it.each(['', null, {}, 123])('rejects invalid normalized identifiers %j', (id) => {
    const input = makePublicDataset()
    input.tunnels[0].tunnelId = id
    expect(() => generatePublicDataset(input)).toThrow('Invalid normalized identifier')
  })

  it.each(['2025-02-30', '01-01-2025', undefined, {}, ''])('rejects invalid approved survey dates %j', (date) => {
    const input = makePublicDataset()
    input.surveys[0].surveyDate = date
    expect(() => generatePublicDataset(input)).toThrow('Invalid public survey date')
  })

  it.each([['commonName', { notes: 'secret' }], ['plugDepth', Infinity],
    ['manufacturedEmpty', 'true'], ['occupantType', ['Bee']]])('rejects unsafe public scalar %s', (field, value) => {
    const input = makePublicDataset()
    input.surveys[0][field] = value
    expect(() => generatePublicDataset(input)).toThrow('Invalid public field')
  })

  it.each([['latitude', 91], ['longitude', -181], ['propertyName', {}], ['elevationMeters', NaN]])(
    'rejects invalid public site field %s', (field, value) => {
      const input = makePublicDataset()
      input.sites[0][field] = value
      expect(() => generatePublicDataset(input)).toThrow('Invalid public field')
    })
})
