import { useState, useEffect, useRef, useCallback } from "react";
import {
  Discussion,
  Comment,
  Reply,
  Reactions,
  type DiscussionType,
  type CommentType,
  type ReplyType,
  type ReactionContent,
  type PageInfo,
  type Viewer,
} from "@giscore/react";
import {
  useViewer,
  useInfiniteDiscussion,
  useAddComment,
  useToggleReaction,
} from "@giscore/react/tanstack-query";
import { useGiscore } from "@giscore/react";

function generateMockComments(count: number, startId: number): CommentType[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `DC_kwDOMock${startId + i}`,
    upvoteCount: Math.floor(Math.random() * 10),
    viewerHasUpvoted: Math.random() > 0.7,
    viewerCanUpvote: true,
    author: {
      login: `user${startId + i}`,
      avatarUrl: `https://avatars.githubusercontent.com/u/${startId + i}?v=4`,
      url: `https://github.com/user${startId + i}`,
    },
    viewerDidAuthor: false,
    createdAt: new Date(Date.now() - (startId + i) * 3600000).toISOString(),
    url: `https://github.com/example/repo/discussions/1#comment-${startId + i}`,
    authorAssociation: "NONE",
    lastEditedAt: null,
    deletedAt: null,
    isMinimized: false,
    body: `This is comment #${startId + i}`,
    bodyHTML: `<p>This is comment #${startId + i}</p>`,
    reactionGroups:
      Math.random() > 0.5
        ? [
            {
              content: "THUMBS_UP" as ReactionContent,
              users: { totalCount: Math.floor(Math.random() * 5) },
              viewerHasReacted: Math.random() > 0.7,
            },
          ]
        : [],
    replies: { totalCount: 0, nodes: [] },
  }));
}

const MOCK_PAGE_SIZE = 5;

function createMockDiscussion(
  pageIndex: number,
  hasMore: boolean
): DiscussionType {
  const startId = pageIndex * MOCK_PAGE_SIZE + 1;
  return {
    id: "D_kwDOExample",
    number: 1,
    title: "Welcome to Giscore! (Infinite Scroll Demo)",
    body: "This demo shows infinite scrolling with paginated comments.",
    bodyHTML:
      "<p>This demo shows infinite scrolling with paginated comments.</p>",
    url: "https://github.com/example/repo/discussions/1",
    locked: false,
    createdAt: new Date().toISOString(),
    author: {
      login: "demo-user",
      avatarUrl: "https://avatars.githubusercontent.com/u/1?v=4",
      url: "https://github.com/demo-user",
    },
    category: {
      id: "DIC_kwDOExample",
      name: "General",
      slug: "general",
    },
    reactionGroups: [
      {
        content: "THUMBS_UP",
        users: { totalCount: 5 },
        viewerHasReacted: false,
      },
      { content: "HEART", users: { totalCount: 3 }, viewerHasReacted: true },
    ],
    reactions: { totalCount: 8 },
    comments: {
      totalCount: 25,
      pageInfo: {
        startCursor: pageIndex > 0 ? `cursor_${pageIndex}` : null,
        endCursor: hasMore ? `cursor_${pageIndex + 1}` : null,
        hasNextPage: hasMore,
        hasPreviousPage: pageIndex > 0,
      },
      nodes: generateMockComments(MOCK_PAGE_SIZE, startId),
    },
  };
}

function ReactionBar({
  onToggle,
}: {
  onToggle?: (content: ReactionContent, hasReacted: boolean) => void;
}) {
  return (
    <div className="flex items-center gap-1">
      <Reactions.List>
        {(reaction, index) => (
          <button
            key={index}
            onClick={() => onToggle?.(reaction.content, reaction.viewerHasReacted)}
            className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs transition-colors ${
              reaction.viewerHasReacted
                ? "border-blue-300 bg-blue-50 text-blue-700"
                : "border-gray-200 bg-gray-50 text-gray-600 hover:border-gray-300"
            }`}
          >
            <span>{reaction.emoji}</span>
            <span>{reaction.users.totalCount}</span>
          </button>
        )}
      </Reactions.List>
    </div>
  );
}

function CommentItem({
  comment,
  onReaction,
}: {
  comment: CommentType;
  onReaction?: (
    subjectId: string,
    content: ReactionContent,
    hasReacted: boolean
  ) => void;
}) {
  return (
    <Comment.Root comment={comment}>
      <div className="rounded-lg border border-gray-200 bg-white">
        <div className="flex items-start gap-3 border-b border-gray-100 p-4">
          <Comment.Avatar className="h-8 w-8 rounded-full" />
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <Comment.Author className="font-medium text-gray-900" />
              <Comment.Time className="text-xs text-gray-500" />
            </div>
            <Comment.Body className="prose prose-sm mt-2 text-gray-700" />
            <div className="mt-3">
              <Comment.Reactions>
                <ReactionBar
                  onToggle={(content, hasReacted) =>
                    onReaction?.(comment.id, content, hasReacted)
                  }
                />
              </Comment.Reactions>
            </div>
          </div>
        </div>

        <Comment.Replies>
          {(reply: ReplyType, index: number) => (
            <ReplyItem key={index} reply={reply} onReaction={onReaction} />
          )}
        </Comment.Replies>
      </div>
    </Comment.Root>
  );
}

function ReplyItem({
  reply,
  onReaction,
}: {
  reply: ReplyType;
  onReaction?: (
    subjectId: string,
    content: ReactionContent,
    hasReacted: boolean
  ) => void;
}) {
  return (
    <Reply.Root reply={reply}>
      <div className="flex items-start gap-3 border-t border-gray-100 bg-gray-50/50 p-4 pl-12">
        <Reply.Avatar className="h-6 w-6 rounded-full" />
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <Reply.Author className="text-sm font-medium text-gray-900" />
            <Reply.Time className="text-xs text-gray-500" />
          </div>
          <Reply.Body className="prose prose-sm mt-1 text-gray-700" />
          <div className="mt-2">
            <Reply.Reactions>
              <ReactionBar
                onToggle={(content, hasReacted) =>
                  onReaction?.(reply.id, content, hasReacted)
                }
              />
            </Reply.Reactions>
          </div>
        </div>
      </div>
    </Reply.Root>
  );
}

function CommentForm({ onSubmit }: { onSubmit: (body: string) => void }) {
  const [body, setBody] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (body.trim()) {
      onSubmit(body);
      setBody("");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="mt-4">
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Write a comment..."
        className="w-full rounded-lg border border-gray-300 p-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        rows={3}
      />
      <div className="mt-2 flex justify-end">
        <button
          type="submit"
          disabled={!body.trim()}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Comment
        </button>
      </div>
    </form>
  );
}

function useIntersectionObserver(
  onIntersect: () => void,
  enabled: boolean
): React.RefObject<HTMLDivElement | null> {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!enabled) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          onIntersect();
        }
      },
      { threshold: 0.1 }
    );

    const el = ref.current;
    if (el) observer.observe(el);

    return () => {
      if (el) observer.unobserve(el);
    };
  }, [onIntersect, enabled]);

  return ref;
}

interface InfiniteDiscussionViewProps {
  discussion: DiscussionType;
  comments: CommentType[];
  pageInfo: PageInfo;
  totalCount: number;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  onLoadMore: () => void;
  onReaction: (
    subjectId: string,
    content: ReactionContent,
    hasReacted: boolean
  ) => void;
  onAddComment: (body: string) => void;
  isAuthenticated?: boolean;
  onLogin?: () => void;
  viewer?: Viewer | null;
}

function InfiniteDiscussionView({
  discussion,
  comments,
  totalCount,
  hasNextPage,
  isFetchingNextPage,
  onLoadMore,
  onReaction,
  onAddComment,
  isAuthenticated = true,
  onLogin,
  viewer,
}: InfiniteDiscussionViewProps) {
  const loadMoreRef = useIntersectionObserver(
    onLoadMore,
    hasNextPage && !isFetchingNextPage
  );

  return (
    <Discussion.Root discussion={discussion}>
      <div className="space-y-6">
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <Discussion.Title className="text-xl font-bold text-gray-900" />
          <Discussion.Body className="prose mt-4 text-gray-700" />
          <div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-4">
            <Discussion.Reactions>
              <ReactionBar
                onToggle={(content, hasReacted) =>
                  onReaction(discussion.id, content, hasReacted)
                }
              />
            </Discussion.Reactions>
            <div className="text-sm text-gray-500">
              {comments.length} / {totalCount} comments
            </div>
          </div>
        </div>

        <div className="space-y-4">
          {comments.map((comment, index) => (
            <CommentItem
              key={comment.id || index}
              comment={comment}
              onReaction={onReaction}
            />
          ))}
        </div>

        {hasNextPage && (
          <div
            ref={loadMoreRef}
            className="flex items-center justify-center py-4"
          >
            {isFetchingNextPage ? (
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
            ) : (
              <button
                onClick={onLoadMore}
                className="text-sm text-blue-600 hover:text-blue-700"
              >
                Load more comments
              </button>
            )}
          </div>
        )}

        {isAuthenticated ? (
          <div className="flex items-start gap-3">
            {viewer && (
              <img
                src={viewer.avatarUrl}
                alt={viewer.login}
                className="h-8 w-8 rounded-full"
              />
            )}
            <div className="flex-1">
              <CommentForm onSubmit={onAddComment} />
            </div>
          </div>
        ) : (
          <button
            onClick={onLogin}
            className="w-full rounded-lg bg-gray-900 px-4 py-3 text-sm font-medium text-white hover:bg-gray-800"
          >
            Sign in with GitHub to comment
          </button>
        )}
      </div>
    </Discussion.Root>
  );
}

function MockInfiniteExample() {
  const [pages, setPages] = useState<DiscussionType[]>(() => [
    createMockDiscussion(0, true),
  ]);
  const [isFetching, setIsFetching] = useState(false);

  const allComments = pages.flatMap((p) => p.comments.nodes);
  const lastPage = pages[pages.length - 1];
  const hasNextPage = lastPage?.comments.pageInfo.hasNextPage ?? false;
  const totalCount = lastPage?.comments.totalCount ?? 0;

  const handleLoadMore = useCallback(() => {
    if (isFetching || !hasNextPage) return;

    setIsFetching(true);
    setTimeout(() => {
      const nextPageIndex = pages.length;
      const hasMore = nextPageIndex < 4;
      setPages((prev) => [...prev, createMockDiscussion(nextPageIndex, hasMore)]);
      setIsFetching(false);
    }, 500);
  }, [isFetching, hasNextPage, pages.length]);

  const handleReaction = (
    subjectId: string,
    content: ReactionContent,
    hasReacted: boolean
  ) => {
    console.log("Toggle reaction:", { subjectId, content, hasReacted });
  };

  const handleAddComment = (body: string) => {
    console.log("Add comment:", body);
  };

  const firstPage = pages[0];
  if (!firstPage || !lastPage) {
    return null;
  }

  return (
    <InfiniteDiscussionView
      discussion={firstPage}
      comments={allComments}
      pageInfo={lastPage.comments.pageInfo}
      totalCount={totalCount}
      hasNextPage={hasNextPage}
      isFetchingNextPage={isFetching}
      onLoadMore={handleLoadMore}
      onReaction={handleReaction}
      onAddComment={handleAddComment}
    />
  );
}

function LiveInfiniteExample() {
  const { config, isAuthenticated, login } = useGiscore();
  const { data: viewer } = useViewer();
  const {
    data,
    isLoading,
    error,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
    refetch,
  } = useInfiniteDiscussion(1, 10);

  const toggleReaction = useToggleReaction();
  const addComment = useAddComment({
    onSuccess: () => {
      refetch();
    },
  });

  const handleReaction = (
    subjectId: string,
    content: ReactionContent,
    hasReacted: boolean
  ) => {
    if (!isAuthenticated) {
      login();
      return;
    }
    toggleReaction.mutate({ subjectId, content, hasReacted });
  };

  const handleAddComment = (body: string) => {
    const firstPage = data?.pages[0] ?? null;
    if (!firstPage) return;
    addComment.mutate({ discussionId: firstPage.id, body });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  if (error && !error.message.includes("not found")) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
        Error loading discussion: {error.message}
      </div>
    );
  }

  const firstPage = data?.pages[0];

  if (!firstPage) {
    return (
      <div className="space-y-6">
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <h2 className="text-xl font-bold text-gray-900">
            {config.term || "Discussion"}
          </h2>
          <p className="mt-2 text-gray-600">
            No discussion yet. Be the first to comment!
          </p>
        </div>
        {isAuthenticated ? (
          <div className="rounded-lg border border-gray-200 bg-white p-4 text-center text-gray-500">
            Discussion will be created when the first comment is added.
          </div>
        ) : (
          <button
            onClick={login}
            className="w-full rounded-lg bg-gray-900 px-4 py-3 text-sm font-medium text-white hover:bg-gray-800"
          >
            Sign in with GitHub to comment
          </button>
        )}
      </div>
    );
  }

  const allComments = data.pages.flatMap((p) => p?.comments.nodes ?? []);
  const lastPage = data.pages[data.pages.length - 1];

  return (
    <>
      <InfiniteDiscussionView
        discussion={firstPage}
        comments={allComments}
        pageInfo={lastPage?.comments.pageInfo ?? firstPage.comments.pageInfo}
        totalCount={firstPage.comments.totalCount}
        hasNextPage={hasNextPage}
        isFetchingNextPage={isFetchingNextPage}
        onLoadMore={() => fetchNextPage()}
        onReaction={handleReaction}
        onAddComment={handleAddComment}
        isAuthenticated={isAuthenticated}
        onLogin={login}
        viewer={viewer}
      />
      {addComment.isPending && (
        <div className="mt-4 text-center text-gray-500">Adding comment...</div>
      )}
      {addComment.isError && (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
          Error: {addComment.error.message}
        </div>
      )}
    </>
  );
}

function UserMenu() {
  const { isAuthenticated, isLoading, login, logout } = useGiscore();
  const { data: viewer } = useViewer();

  if (isLoading) {
    return (
      <div className="flex items-center gap-2">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-gray-400 border-t-transparent" />
        <span className="text-sm text-gray-500">Signing in...</span>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <button
        onClick={login}
        className="rounded-lg bg-gray-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-gray-800"
      >
        Sign in with GitHub
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      {viewer && (
        <>
          <img
            src={viewer.avatarUrl}
            alt={viewer.login}
            className="h-8 w-8 rounded-full"
          />
          <span className="text-sm text-gray-700">{viewer.login}</span>
        </>
      )}
      <button
        onClick={logout}
        className="text-sm text-gray-500 hover:text-gray-700"
      >
        Sign out
      </button>
    </div>
  );
}

export default function App() {
  const [useMock, setUseMock] = useState(true);

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="mx-auto max-w-2xl px-4">
        <div className="mb-8 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Giscore Example</h1>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={useMock}
                onChange={(e) => setUseMock(e.target.checked)}
                className="rounded border-gray-300"
              />
              <span className="text-gray-600">Use mock data</span>
            </label>
            {!useMock && <UserMenu />}
          </div>
        </div>

        {useMock ? <MockInfiniteExample /> : <LiveInfiniteExample />}
      </div>
    </div>
  );
}
