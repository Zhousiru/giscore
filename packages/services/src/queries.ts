// GraphQL Fragments for reusable field sets
const AUTHOR_FRAGMENT = `
fragment AuthorFields on Actor {
  avatarUrl
  login
  url
}
`

const REACTION_GROUPS_FRAGMENT = `
fragment ReactionGroupFields on ReactionGroup {
  content
  users { totalCount }
  viewerHasReacted
}
`

const REPLY_FRAGMENT = `
fragment ReplyFields on DiscussionComment {
  id
  author { ...AuthorFields }
  viewerDidAuthor
  createdAt
  url
  authorAssociation
  lastEditedAt
  deletedAt
  isMinimized
  body
  bodyHTML
  reactionGroups { ...ReactionGroupFields }
  replyTo { id }
}
`

const COMMENT_FRAGMENT = `
fragment CommentFields on DiscussionComment {
  id
  upvoteCount
  viewerHasUpvoted
  viewerCanUpvote
  author { ...AuthorFields }
  viewerDidAuthor
  createdAt
  url
  authorAssociation
  lastEditedAt
  deletedAt
  isMinimized
  body
  bodyHTML
  reactionGroups { ...ReactionGroupFields }
}
`

const COMMENT_WITH_REPLIES_FRAGMENT = `
fragment CommentWithRepliesFields on DiscussionComment {
  ...CommentFields
  replies(first: $replyFirst, last: $replyLast) {
    totalCount
    pageInfo {
      startCursor
      endCursor
      hasNextPage
      hasPreviousPage
    }
    nodes { ...ReplyFields }
  }
}
`

const DISCUSSION_FRAGMENT = `
fragment DiscussionFields on Discussion {
  id
  number
  title
  body
  bodyHTML
  url
  locked
  createdAt
  author { ...AuthorFields }
  category { id name slug }
  reactions { totalCount }
  reactionGroups { ...ReactionGroupFields }
}
`

const COMMENT_FRAGMENTS = `
  ${AUTHOR_FRAGMENT}
  ${REACTION_GROUPS_FRAGMENT}
  ${REPLY_FRAGMENT}
  ${COMMENT_FRAGMENT}
  ${COMMENT_WITH_REPLIES_FRAGMENT}
`

const DISCUSSION_FRAGMENTS = `
  ${COMMENT_FRAGMENTS}
  ${DISCUSSION_FRAGMENT}
`

export const GET_DISCUSSION = `
  query GetDiscussion(
    $owner: String!
    $repo: String!
    $number: Int!
    $first: Int
    $last: Int
    $after: String
    $before: String
    $replyFirst: Int
    $replyLast: Int
  ) {
    repository(owner: $owner, name: $repo) {
      discussion(number: $number) {
        ...DiscussionFields
        comments(first: $first, last: $last, after: $after, before: $before) {
          totalCount
          pageInfo {
            startCursor
            endCursor
            hasNextPage
            hasPreviousPage
          }
          nodes { ...CommentWithRepliesFields }
        }
      }
    }
  }
  ${DISCUSSION_FRAGMENTS}
`

export const GET_COMMENT_REPLIES = `
  query GetCommentReplies(
    $id: ID!
    $first: Int
    $last: Int
    $after: String
    $before: String
  ) {
    node(id: $id) {
      ... on DiscussionComment {
        replies(first: $first, last: $last, after: $after, before: $before) {
          totalCount
          pageInfo {
            startCursor
            endCursor
            hasNextPage
            hasPreviousPage
          }
          nodes { ...ReplyFields }
        }
      }
    }
  }
  ${AUTHOR_FRAGMENT}
  ${REACTION_GROUPS_FRAGMENT}
  ${REPLY_FRAGMENT}
`

export const SEARCH_DISCUSSIONS = `
  query SearchDiscussions(
    $query: String!
    $first: Int
    $last: Int
    $after: String
    $before: String
  ) {
    search(
      query: $query
      type: DISCUSSION
      first: $first
      last: $last
      after: $after
      before: $before
    ) {
      discussionCount
      pageInfo {
        startCursor
        endCursor
        hasNextPage
        hasPreviousPage
      }
      nodes {
        ... on Discussion {
          ...DiscussionFields
          comments(first: 0) {
            totalCount
          }
        }
      }
    }
  }
  ${AUTHOR_FRAGMENT}
  ${REACTION_GROUPS_FRAGMENT}
  ${DISCUSSION_FRAGMENT}
`

export const GET_REPOSITORY = `
  query GetRepository($owner: String!, $repo: String!) {
    repository(owner: $owner, name: $repo) {
      id
      discussionCategories(first: 20) {
        nodes { id name slug }
      }
    }
  }
`

export const GET_VIEWER = `
  query GetViewer {
    viewer {
      login
      avatarUrl
      url
    }
  }
`

export const CREATE_DISCUSSION = `
  mutation CreateDiscussion(
    $repositoryId: ID!
    $categoryId: ID!
    $title: String!
    $body: String!
  ) {
    createDiscussion(input: {
      repositoryId: $repositoryId
      categoryId: $categoryId
      title: $title
      body: $body
    }) {
      discussion { id number url }
    }
  }
`

export const ADD_DISCUSSION_COMMENT = `
  mutation AddDiscussionComment(
    $discussionId: ID!
    $body: String!
    $replyFirst: Int
    $replyLast: Int
  ) {
    addDiscussionComment(input: { discussionId: $discussionId, body: $body }) {
      comment { ...CommentWithRepliesFields }
    }
  }
  ${COMMENT_FRAGMENTS}
`

export const ADD_DISCUSSION_REPLY = `
  mutation AddDiscussionReply(
    $discussionId: ID!
    $replyToId: ID!
    $body: String!
  ) {
    addDiscussionComment(input: {
      discussionId: $discussionId
      replyToId: $replyToId
      body: $body
    }) {
      comment { ...ReplyFields }
    }
  }
  ${AUTHOR_FRAGMENT}
  ${REACTION_GROUPS_FRAGMENT}
  ${REPLY_FRAGMENT}
`

export const ADD_REACTION = `
  mutation AddReaction($subjectId: ID!, $content: ReactionContent!) {
    addReaction(input: { subjectId: $subjectId, content: $content }) {
      reaction { id content }
    }
  }
`

export const REMOVE_REACTION = `
  mutation RemoveReaction($subjectId: ID!, $content: ReactionContent!) {
    removeReaction(input: { subjectId: $subjectId, content: $content }) {
      reaction { id content }
    }
  }
`

export const ADD_UPVOTE = `
  mutation AddUpvote($subjectId: ID!) {
    addUpvote(input: { subjectId: $subjectId }) {
      subject { upvoteCount }
    }
  }
`

export const REMOVE_UPVOTE = `
  mutation RemoveUpvote($subjectId: ID!) {
    removeUpvote(input: { subjectId: $subjectId }) {
      subject { upvoteCount }
    }
  }
`
