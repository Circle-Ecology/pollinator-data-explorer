import { parseExportCsv } from '../us08/parseExportCsv'

export async function fetchSheetCsv(url = import.meta.env.PUBLIC_SHEET_CSV_URL) {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Sheet request failed: ${response.status}`)
  }
  return response.text()
}

export async function fetchSites() {
  const csv = await fetchSheetCsv()
  const result = parseExportCsv(csv, `sheet-${new Date().toISOString()}`)
  return result.sites
}