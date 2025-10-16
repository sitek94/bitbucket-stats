import { Database } from 'bun:sqlite'
import { readFileSync, writeFileSync, mkdirSync } from 'fs'
import { join } from 'path'

type ExportType = 'totals' | 'monthly' | 'weekly'

export async function exportStats({
  repository,
  types = ['totals', 'monthly', 'weekly'],
  daysBack = 180,
}: {
  repository: string
  types?: ExportType[]
  daysBack?: number
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

  // Get ignored users from env (comma-separated list)
  const ignoredUsers = Bun.env.IGNORED_USERS || ''

  // Calculate cutoff date (YYYY-MM-DD format for SQLite)
  const cutoffDate = new Date()
  cutoffDate.setDate(cutoffDate.getDate() - daysBack)
  const cutoffDateStr = cutoffDate.toISOString().split('T')[0]

  const results: { type: ExportType; file: string }[] = []

  for (const type of types) {
    const queryPath = join('db', 'queries', `${type}.sql`)
    const query = readFileSync(queryPath, 'utf-8')

    // Run query with parameters:
    // - cutoffDate, repository, ignoredUsers (twice) for CommentsData CTE
    // - cutoffDate, repository, ignoredUsers (twice) for ApprovalsData CTE
    const stmt = db.query(query)
    const rows = stmt.all(
      cutoffDateStr,
      repository,
      ignoredUsers,
      ignoredUsers,
      cutoffDateStr,
      repository,
      ignoredUsers,
      ignoredUsers,
    ) as Record<string, any>[]

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
