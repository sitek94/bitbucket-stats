import {subDays, subMonths} from 'date-fns'
import {Bitbucket} from './bitbucket'

const bitbucket = new Bitbucket({
  auth: {
    username: Bun.env.BITBUCKET_USERNAME!,
    password: Bun.env.BITBUCKET_APP_PASSWORD!,
  },
  project: {
    workspace: Bun.env.BITBUCKET_WORKSPACE!,
    repository: Bun.env.BITBUCKET_REPOSITORY!,
  },
})

const pullRequests = await bitbucket.getPullRequests({
  from: subDays(new Date(), 90),
})

type UserStats = {
  comments: number
  commentsLength: number
}

const users = new Map<string, UserStats>()

for (const pullRequest of pullRequests) {
  if (!users.has(pullRequest.author.display_name)) {
    initializeUser(pullRequest.author.display_name)
  }

  const comments = await bitbucket.getPullRequestComments(pullRequest.id)

  for (const comment of comments) {
    const isReviewerComment =
      comment.user.display_name !== pullRequest.author.display_name

    if (isReviewerComment) {
      if (!users.has(comment.user.display_name)) {
        initializeUser(comment.user.display_name)
      } else {
        users.get(comment.user.display_name)!.comments++
        users.get(comment.user.display_name)!.commentsLength +=
          comment.content.raw.length
      }
    }
  }
}

function initializeUser(name: string) {
  users.set(name, {
    comments: 0,
    commentsLength: 0,
  })
}

const usersArray = Array.from(users.entries())
  .map(([name, stats]) => ({
    name,
    ...stats,
  }))
  .toSorted((a, b) => b.comments - a.comments)

console.table(usersArray)
