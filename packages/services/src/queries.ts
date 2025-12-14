const AUTHOR_FIELDS = `
  avatarUrl
  login
  url
`;

const REACTION_GROUPS_FIELDS = `
  content
  users { totalCount }
  viewerHasReacted
`;

const REPLY_FIELDS = `
  id
  author { ${AUTHOR_FIELDS} }
  viewerDidAuthor
  createdAt
  url
  authorAssociation
  lastEditedAt
  deletedAt
  isMinimized
  bodyHTML
  reactionGroups { ${REACTION_GROUPS_FIELDS} }
  replyTo { id }
`;

const COMMENT_FIELDS = `
  id
  upvoteCount
  viewerHasUpvoted
  viewerCanUpvote
  author { ${AUTHOR_FIELDS} }
  viewerDidAuthor
  createdAt
  url
  authorAssociation
  lastEditedAt
  deletedAt
  isMinimized
  bodyHTML
  reactionGroups { ${REACTION_GROUPS_FIELDS} }
  replies(last: 100) {
    totalCount
    nodes { ${REPLY_FIELDS} }
  }
`;

const DISCUSSION_FIELDS = `
  id
  number
  title
  body
  bodyHTML
  url
  locked
  createdAt
  author { ${AUTHOR_FIELDS} }
  category { id name slug }
  reactions { totalCount }
  reactionGroups { ${REACTION_GROUPS_FIELDS} }
`;

export const GET_DISCUSSION = `
  query GetDiscussion(
    $owner: String!
    $repo: String!
    $number: Int!
    $first: Int
    $last: Int
    $after: String
    $before: String
  ) {
    repository(owner: $owner, name: $repo) {
      discussion(number: $number) {
        ${DISCUSSION_FIELDS}
        comments(first: $first, last: $last, after: $after, before: $before) {
          totalCount
          pageInfo {
            startCursor
            endCursor
            hasNextPage
            hasPreviousPage
          }
          nodes { ${COMMENT_FIELDS} }
        }
      }
    }
  }
`;

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
          ${DISCUSSION_FIELDS}
          comments(first: 0) {
            totalCount
          }
        }
      }
    }
  }
`;

export const GET_REPOSITORY = `
  query GetRepository($owner: String!, $repo: String!) {
    repository(owner: $owner, name: $repo) {
      id
      discussionCategories(first: 20) {
        nodes { id name slug }
      }
    }
  }
`;

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
`;

export const ADD_DISCUSSION_COMMENT = `
  mutation AddDiscussionComment($discussionId: ID!, $body: String!) {
    addDiscussionComment(input: { discussionId: $discussionId, body: $body }) {
      comment { ${COMMENT_FIELDS} }
    }
  }
`;

export const ADD_DISCUSSION_REPLY = `
  mutation AddDiscussionReply($discussionId: ID!, $replyToId: ID!, $body: String!) {
    addDiscussionComment(input: {
      discussionId: $discussionId
      replyToId: $replyToId
      body: $body
    }) {
      comment {
        id
        author { ${AUTHOR_FIELDS} }
        viewerDidAuthor
        createdAt
        url
        authorAssociation
        lastEditedAt
        deletedAt
        isMinimized
        bodyHTML
        reactionGroups { ${REACTION_GROUPS_FIELDS} }
        replyTo { id }
      }
    }
  }
`;

export const ADD_REACTION = `
  mutation AddReaction($subjectId: ID!, $content: ReactionContent!) {
    addReaction(input: { subjectId: $subjectId, content: $content }) {
      reaction { id content }
    }
  }
`;

export const REMOVE_REACTION = `
  mutation RemoveReaction($subjectId: ID!, $content: ReactionContent!) {
    removeReaction(input: { subjectId: $subjectId, content: $content }) {
      reaction { id content }
    }
  }
`;

export const ADD_UPVOTE = `
  mutation AddUpvote($subjectId: ID!) {
    addUpvote(input: { subjectId: $subjectId }) {
      subject { upvoteCount }
    }
  }
`;

export const REMOVE_UPVOTE = `
  mutation RemoveUpvote($subjectId: ID!) {
    removeUpvote(input: { subjectId: $subjectId }) {
      subject { upvoteCount }
    }
  }
`;
