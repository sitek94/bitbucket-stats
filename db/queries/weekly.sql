WITH CommentsData AS (
  SELECT 
    users.display_name AS User,
    strftime('%Y-%W', pull_request_comments.created_at) AS Week,  -- Weekly grouping
    COUNT(pull_request_comments.id) AS CommentsCount,
    SUM(LENGTH(pull_request_comments.content)) AS CommentsLength
  FROM 
    users
  LEFT JOIN 
    pull_request_comments ON users.uuid = pull_request_comments.author_id
  LEFT JOIN 
    pull_requests ON pull_request_comments.pull_request_id = pull_requests.id
  WHERE 
    DATE(pull_request_comments.created_at) > DATE('now', '-300 days')
    AND pull_requests.author_id != users.uuid  -- Exclude user’s own PRs
  GROUP BY 
    User, Week
),
ApprovalsData AS (
  SELECT
    users.display_name AS User,
    strftime('%Y-%W', pull_requests.created_at) AS Week,  -- Weekly grouping
    COUNT(DISTINCT pull_request_participants.pull_request_id) AS ApprovedCount
  FROM 
    users
  LEFT JOIN 
    pull_request_participants ON users.uuid = pull_request_participants.user_id
  LEFT JOIN 
    pull_requests ON pull_request_participants.pull_request_id = pull_requests.id
  WHERE 
    pull_request_participants.approved = 1
    AND DATE(pull_requests.created_at) > DATE('now', '-300 days')
    AND pull_requests.author_id != users.uuid  -- Exclude user’s own PRs
  GROUP BY 
    User, Week
)

SELECT 
  CommentsData.User,
  CommentsData.Week,
  CommentsData.CommentsCount,
  CommentsData.CommentsLength,
  IFNULL(ApprovalsData.ApprovedCount, 0) AS ApprovedCount
FROM 
  CommentsData
LEFT JOIN 
  ApprovalsData ON CommentsData.User = ApprovalsData.User AND CommentsData.Week = ApprovalsData.Week
ORDER BY 
  CommentsData.User, CommentsData.Week;