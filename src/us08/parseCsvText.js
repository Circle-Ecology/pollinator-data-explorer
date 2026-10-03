
export function parseCsvText(input) {
  const text = (
    typeof input === 'string'
      ? input
      : new TextDecoder('utf-8').decode(input)
  ).replace(/^\uFEFF/, '')

  if (text.trim() === '') return []

  const records = []
  let record = []
  let field = ''
  let inQuotes = false

  for (let i = 0; i < text.length; i++) {
    const char = text[i]

    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"'
          i++
        } else {
          inQuotes = false
        }
      } else {
        field += char
      }
      continue
    }

    if (char === '"' && field === '') {
      inQuotes = true
    } else if (char === ',') {
      record.push(field)
      field = ''
    } else if (char === '\n' || char === '\r') {
      if (char === '\r' && text[i + 1] === '\n') {
        i++
      }

      record.push(field)
      records.push(record)
      record = []
      field = ''
    } else {
      field += char
    }
  }

  if (inQuotes) {
    throw new Error('CSV contains an unclosed quoted field')
  }

  if (record.length > 0 || field !== '') {
    record.push(field)
    records.push(record)
  }

  const [headers, ...dataRows] = records

  return dataRows
    .filter((values) => values.some((value) => value.trim() !== ''))
    .map((values, index) => {
      if (values.length !== headers.length) {
        throw new Error(
          `CSV row ${index + 2} has ${values.length} columns; expected ${headers.length}`
        )
      }

      return Object.fromEntries(
        headers.map((header, column) => [
          header.trim(),
          values[column],
        ])
      )
    })
}
