import { Database } from 'bun:sqlite'
import { readFileSync, writeFileSync, mkdirSync } from 'fs'
import { join } from 'path'

type ExportType = 'totals' | 'monthly' | 'weekly'

export async function exportStats({
  repository,
  types = ['totals', 'monthly', 'weekly'],
}: {
  repository: string
  types?: ExportType[]
}) {
  const dbPath = Bun.env.DB_FILE_NAME!.replace('file:', '')
  const db = new Database(dbPath, { readonly: true })

  const outputDir = 'output'

  // Ensure output directory exists
  try {
    mkdirSync(outputDir, { recursive: true })
  } catch (err) {
    // Directory already exists, ignore
  }

  const results: { type: ExportType; file: string }[] = []

  for (const type of types) {
    const queryPath = join('db', 'queries', `${type}.sql`)
    const query = readFileSync(queryPath, 'utf-8')

    // Run query with repository parameter (passed twice for both CTEs)
    const stmt = db.query(query)
    const rows = stmt.all(repository, repository) as Record<string, any>[]

    // Convert to CSV
    if (rows.length === 0) {
      console.warn(`No data for ${type}`)
      continue
    }

    const headers = Object.keys(rows[0])
    const csvLines = [
      headers.join(','),
      ...rows.map((row) =>
        headers
          .map((header) => {
            const value = row[header]
            // Escape values that contain commas or quotes
            if (value === null || value === undefined) return ''
            const str = String(value)
            if (str.includes(',') || str.includes('"') || str.includes('\n')) {
              return `"${str.replace(/"/g, '""')}"`
            }
            return str
          })
          .join(','),
      ),
    ]

    const outputFile = join(outputDir, `${repository}-${type}.csv`)
    writeFileSync(outputFile, csvLines.join('\n'))

    results.push({ type, file: outputFile })
  }

  db.close()

  return results
}
