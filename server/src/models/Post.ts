import { Schema, model, type HydratedDocument, type Types } from "mongoose";

export const POST_STATUSES = ["draft", "scheduled", "published"] as const;
export type PostStatus = (typeof POST_STATUSES)[number];

export interface IPost {
  _id: Types.ObjectId;
  author: Types.ObjectId;
  title: string;
  slug: string;
  content: string;
  excerpt: string;
  coverImage: string;
  tags: string[];
  series?: Types.ObjectId | null;
  seriesOrder: number;
  status: PostStatus;
  publishedAt?: Date | null;
  scheduledFor?: Date | null;
  readTime: number;
  views: number;
  likesCount: number;
  helpfulCount: number;
  commentsCount: number;
  bookmarksCount: number;
  trendingScore: number;
  tldr: string;
  embedding?: number[];
  editedAt?: Date | null;
  deletedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const postSchema = new Schema<IPost>(
  {
    author: { type: Schema.Types.ObjectId, ref: "User", required: true },
    title: { type: String, default: "", maxlength: 200 },
    slug: { type: String, required: true, unique: true },
    content: { type: String, default: "" },
    excerpt: { type: String, default: "" },
    coverImage: { type: String, default: "" },
    tags: { type: [String], default: [] },
    series: { type: Schema.Types.ObjectId, ref: "Series", default: null },
    seriesOrder: { type: Number, default: 0 },
    status: { type: String, enum: POST_STATUSES, default: "draft" },
    publishedAt: { type: Date, default: null },
    scheduledFor: { type: Date, default: null },
    readTime: { type: Number, default: 1 },
    views: { type: Number, default: 0 },
    likesCount: { type: Number, default: 0 },
    helpfulCount: { type: Number, default: 0 },
    commentsCount: { type: Number, default: 0 },
    bookmarksCount: { type: Number, default: 0 },
    trendingScore: { type: Number, default: 0 },
    tldr: { type: String, default: "" },
    embedding: { type: [Number], select: false, default: undefined },
    editedAt: { type: Date, default: null },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

// Feeds: latest, per-tag, per-author and trending, always excluding deleted posts.
postSchema.index({ status: 1, deletedAt: 1, publishedAt: -1, _id: -1 });
postSchema.index({ tags: 1, status: 1, publishedAt: -1 });
postSchema.index({ author: 1, status: 1, publishedAt: -1 });
postSchema.index({ status: 1, trendingScore: -1, _id: -1 });
postSchema.index({ status: 1, scheduledFor: 1 });
postSchema.index({ series: 1, seriesOrder: 1 });
postSchema.index({ title: "text", tags: "text", excerpt: "text", content: "text" }, { weights: { title: 8, tags: 4, excerpt: 2, content: 1 }, name: "post_text" });

export type PostDoc = HydratedDocument<IPost>;
export const Post = model<IPost>("Post", postSchema);

/** Filter for posts anyone may read. */
export const PUBLISHED = { status: "published", deletedAt: null } as const;
