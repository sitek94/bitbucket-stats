import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core'
import { nanoid } from './utils'
import { relations } from 'drizzle-orm'

export const users = sqliteTable('users', {
  uuid: text().primaryKey(), // Original Bitbucket ID
  display_name: text().notNull(),
  team: text(),
  excluded: integer({ mode: 'boolean' }).default(false),
})

export const usersRelations = relations(users, ({ many }) => ({
  ownPullRequests: many(pullRequests),
  comments: many(pullRequestComments),
  reviewedPullRequests: many(pullRequestParticipants),
}))

export const pullRequests = sqliteTable('pull_requests', {
  id: integer().primaryKey(), // Original Bitbucket ID
  title: text().notNull(),
  description: text().notNull(),
  branch: text().notNull(),
  repository: text().notNull(), // Repository name (e.g., 'neo-backend')
  author_id: text()
    .references(() => users.uuid)
    .notNull(),
  created_at: text().notNull(),
  updated_at: text().notNull(),
})

export const pullRequestsRelations = relations(pullRequests, ({ one, many }) => ({
  author: one(users, {
    fields: [pullRequests.author_id],
    references: [users.uuid],
  }),
  participants: many(pullRequestParticipants),
  comments: many(pullRequestComments),
}))

export const pullRequestParticipants = sqliteTable('pull_request_participants', {
  id: text()
    .primaryKey()
    .$defaultFn(() => nanoid()),
  pull_request_id: integer()
    .references(() => pullRequests.id)
    .notNull(),
  user_id: text()
    .references(() => users.uuid)
    .notNull(),
  role: text().notNull(), // PARTICIPANT or REVIEWER
  approved: integer({ mode: 'boolean' }),
})

export const pullRequestParticipantsRelations = relations(pullRequestParticipants, ({ one }) => ({
  user: one(users, {
    fields: [pullRequestParticipants.user_id],
    references: [users.uuid],
  }),
  pullRequest: one(pullRequests, {
    fields: [pullRequestParticipants.pull_request_id],
    references: [pullRequests.id],
  }),
}))

export const pullRequestComments = sqliteTable('pull_request_comments', {
  id: integer().primaryKey(), // Original Bitbucket ID
  pull_request_id: integer()
    .references(() => pullRequests.id)
    .notNull(),
  author_id: text()
    .references(() => users.uuid)
    .notNull(),
  created_at: text().notNull(),
  updated_at: text().notNull(),
  content: text().notNull(),
})

export const pullRequestCommentsRelations = relations(pullRequestComments, ({ one }) => ({
  author: one(users, {
    fields: [pullRequestComments.author_id],
    references: [users.uuid],
  }),
  pullRequest: one(pullRequests, {
    fields: [pullRequestComments.pull_request_id],
    references: [pullRequests.id],
  }),
}))
