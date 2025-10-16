WITH CommentsData AS (
  SELECT 
    users.display_name AS User,
    strftime('%Y-%m', pull_request_comments.created_at) AS Month,  -- Monthly grouping
    COUNT(pull_request_comments.id) AS CommentsCount,
    SUM(LENGTH(pull_request_comments.content)) AS CommentsLength
  FROM 
    users
  LEFT JOIN 
    pull_request_comments ON users.uuid = pull_request_comments.author_id
  LEFT JOIN 
    pull_requests ON pull_request_comments.pull_request_id = pull_requests.id
  WHERE 
    DATE(pull_request_comments.created_at) > ?
    AND pull_requests.author_id != users.uuid  -- Exclude user's own PRs
    AND users.excluded IS NOT 1  -- Exclude excluded users
    AND pull_requests.repository = ?
    AND (? = '' OR INSTR(',' || ? || ',', ',' || users.display_name || ',') = 0)  -- Exclude ignored users
  GROUP BY 
    User, Month
),
ApprovalsData AS (
  SELECT
    users.display_name AS User,
    strftime('%Y-%m', pull_requests.created_at) AS Month,  -- Monthly grouping
    COUNT(DISTINCT pull_request_participants.pull_request_id) AS ApprovedCount
  FROM 
    users
  LEFT JOIN 
    pull_request_participants ON users.uuid = pull_request_participants.user_id
  LEFT JOIN 
    pull_requests ON pull_request_participants.pull_request_id = pull_requests.id
  WHERE 
    pull_request_participants.approved = 1
    AND DATE(pull_requests.created_at) > ?
    AND pull_requests.author_id != users.uuid  -- Exclude user's own PRs
    AND users.excluded IS NOT 1  -- Exclude excluded users
    AND pull_requests.repository = ?
    AND (? = '' OR INSTR(',' || ? || ',', ',' || users.display_name || ',') = 0)  -- Exclude ignored users
  GROUP BY 
    User, Month
)

SELECT 
  CommentsData.User,
  CommentsData.Month,
  CommentsData.CommentsCount,
  CommentsData.CommentsLength,
  IFNULL(ApprovalsData.ApprovedCount, 0) AS ApprovedCount
FROM 
  CommentsData
LEFT JOIN 
  ApprovalsData ON CommentsData.User = ApprovalsData.User 
                 AND CommentsData.Month = ApprovalsData.Month
ORDER BY 
  CommentsData.User, CommentsData.Month;