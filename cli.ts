import 'dotenv/config'
import { input, confirm, select, checkbox } from '@inquirer/prompts'
import { seed } from './scripts/seed-db'
import { exportStats } from './scripts/export-stats'
import { subDays } from 'date-fns'
import { db } from './db'
import { sql } from 'drizzle-orm'

// Main menu
const action = await select({
  message: 'What would you like to do?',
  choices: [
    { name: 'Fetch repository data', value: 'fetch', description: 'Import pull requests from a repository' },
    { name: 'Sync repositories', value: 'sync', description: 'Update existing repositories with latest data' },
    { name: 'Export statistics', value: 'export', description: 'Generate CSV reports' },
  ],
})

if (action === 'fetch') {
  // Fetch repository data flow
  const repository = await input({
    message: 'Enter repository name:',
    default: process.env.BITBUCKET_REPOSITORY,
    validate: (value) => {
      if (!value.trim()) return 'Repository cannot be empty'
      return true
    },
  })

  const fromDaysAgo = await input({
    message: 'How many days ago to start from?',
    validate: (value) => {
      const num = parseInt(value)
      if (isNaN(num) || num < 1) return 'Please enter a valid number greater than 0'
      return true
    },
  })

  const toDaysAgo = await input({
    message: 'How many days ago to end at? (leave empty for today)',
    default: '',
    validate: (value) => {
      const trimmedValue = value.trim()
      if (!trimmedValue) {
        return true
      }

      const parsedNumber = parseInt(value)
      if (isNaN(parsedNumber)) {
        return 'Please enter a valid number'
      }

      return true
    },
  })

  const today = new Date()
  const workspace = process.env.BITBUCKET_WORKSPACE!
  const from = subDays(today, parseInt(fromDaysAgo))
  const to = toDaysAgo ? subDays(today, parseInt(toDaysAgo)) : undefined

  const confirmOperation = await confirm({
    message: `Ready to fetch data with following parameters:\n
  Repository: ${workspace}/${repository}
  From: ${from.toDateString()}
  To: ${to ? to.toDateString() : `${today.toDateString()} (today)`}
  
  Continue?`,
    default: true,
  })

  if (confirmOperation) {
    console.log('\n📥 Fetching pull request data...\n')
    await seed({ repository, from, to })
    console.log('\n🎉 Data fetched successfully')
    process.exit(0)
  } else {
    console.log('\n🚫 Operation cancelled')
    process.exit(0)
  }
} else if (action === 'sync') {
  // Sync repositories flow
  console.log('\n🔄 Syncing repositories...\n')

  // Get all repositories with their most recent PR creation date
  const repositories = await db
    .selectDistinct({
      repository: sql<string>`repository`,
      mostRecentDate: sql<string>`MAX(created_at)`,
    })
    .from(sql`pull_requests`)
    .groupBy(sql`repository`)
    .orderBy(sql`repository`)

  if (repositories.length === 0) {
    console.log('❌ No repositories found in database. Use "Fetch repository data" first.')
    process.exit(1)
  }

  console.log(`Found ${repositories.length} repository(ies) to sync:\n`)
  repositories.forEach(({ repository, mostRecentDate }) => {
    const date = new Date(mostRecentDate)
    console.log(`  - ${repository} (most recent PR: ${date.toDateString()})`)
  })

  const confirmSync = await confirm({
    message: '\nSync all repositories with latest data?',
    default: true,
  })

  if (!confirmSync) {
    console.log('\n🚫 Operation cancelled')
    process.exit(0)
  }

  console.log()

  for (const { repository, mostRecentDate } of repositories) {
    console.log(`\n📥 Syncing ${repository}...\n`)
    const from = new Date(mostRecentDate)

    await seed({ repository, from, to: undefined })
  }

  console.log('\n🎉 All repositories synced successfully')
  process.exit(0)
} else if (action === 'export') {
  // Export flow
  // Get list of repositories from DB
  const repositories = await db
    .selectDistinct({ repository: sql<string>`repository` })
    .from(sql`pull_requests`)
    .orderBy(sql`repository`)
    .then((result) => result.map((row) => row.repository))

  if (repositories.length === 0) {
    console.log('\n❌ No repositories found in database. Please seed data first.')
    process.exit(1)
  }

  const selectedRepositories = await checkbox({
    message: 'Select repositories to export:',
    choices: repositories.map((repo) => ({ name: repo, value: repo, checked: true })),
    validate: (answer) => {
      if (answer.length === 0) {
        return 'Please select at least one repository'
      }
      return true
    },
  })

  const daysBack = await input({
    message: 'How many days of history to include?',
    default: '180',
    validate: (value) => {
      const num = parseInt(value)
      if (isNaN(num) || num < 1) return 'Please enter a valid number greater than 0'
      return true
    },
  })

  const exportTypes = await checkbox({
    message: 'Select export types:',
    choices: [
      { name: 'Totals', value: 'totals', checked: true },
      { name: 'Monthly breakdown', value: 'monthly', checked: true },
      { name: 'Weekly breakdown', value: 'weekly', checked: true },
    ],
    validate: (answer) => {
      if (answer.length === 0) {
        return 'Please select at least one export type'
      }
      return true
    },
  })

  console.log('\n📊 Exporting statistics...\n')

  const allResults: { repository: string; type: string; file: string }[] = []

  for (const repository of selectedRepositories) {
    console.log(`Exporting ${repository}...`)
    const results = await exportStats({
      repository,
      types: exportTypes as ('totals' | 'monthly' | 'weekly')[],
      daysBack: parseInt(daysBack),
    })
    allResults.push(...results.map((r) => ({ repository, ...r })))
  }

  console.log('\n🎉 Export completed successfully!')
  console.log('\nFiles created:')
  allResults.forEach(({ repository, type, file }) => {
    console.log(`  - ${file} (${repository} - ${type})`)
  })
  process.exit(0)
}
