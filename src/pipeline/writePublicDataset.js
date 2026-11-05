import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { countConflictedEntities, generatePublicDataset } from './generatePublicDataset.js'

const DEFAULT_OUTPUT_DIRECTORY = fileURLToPath(new URL('../../data/', import.meta.url))

/**
 * Write a candidate to an output directory (normally staging, NOT a live deploy).
 * No rollback or atomic replacement: US-25 owns those publication responsibilities.
 * Accept normalized input rather than trusting caller-supplied public projections.
 * Returns only the five public metadata fields; internal `status` is never written.
 */
export async function writePublicDataset(parsedResult, {
  outputDirectory = DEFAULT_OUTPUT_DIRECTORY,
  now = () => new Date(),
} = {}) {
  const dataset = generatePublicDataset(parsedResult)
  const timestamp = now()
  if (!(timestamp instanceof Date) || !Number.isFinite(timestamp.getTime())) {
    throw new TypeError('Invalid generation timestamp')
  }
  const metadata = {
    generatedAt: timestamp.toISOString(),
    sourceRowCount: parsedResult.totalRows,
    siteCount: dataset.sites.length,
    // Count distinct tunnels actually represented by published surveys.
    tunnelCount: new Set(dataset.observations.map(survey => survey.tunnelId)).size,
    // Rows US-08 excluded entirely (malformed coordinates, missing fields, etc.)
    // plus entities generatePublicDataset itself excluded for a reported conflict
    // (kept first-seen by US-08, unreliable to publish) - surfaced so a row-level
    // problem is visible, not silently swallowed, now that generatePublicDataset
    // no longer refuses the whole batch over it (#45).
    excludedRowCount: parsedResult.invalidRows + countConflictedEntities(parsedResult),
    status: 'published',
  }
  // Serialize every candidate before filesystem operations; never serialize dataset.status.
  const files = [
    ['sites.json', JSON.stringify(dataset.sites)],
    ['observations.json', JSON.stringify(dataset.observations)],
    ['dataset-status.json', JSON.stringify(metadata)],
  ]
  try {
    await mkdir(outputDirectory, { recursive: true })
    for (const [name, contents] of files) await writeFile(join(outputDirectory, name), contents, 'utf8')
  } catch {
    // Do not include source records, diagnostics, or filesystem details in the error.
    throw new Error('Unable to write public dataset')
  }
  return metadata
}
