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
    { name: 'Seed database', value: 'seed' },
    { name: 'Export statistics', value: 'export' },
  ],
})

if (action === 'seed') {
  // Seed flow
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
    message: `Ready to seed DB with following parameters:\n
  Repository: ${workspace}/${repository}
  From: ${from.toDateString()}
  To: ${to ? to.toDateString() : `${today.toDateString()} (today)`}
  
  Continue?`,
    default: true,
  })

  if (confirmOperation) {
    console.log('\n🌱 Seeding DB...\n')
    await seed({ repository, from, to })
    console.log('\n🎉 DB seeded successfully')
    process.exit(0)
  } else {
    console.log('\n🚫 Operation cancelled')
    process.exit(0)
  }
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
