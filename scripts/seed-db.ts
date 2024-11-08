import 'dotenv/config'

import { Bitbucket } from '@/bitbucket/bitbucket'
import { subDays } from 'date-fns'
import {
  getPullRequest,
  insertPullRequestComment,
  insertPullRequest,
  insertPullRequestParticipant,
  insertUser,
} from '@/db'
import { OraLogger } from '@/logger/ora.logger'

const logger = new OraLogger()
const bitbucket = new Bitbucket({
  auth: {
    username: process.env.BITBUCKET_USERNAME!,
    password: process.env.BITBUCKET_APP_PASSWORD!,
  },
  project: {
    workspace: process.env.BITBUCKET_WORKSPACE!,
    repository: process.env.BITBUCKET_REPOSITORY!,
  },
})

await bitbucket.crawlPullRequests({
  from: subDays(new Date(), 2),
  onBeforeProcessingPullRequest: async (pullRequest, index, total) => {
    const progress = `${index + 1}/${total}`

    logger.startLoading(`${progress} Processing "${pullRequest.title}" (#${pullRequest.id})`)

    const existingPullRequest = await getPullRequest(pullRequest.id)
    const shouldProcess = !existingPullRequest
    if (!shouldProcess) {
      logger.stopLoading(`${progress} Pull request already exists, skipping...`)
    }

    return { shouldProcess }
  },
  onAfterProcessingPullRequest: async (pullRequest, index, total) => {
    await insertUser({
      uuid: pullRequest.author.uuid,
      display_name: pullRequest.author.display_name,
    }).onConflictDoNothing()

    await insertPullRequest({
      id: pullRequest.id,
      title: pullRequest.title,
      description: pullRequest.summary.raw,
      branch: pullRequest.source.branch.name,
      author_id: pullRequest.author.uuid,
      created_at: pullRequest.created_on,
      updated_at: pullRequest.updated_on,
    }).onConflictDoNothing()

    for (const participant of pullRequest.participants) {
      await insertUser({
        uuid: participant.user.uuid,
        display_name: participant.user.display_name,
      }).onConflictDoNothing()

      await insertPullRequestParticipant({
        pull_request_id: pullRequest.id,
        user_id: participant.user.uuid,
        role: participant.role,
        approved: participant.approved,
      }).onConflictDoNothing()
    }

    for (const comment of pullRequest.comments) {
      await insertUser({
        uuid: comment.user.uuid,
        display_name: comment.user.display_name,
      }).onConflictDoNothing()

      await insertPullRequestComment({
        id: comment.id,
        pull_request_id: pullRequest.id,
        author_id: comment.user.uuid,
        created_at: comment.created_on,
        updated_at: comment.updated_on,
        content: comment.content.raw,
      })
    }

    logger.stopLoading()
  },
})

logger.info('Done!')
process.exit(0)
