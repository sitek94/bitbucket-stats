import 'dotenv/config'
import { input, confirm } from '@inquirer/prompts'
import { seed } from './scripts/seed-db'
import { subDays } from 'date-fns'

// Get repository
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

// Get "from" days ago
const toDaysAgo = await input({
  message: 'How many days ago to end at? (leave empty for today)',
  default: '',
  validate: (value) => {
    const trimmedValue = value.trim()
    if (!trimmedValue) {
      return true // Empty input is valid
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

// Confirm the operation
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
