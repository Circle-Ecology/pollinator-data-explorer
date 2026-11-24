import { mkdir, rename, rm, stat, writeFile } from 'node:fs/promises'
import process from 'node:process'
import { basename, dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { OTHER_TALLY_VISITS } from './data/otherTally2025.js'
import { generateDashboardDataset } from './generateDashboardDataset.js'
import { countConflictedEntities, generatePublicDataset } from './generatePublicDataset.js'

const DEFAULT_OUTPUT_DIRECTORY = fileURLToPath(new URL('../../data/', import.meta.url))

/**
 * Write a candidate to an output directory (normally staging, NOT a live deploy).
 * US-25: all files are staged in a sibling directory and swapped in only once every
 * file is written, so a failure at any point leaves the previous dataset untouched.
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
  // US-28: dashboard figures share the metadata's generatedAt so the files can be matched up.
  const dashboard = generateDashboardDataset(dataset, parsedResult.tunnels, metadata.generatedAt,
    { otherTallyVisits: OTHER_TALLY_VISITS })
  // Serialize every candidate before filesystem operations; never serialize dataset.status.
  const files = [
    ['sites.json', JSON.stringify(dataset.sites)],
    ['observations.json', JSON.stringify(dataset.observations)],
    ['dashboard.json', JSON.stringify(dashboard)],
    ['dataset-status.json', JSON.stringify(metadata)],
  ]
  try {
    await replaceDirectory(outputDirectory, files)
  } catch {
    // Do not include source records, diagnostics, or filesystem details in the error.
    throw new Error('Unable to write public dataset')
  }
  return metadata
}

// Stage -> swap -> cleanup. The live directory is only renamed away after the
// complete candidate exists, and is restored if the final rename fails.
async function replaceDirectory(outputDirectory, files) {
  const target = resolve(outputDirectory)
  const suffix = `${process.pid}-${Date.now()}`
  const staging = join(dirname(target), `.${basename(target)}.staging-${suffix}`)
  const previous = join(dirname(target), `.${basename(target)}.previous-${suffix}`)
  await mkdir(dirname(target), { recursive: true })
  try {
    await mkdir(staging)
    for (const [name, contents] of files) await writeFile(join(staging, name), contents, 'utf8')
    let hadPrevious = true
    try {
      // Never swap out something that isn't a dataset directory (e.g. a stray file).
      if (!(await stat(target)).isDirectory()) throw new Error('Output path is not a directory')
      await rename(target, previous)
    } catch (error) {
      if (error.code !== 'ENOENT') throw error
      hadPrevious = false
    }
    try {
      await rename(staging, target)
    } catch (error) {
      if (hadPrevious) await rename(previous, target).catch(() => {})
      throw error
    }
    if (hadPrevious) await rm(previous, { recursive: true, force: true }).catch(() => {})
  } finally {
    await rm(staging, { recursive: true, force: true }).catch(() => {})
  }
}
