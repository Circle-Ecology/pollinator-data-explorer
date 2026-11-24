import { readFile, rename, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { assertPublishableImport } from './assertPublishableImport.js'
import { writePublicDataset } from './writePublicDataset.js'

// US-25 implementation contract. dataset-status.json `status` is one of these.
export const PUBLISH_STATUS = { PUBLISHED: 'published', PUBLISH_FAILED: 'publish_failed', FETCH_FAILED: 'fetch_failed' }
export const ALERT_AFTER_FAILURES = 3
const STATUS_FILE = 'dataset-status.json'

// Returns the last status file's contents, or null if there is none yet.
export async function readCurrentStatus(outputDirectory) {
  try {
    return JSON.parse(await readFile(join(outputDirectory, STATUS_FILE), 'utf8'))
  } catch {
    return null
  }
}

// Write one file atomically: *.tmp then rename, never in place.
async function writeStatusFile(outputDirectory, status) {
  const target = join(outputDirectory, STATUS_FILE)
  await writeFile(`${target}.tmp`, JSON.stringify(status), 'utf8')
  await rename(`${target}.tmp`, target)
}

// A broken injected clock must not stop a failure from being logged.
function safeIso(now) {
  try {
    return now().toISOString()
  } catch {
    return new Date().toISOString()
  }
}

// Shared by publish and fetch failures. Keeps generatedAt and counts from the last
// good publish, bumps the counter, logs { occurredAt, reason, firstError?,
// consecutiveFailureCount } and escalates once the failures reach the alert threshold.
async function recordFailure(failureStatus, reason, firstError, currentStatus, { outputDirectory, now, logger }) {
  const consecutiveFailureCount = (currentStatus?.consecutiveFailureCount ?? 0) + 1
  const entry = { occurredAt: safeIso(now), reason, consecutiveFailureCount }
  if (firstError) entry.firstError = firstError
  // Alert once, on the failure that reaches the threshold, not on every failure after it.
  if (consecutiveFailureCount === ALERT_AFTER_FAILURES) {
    logger.error({ ...entry, alert: true,
      message: `ALERT: ${consecutiveFailureCount} consecutive failures publishing the public dataset` })
  } else {
    logger.error(entry)
  }
  // With no prior publish there is no last-good status to annotate; leave disk untouched.
  if (!currentStatus) return { published: false, status: { status: failureStatus, consecutiveFailureCount } }
  const status = { ...currentStatus, status: failureStatus, consecutiveFailureCount }
  try {
    await writeStatusFile(outputDirectory, status)
  } catch {
    logger.error({ occurredAt: entry.occurredAt, reason: 'Unable to update dataset-status.json', consecutiveFailureCount })
  }
  return { published: false, status }
}

/**
 * Publish `candidate` (a parsed import) only if it passes the publishable-import gate.
 * On any refusal or write failure the last published files are left untouched and
 * dataset-status.json is marked "publish_failed". Never throws.
 */
export async function publishDatasetIfValid(candidate, currentStatus = null, {
  outputDirectory, now = () => new Date(), logger = console, maxInvalidRatio,
} = {}) {
  const context = { outputDirectory, now, logger }
  try {
    assertPublishableImport(candidate, { maxInvalidRatio })
  } catch (error) {
    return recordFailure(PUBLISH_STATUS.PUBLISH_FAILED, error.message, candidate?.errors?.[0], currentStatus, context)
  }
  try {
    const status = await writePublicDataset(candidate, { outputDirectory, now })
    return { published: true, status }
  } catch (error) {
    return recordFailure(PUBLISH_STATUS.PUBLISH_FAILED, error.message, undefined, currentStatus, context)
  }
}

// A failed fetch changes only dataset-status.json (to "fetch_failed"); the data files stay as they are.
export function recordFetchFailure(reason, currentStatus, { outputDirectory, now = () => new Date(), logger = console } = {}) {
  return recordFailure(PUBLISH_STATUS.FETCH_FAILED, reason, undefined, currentStatus, { outputDirectory, now, logger })
}
