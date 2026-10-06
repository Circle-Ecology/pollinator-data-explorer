// Converts a downloaded Circle Ecology CSV export into JSON rows (string[][], rows[0] = headers),
// the shape validateExportFile takes.
// Usage: npm run export:json -- <input.csv> <output.json>
import { readFileSync, writeFileSync } from 'node:fs'
import process from 'node:process'
import { pathToFileURL } from 'node:url'

// RFC 4180 parser: handles quoted fields ("40.15506, -105.0034"), escaped quotes, CRLF, and a BOM.
export function parseCsv(text) {
  const input = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text
  const rows = []
  let row = []
  let field = ''
  let inQuotes = false

  for (let i = 0; i < input.length; i += 1) {
    const char = input[i]

    if (inQuotes) {
      if (char === '"' && input[i + 1] === '"') {
        field += '"'
        i += 1
      } else if (char === '"') {
        inQuotes = false
      } else {
        field += char
      }
    } else if (char === '"') {
      inQuotes = true
    } else if (char === ',') {
      row.push(field)
      field = ''
    } else if (char === '\n' || char === '\r') {
      if (char === '\r' && input[i + 1] === '\n') {
        i += 1
      }
      row.push(field)
      rows.push(row)
      row = []
      field = ''
    } else {
      field += char
    }
  }

  if (field !== '' || row.length > 0) {
    row.push(field)
    rows.push(row)
  }

  return rows
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [input, output] = process.argv.slice(2)
  if (!input || !output) {
    console.error('Usage: npm run export:json -- <input.csv> <output.json>')
    process.exit(1)
  }

  const rows = parseCsv(readFileSync(input, 'utf8'))
  writeFileSync(output, JSON.stringify(rows))
  console.log(`Wrote ${rows.length - 1} data rows and ${rows[0]?.length ?? 0} columns to ${output}`)
}
