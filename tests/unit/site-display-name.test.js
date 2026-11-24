import { describe, expect, it } from 'vitest'
import { generatePublicDataset } from '../../src/pipeline/generatePublicDataset.js'
import { siteDisplayName } from '../../src/pipeline/siteDisplayName.js'
import { makePublicDataset } from '../fixtures/publicDataset.js'

// US-39 (#87): every site is shown as "<Property name> (Site N)" so two sites on
// one property stay distinguishable (Georgia's 11/18 feedback).
describe('site display name - US-39', () => {
  it('adds the site number in parentheses', () => {
    expect(siteDisplayName('Sherwood OS', '5')).toBe('Sherwood OS (Site 5)')
  })

  it('leaves a name that already carries its site number unchanged', () => {
    expect(siteDisplayName('Boulder Creek Estates OS (Site 1)', '1')).toBe('Boulder Creek Estates OS (Site 1)')
  })

  it('leaves the name alone when the site number is not recorded', () => {
    expect(siteDisplayName('Sherwood OS', null)).toBe('Sherwood OS')
  })

  it('names public sites with their site number from the tunnels', () => {
    const input = makePublicDataset()
    input.tunnels = [{ tunnelId: 'T1', siteId: 'S1', blockNumber: '5' }]

    const { sites } = generatePublicDataset(input)

    expect(sites[0]).toMatchObject({ siteId: 'S1', propertyName: 'Synthetic Meadow (Site 5)' })
  })
})
