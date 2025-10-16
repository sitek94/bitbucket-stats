import { drizzle } from 'drizzle-orm/libsql'
import { createSelectSchema } from 'drizzle-zod'
import type { z } from 'zod'
import { pullRequests, users } from './schema'
import { pullRequestComments } from './schema'
import { pullRequestParticipants } from './schema'
import { createClient } from '@libsql/client'
import * as schema from './schema'
import { eq } from 'drizzle-orm'

const client = createClient({ url: Bun.env.DB_FILE_NAME! })

export const db = drizzle({ client, schema })

const insertUserSchema = createSelectSchema(users).extend({}).omit({ excluded: true, team: true })
const insertPullRequestSchema = createSelectSchema(pullRequests).extend({})
const insertPullRequestParticipantSchema = createSelectSchema(pullRequestParticipants).extend({}).omit({ id: true })
const insertPullRequestCommentSchema = createSelectSchema(pullRequestComments).extend({})

type NewUserParams = z.infer<typeof insertUserSchema>
type NewPullRequestParams = z.infer<typeof insertPullRequestSchema>
type NewPullRequestParticipantParams = z.infer<typeof insertPullRequestParticipantSchema>
type NewPullRequestCommentParams = z.infer<typeof insertPullRequestCommentSchema>

export const insertUser = (user: NewUserParams) => db.insert(users).values(user).returning()

export const insertPullRequest = (pullRequest: NewPullRequestParams) =>
  db.insert(pullRequests).values(pullRequest).returning()

export const insertPullRequestParticipant = (participant: NewPullRequestParticipantParams) =>
  db.insert(pullRequestParticipants).values(participant).returning()

export const insertPullRequestComment = (comment: NewPullRequestCommentParams) =>
  db.insert(pullRequestComments).values(comment).returning()

export const getPullRequest = (pullRequestId: number) =>
  db.query.pullRequests.findFirst({
    where: eq(pullRequests.id, pullRequestId),
  })
