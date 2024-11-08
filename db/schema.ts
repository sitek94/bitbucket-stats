import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core'
import { nanoid } from './utils'

export const users = sqliteTable('users', {
  uuid: text().primaryKey(), // Original Bitbucket ID
  display_name: text().notNull(),
})

export const pullRequests = sqliteTable('pull_requests', {
  id: integer().primaryKey(), // Original Bitbucket ID
  title: text().notNull(),
  description: text().notNull(),
  branch: text().notNull(),
  author_id: text().references(() => users.uuid),
  created_at: text().notNull(),
  updated_at: text().notNull(),
})

export const pullRequestParticipants = sqliteTable('pull_request_participants', {
  id: text()
    .primaryKey()
    .$defaultFn(() => nanoid()),
  pull_request_id: integer().references(() => pullRequests.id),
  user_id: text().references(() => users.uuid),
  role: text().notNull(), // PARTICIPANT or REVIEWER
  approved: integer({ mode: 'boolean' }),
})

export const pullRequestComments = sqliteTable('pull_request_comments', {
  id: integer().primaryKey(), // Original Bitbucket ID
  pull_request_id: integer().references(() => pullRequests.id),
  author_id: text().references(() => users.uuid),
  created_at: text().notNull(),
  updated_at: text().notNull(),
  content: text().notNull(),
})
