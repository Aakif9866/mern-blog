export type Role = "user" | "moderator" | "admin";

export interface PublicUser {
  _id: string;
  username: string;
  name: string;
  avatar: string;
  bio?: string;
  role?: Role;
  followersCount?: number;
  isFollowing?: boolean;
}

export interface EmailPrefs {
  comments: boolean;
  mentions: boolean;
  follows: boolean;
  reactions: boolean;
  digest: boolean;
}

export interface Me extends PublicUser {
  email: string;
  website: string;
  location: string;
  role: Role;
  status: "active" | "suspended" | "banned";
  suspendedUntil: string | null;
  emailVerified: boolean;
  onboarded: boolean;
  followedTags: string[];
  followersCount: number;
  followingCount: number;
  postsCount: number;
  emailPrefs: EmailPrefs;
  googleLinked: boolean;
  isGuest: boolean;
  guestExpiresAt: string | null;
  createdAt: string;
}

export interface Profile extends PublicUser {
  website: string;
  location: string;
  followersCount: number;
  followingCount: number;
  postsCount: number;
  createdAt: string;
  isFollowing: boolean;
  isMe: boolean;
}

export type PostStatus = "draft" | "scheduled" | "published";

export interface SeriesRef {
  _id: string;
  title: string;
  slug: string;
}

export interface PostCard {
  _id: string;
  author: PublicUser;
  title: string;
  slug: string;
  excerpt: string;
  coverImage: string;
  tags: string[];
  readTime: number;
  views: number;
  likesCount: number;
  helpfulCount: number;
  commentsCount: number;
  bookmarksCount: number;
  status: PostStatus;
  publishedAt: string | null;
  scheduledFor: string | null;
  createdAt: string;
  updatedAt: string;
  editedAt: string | null;
  series: SeriesRef | string | null;
}

export interface Post extends PostCard {
  content: string;
  tldr: string;
  seriesOrder: number;
}

export interface ViewerState {
  liked: boolean;
  helpful: boolean;
  bookmarked: boolean;
  bookmarkList?: string | null;
  followingAuthor: boolean;
}

export interface Page<T> {
  items: T[];
  nextCursor: string | null;
}

export interface CommentItem {
  _id: string;
  post: string;
  author: PublicUser | null;
  parent: string | null;
  root: string | null;
  depth: number;
  content: string;
  likesCount: number;
  liked: boolean;
  deleted: boolean;
  editedAt: string | null;
  createdAt: string;
}

export interface CommentPage {
  items: CommentItem[];
  replies: CommentItem[];
  nextCursor: string | null;
}

export interface Tag {
  _id: string;
  slug: string;
  name: string;
  description: string;
  postsCount: number;
  followersCount: number;
  isFollowing?: boolean;
}

export interface Series {
  _id: string;
  title: string;
  slug: string;
  description: string;
  author: PublicUser | string;
  posts?: { _id: string; title: string; slug: string; status: PostStatus; readTime: number; publishedAt: string | null }[];
}

export type NotificationType = "follow" | "reaction" | "comment" | "reply" | "mention" | "moderation";

export interface NotificationItem {
  _id: string;
  type: NotificationType;
  actor: PublicUser | null;
  post: { _id: string; title: string; slug: string } | null;
  comment: { _id: string; content: string } | null;
  reaction?: "like" | "helpful";
  message?: string;
  read: boolean;
  createdAt: string;
}

export interface Collection {
  _id: string;
  name: string;
  description: string;
  count: number;
}

export interface Revision {
  _id: string;
  title: string;
  content: string;
  tags: string[];
  editor: PublicUser;
  createdAt: string;
}

export interface SessionInfo {
  _id: string;
  userAgent: string;
  ip: string;
  createdAt: string;
  lastUsedAt: string;
  current: boolean;
}

export interface Report {
  _id: string;
  reporter: PublicUser;
  targetType: "post" | "comment";
  target: string;
  targetAuthor: PublicUser & { status: string; suspendedUntil: string | null };
  reason: string;
  details: string;
  status: "open" | "resolved" | "dismissed";
  resolution?: string;
  resolvedBy?: PublicUser | null;
  createdAt: string;
  content:
    | { _id: string; title: string; slug: string; excerpt: string; deletedAt: string | null }
    | { _id: string; content: string; post: { title: string; slug: string } | null; deletedAt: string | null }
    | null;
}

export interface AdminUser {
  _id: string;
  username: string;
  name: string;
  email: string;
  avatar: string;
  role: Role;
  status: "active" | "suspended" | "banned";
  suspendedUntil: string | null;
  emailVerified: boolean;
  postsCount: number;
  followersCount: number;
  createdAt: string;
}

export interface Analytics {
  totals: { users: number; posts: number; comments: number; reactions: number; views: number; openReports: number };
  last7Days: { users: number; posts: number; comments: number };
  topPosts: { _id: string; title: string; slug: string; views: number; likesCount: number; helpfulCount: number; commentsCount: number }[];
  topTags: { tag: string; posts: number; views: number }[];
  series: { date: string; users: number; posts: number; comments: number }[];
}
