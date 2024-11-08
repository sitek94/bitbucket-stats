import {int, integer, sqliteTable, text} from 'drizzle-orm/sqlite-core'

export const usersTable = sqliteTable('users', {
  id: text().primaryKey(),
  display_name: text().notNull(),
  email: text().notNull().unique(),
  profile_url: text().notNull(),
})

export const pullRequestsTable = sqliteTable('pull_requests', {
  id: text().primaryKey(),
  author_id: int().references(() => usersTable.id),
  created_at: text().notNull(),
  updated_at: text().notNull(),
})

export const pullRequestParticipantsTable = sqliteTable(
  'pull_request_participants',
  {
    id: text().primaryKey(),
    pull_request_id: text().references(() => pullRequestsTable.id),
    user_id: int().references(() => usersTable.id),
    role: text().notNull(), // PARTICIPANT or REVIEWER
    approved: integer({mode: 'boolean'}),
  },
)

export const pullRequestCommentsTable = sqliteTable('pull_request_comments', {
  id: text().primaryKey(),
  pull_request_id: text().references(() => pullRequestsTable.id),
  author_id: int().references(() => usersTable.id),
  created_at: text().notNull(),
  updated_at: text().notNull(),
  content: text().notNull(),
})
