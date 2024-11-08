// type UserStats = {
//   commentsCount: number
//   commentsLength: number
//   approvedCount: number
// }

// const users = new Map<string, UserStats>()

// for (const pullRequest of pullRequests) {
//   const {participants} = await bitbucket.getPullRequest(pullRequest.id)

//   if (!users.has(pullRequest.author.display_name)) {
//     createUser(pullRequest.author.display_name)
//   }

//   for (const participant of participants) {
//     if (!users.has(participant.user.display_name)) {
//       createUser(participant.user.display_name)
//     }

//     if (participant.approved) {
//       users.get(participant.user.display_name)!.approvedCount++
//     }
//   }

//   const comments = await bitbucket.getPullRequestComments(pullRequest.id)

//   for (const comment of comments) {
//     const isReviewerComment =
//       comment.user.display_name !== pullRequest.author.display_name

//     if (isReviewerComment) {
//       if (!users.has(comment.user.display_name)) {
//         createUser(comment.user.display_name)
//       } else {
//         users.get(comment.user.display_name)!.commentsCount++
//         users.get(comment.user.display_name)!.commentsLength +=
//           comment.content.raw.length
//       }
//     }
//   }
// }

// function createUser(name: string) {
//   users.set(name, {
//     commentsCount: 0,
//     commentsLength: 0,
//     approvedCount: 0,
//   })
// }

// const usersArray = Array.from(users.entries())
//   .map(([name, stats]) => ({
//     name,
//     ...stats,
//   }))
//   .toSorted((a, b) => b.commentsCount - a.commentsCount)

// console.table(usersArray)
