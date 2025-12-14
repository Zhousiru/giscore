import {
  createContext,
  useContext,
  type ReactNode,
  type ComponentPropsWithoutRef,
  type ElementType,
} from "react";
import type {
  Discussion as DiscussionData,
  Comment as CommentData,
  Reply as ReplyData,
  ReactionGroup,
  ReactionContent,
} from "@giscore/core";

type PolymorphicProps<E extends ElementType, P = object> = P &
  Omit<ComponentPropsWithoutRef<E>, keyof P> & {
    as?: E;
  };

// Discussion Context
interface DiscussionContextValue {
  discussion: DiscussionData;
}

const DiscussionContext = createContext<DiscussionContextValue | null>(null);

function useDiscussionContext() {
  const ctx = useContext(DiscussionContext);
  if (!ctx) throw new Error("Must be used within Discussion.Root");
  return ctx;
}

// Discussion Components
interface DiscussionRootProps {
  discussion: DiscussionData;
  children: ReactNode;
}

function DiscussionRoot({ discussion, children }: DiscussionRootProps) {
  return (
    <DiscussionContext.Provider value={{ discussion }}>
      {children}
    </DiscussionContext.Provider>
  );
}

function DiscussionTitle<E extends ElementType = "h2">({
  as,
  ...props
}: PolymorphicProps<E>) {
  const { discussion } = useDiscussionContext();
  const Component = as || "h2";
  return <Component {...props}>{discussion.title}</Component>;
}

function DiscussionBody<E extends ElementType = "div">({
  as,
  ...props
}: PolymorphicProps<E>) {
  const { discussion } = useDiscussionContext();
  const Component = as || "div";
  return (
    <Component
      {...props}
      dangerouslySetInnerHTML={{ __html: discussion.bodyHTML }}
    />
  );
}

interface DiscussionCommentsProps {
  children: (comment: CommentData, index: number) => ReactNode;
}

function DiscussionComments({ children }: DiscussionCommentsProps) {
  const { discussion } = useDiscussionContext();
  return <>{discussion.comments.nodes.map(children)}</>;
}

function DiscussionCommentCount<E extends ElementType = "span">({
  as,
  ...props
}: PolymorphicProps<E>) {
  const { discussion } = useDiscussionContext();
  const Component = as || "span";
  return <Component {...props}>{discussion.comments.totalCount}</Component>;
}

function DiscussionReactions({ children }: { children: ReactNode }) {
  const { discussion } = useDiscussionContext();
  return (
    <ReactionGroupContext.Provider
      value={{ reactionGroups: discussion.reactionGroups, subjectId: discussion.id }}
    >
      {children}
    </ReactionGroupContext.Provider>
  );
}

export const Discussion = {
  Root: DiscussionRoot,
  Title: DiscussionTitle,
  Body: DiscussionBody,
  Comments: DiscussionComments,
  CommentCount: DiscussionCommentCount,
  Reactions: DiscussionReactions,
};

// Comment Context
interface CommentContextValue {
  comment: CommentData;
}

const CommentContext = createContext<CommentContextValue | null>(null);

function useCommentContext() {
  const ctx = useContext(CommentContext);
  if (!ctx) throw new Error("Must be used within Comment.Root");
  return ctx;
}

// Comment Components
interface CommentRootProps {
  comment: CommentData;
  children: ReactNode;
}

function CommentRoot({ comment, children }: CommentRootProps) {
  return (
    <CommentContext.Provider value={{ comment }}>
      {children}
    </CommentContext.Provider>
  );
}

function CommentAuthor<E extends ElementType = "span">({
  as,
  ...props
}: PolymorphicProps<E>) {
  const { comment } = useCommentContext();
  const Component = as || "span";
  return <Component {...props}>{comment.author?.login ?? "Ghost"}</Component>;
}

function CommentAvatar<E extends ElementType = "img">({
  as,
  ...props
}: PolymorphicProps<E, { alt?: string }>) {
  const { comment } = useCommentContext();
  const Component = as || "img";
  return (
    <Component
      src={comment.author?.avatarUrl}
      alt={props.alt ?? comment.author?.login ?? "Avatar"}
      {...props}
    />
  );
}

function CommentBody<E extends ElementType = "div">({
  as,
  ...props
}: PolymorphicProps<E>) {
  const { comment } = useCommentContext();
  const Component = as || "div";
  return (
    <Component
      {...props}
      dangerouslySetInnerHTML={{ __html: comment.bodyHTML }}
    />
  );
}

function CommentTime<E extends ElementType = "time">({
  as,
  ...props
}: PolymorphicProps<E>) {
  const { comment } = useCommentContext();
  const Component = as || "time";
  return (
    <Component dateTime={comment.createdAt} {...props}>
      {new Date(comment.createdAt).toLocaleDateString()}
    </Component>
  );
}

interface CommentRepliesProps {
  children: (reply: ReplyData, index: number) => ReactNode;
}

function CommentReplies({ children }: CommentRepliesProps) {
  const { comment } = useCommentContext();
  return <>{comment.replies.nodes.map(children)}</>;
}

function CommentReplyCount<E extends ElementType = "span">({
  as,
  ...props
}: PolymorphicProps<E>) {
  const { comment } = useCommentContext();
  const Component = as || "span";
  return <Component {...props}>{comment.replies.totalCount}</Component>;
}

function CommentReactions({ children }: { children: ReactNode }) {
  const { comment } = useCommentContext();
  return (
    <ReactionGroupContext.Provider
      value={{ reactionGroups: comment.reactionGroups, subjectId: comment.id }}
    >
      {children}
    </ReactionGroupContext.Provider>
  );
}

interface CommentUpvoteProps {
  children: (props: {
    count: number;
    hasUpvoted: boolean;
    canUpvote: boolean;
  }) => ReactNode;
}

function CommentUpvote({ children }: CommentUpvoteProps) {
  const { comment } = useCommentContext();
  return (
    <>
      {children({
        count: comment.upvoteCount,
        hasUpvoted: comment.viewerHasUpvoted,
        canUpvote: comment.viewerCanUpvote,
      })}
    </>
  );
}

export const Comment = {
  Root: CommentRoot,
  Author: CommentAuthor,
  Avatar: CommentAvatar,
  Body: CommentBody,
  Time: CommentTime,
  Replies: CommentReplies,
  ReplyCount: CommentReplyCount,
  Reactions: CommentReactions,
  Upvote: CommentUpvote,
};

// Reply Context
interface ReplyContextValue {
  reply: ReplyData;
}

const ReplyContext = createContext<ReplyContextValue | null>(null);

function useReplyContext() {
  const ctx = useContext(ReplyContext);
  if (!ctx) throw new Error("Must be used within Reply.Root");
  return ctx;
}

// Reply Components
interface ReplyRootProps {
  reply: ReplyData;
  children: ReactNode;
}

function ReplyRoot({ reply, children }: ReplyRootProps) {
  return (
    <ReplyContext.Provider value={{ reply }}>{children}</ReplyContext.Provider>
  );
}

function ReplyAuthor<E extends ElementType = "span">({
  as,
  ...props
}: PolymorphicProps<E>) {
  const { reply } = useReplyContext();
  const Component = as || "span";
  return <Component {...props}>{reply.author?.login ?? "Ghost"}</Component>;
}

function ReplyAvatar<E extends ElementType = "img">({
  as,
  ...props
}: PolymorphicProps<E, { alt?: string }>) {
  const { reply } = useReplyContext();
  const Component = as || "img";
  return (
    <Component
      src={reply.author?.avatarUrl}
      alt={props.alt ?? reply.author?.login ?? "Avatar"}
      {...props}
    />
  );
}

function ReplyBody<E extends ElementType = "div">({
  as,
  ...props
}: PolymorphicProps<E>) {
  const { reply } = useReplyContext();
  const Component = as || "div";
  return (
    <Component
      {...props}
      dangerouslySetInnerHTML={{ __html: reply.bodyHTML }}
    />
  );
}

function ReplyTime<E extends ElementType = "time">({
  as,
  ...props
}: PolymorphicProps<E>) {
  const { reply } = useReplyContext();
  const Component = as || "time";
  return (
    <Component dateTime={reply.createdAt} {...props}>
      {new Date(reply.createdAt).toLocaleDateString()}
    </Component>
  );
}

function ReplyReactions({ children }: { children: ReactNode }) {
  const { reply } = useReplyContext();
  return (
    <ReactionGroupContext.Provider
      value={{ reactionGroups: reply.reactionGroups, subjectId: reply.id }}
    >
      {children}
    </ReactionGroupContext.Provider>
  );
}

export const ReplyComponent = {
  Root: ReplyRoot,
  Author: ReplyAuthor,
  Avatar: ReplyAvatar,
  Body: ReplyBody,
  Time: ReplyTime,
  Reactions: ReplyReactions,
};

// Reaction Context
interface ReactionGroupContextValue {
  reactionGroups: ReactionGroup[];
  subjectId: string;
}

const ReactionGroupContext = createContext<ReactionGroupContextValue | null>(null);

function useReactionGroupContext() {
  const ctx = useContext(ReactionGroupContext);
  if (!ctx) throw new Error("Must be used within a Reactions component");
  return ctx;
}

// Reaction Components
const REACTION_EMOJI: Record<ReactionContent, string> = {
  THUMBS_UP: "👍",
  THUMBS_DOWN: "👎",
  LAUGH: "😄",
  HOORAY: "🎉",
  CONFUSED: "😕",
  HEART: "❤️",
  ROCKET: "🚀",
  EYES: "👀",
};

interface ReactionListProps {
  children: (
    reaction: ReactionGroup & { emoji: string },
    index: number
  ) => ReactNode;
}

function ReactionList({ children }: ReactionListProps) {
  const { reactionGroups } = useReactionGroupContext();
  return (
    <>
      {reactionGroups
        .filter((r) => r.users.totalCount > 0)
        .map((r, i) =>
          children({ ...r, emoji: REACTION_EMOJI[r.content] }, i)
        )}
    </>
  );
}

interface ReactionButtonProps {
  content: ReactionContent;
  children: (props: {
    emoji: string;
    count: number;
    hasReacted: boolean;
    content: ReactionContent;
  }) => ReactNode;
}

function ReactionButton({ content, children }: ReactionButtonProps) {
  const { reactionGroups } = useReactionGroupContext();
  const group = reactionGroups.find((r) => r.content === content);

  return (
    <>
      {children({
        emoji: REACTION_EMOJI[content],
        count: group?.users.totalCount ?? 0,
        hasReacted: group?.viewerHasReacted ?? false,
        content,
      })}
    </>
  );
}

interface ReactionPickerProps {
  children: (
    reactions: Array<{ content: ReactionContent; emoji: string }>
  ) => ReactNode;
}

function ReactionPicker({ children }: ReactionPickerProps) {
  const reactions = (Object.keys(REACTION_EMOJI) as ReactionContent[]).map(
    (content) => ({
      content,
      emoji: REACTION_EMOJI[content],
    })
  );
  return <>{children(reactions)}</>;
}

export const Reactions = {
  List: ReactionList,
  Button: ReactionButton,
  Picker: ReactionPicker,
  EMOJI: REACTION_EMOJI,
};

// Re-export context hooks for advanced usage
export {
  useDiscussionContext,
  useCommentContext,
  useReplyContext,
  useReactionGroupContext,
};
