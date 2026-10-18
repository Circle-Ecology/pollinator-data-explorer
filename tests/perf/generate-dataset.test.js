import { Buffer } from 'node:buffer'
import { performance } from 'node:perf_hooks'
import { expect, it } from 'vitest'
import { generatePublicDataset } from '../../src/pipeline/generatePublicDataset.js'
import { makeRepresentativeDataset } from '../fixtures/publicDataset.js'

it('US-24: transforms 42,420 synthetic surveys in under ten seconds', () => {
  const input = makeRepresentativeDataset()
  const start = performance.now()
  const output = generatePublicDataset(input)
  const durationMs = performance.now() - start
  expect(output.sites).toHaveLength(6)
  expect(output.observations).toHaveLength(42420)
  expect(durationMs).toBeLessThan(10000)
  console.info(JSON.stringify({ durationMs, sitesBytes: Buffer.byteLength(JSON.stringify(output.sites)),
    observationsBytes: Buffer.byteLength(JSON.stringify(output.observations)) }))
}, 15000)
