
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

  // An unclosed quote makes the rest of the CSV ambiguous.
  if (inQuotes) {
    throw new Error('CSV contains an unclosed quoted field')
  }

  if (record.length > 0 || field !== '') {
    record.push(field)
    records.push(record)
  }

  const [headers, ...dataRows] = records

  return dataRows
    .map((values, index) => ({
      values,
      rowNumber: index + 2,
    }))
    .filter(({ values }) =>
      values.some((value) => value.trim() !== '')
    )
    .map(({ values, rowNumber }) => {
      // Report malformed rows without stopping the import.
      if (values.length !== headers.length) {
        return {
          __malformedRow: true,
          __csvRowNumber: rowNumber,
          __actualColumns: values.length,
          __expectedColumns: headers.length,
        }
      }

      const parsedRow = Object.fromEntries(
        headers.map((header, column) => [
          header.trim(),
          values[column],
        ])
      )

      // Preserve original CSV record number.
      Object.defineProperty(parsedRow, '__csvRowNumber', {
        value: rowNumber,
        enumerable: false,
      })

      return parsedRow
    })
}