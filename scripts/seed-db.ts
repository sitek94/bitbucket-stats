import 'dotenv/config'

import { Bitbucket } from '@/bitbucket/bitbucket'
import {
  getPullRequest,
  insertPullRequestComment,
  insertPullRequest,
  insertPullRequestParticipant,
  insertUser,
} from '@/db'
import { OraLogger } from '@/logger/ora.logger'

export async function seed({ repository, from, to }: { repository: string; from: Date; to?: Date }) {
  const logger = new OraLogger()
  const bitbucket = new Bitbucket({ repository })

  await bitbucket.crawlPullRequests({
    queryOptions: { from, to },
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
      await insertUser(pullRequest.author).onConflictDoNothing()
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
        await insertUser(participant.user).onConflictDoNothing()

        const isOwner = participant.user.uuid === pullRequest.author.uuid
        if (!isOwner) {
          await insertPullRequestParticipant({
            pull_request_id: pullRequest.id,
            user_id: participant.user.uuid,
            role: participant.role,
            approved: participant.approved,
          }).onConflictDoNothing()
        }
      }

      for (const comment of pullRequest.comments) {
        await insertUser(comment.user).onConflictDoNothing()

        const isOwner = comment.user.uuid === pullRequest.author.uuid
        if (!isOwner) {
          await insertPullRequestComment({
            id: comment.id,
            pull_request_id: pullRequest.id,
            author_id: comment.user.uuid,
            created_at: comment.created_on,
            updated_at: comment.updated_on,
            content: comment.content.raw,
          }).onConflictDoNothing()
        }
      }

      logger.stopLoading()
    },
  })
}
