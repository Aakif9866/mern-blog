import { Schema, model, type Types } from "mongoose";

export interface IComment {
  _id: Types.ObjectId;
  post: Types.ObjectId;
  author: Types.ObjectId;
  /** Direct parent for replies, null for top-level comments. */
  parent?: Types.ObjectId | null;
  /** Top-level ancestor, so a whole thread loads with one query. */
  root?: Types.ObjectId | null;
  depth: number;
  content: string;
  mentions: Types.ObjectId[];
  likesCount: number;
  editedAt?: Date | null;
  deletedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const commentSchema = new Schema<IComment>(
  {
    post: { type: Schema.Types.ObjectId, ref: "Post", required: true },
    author: { type: Schema.Types.ObjectId, ref: "User", required: true },
    parent: { type: Schema.Types.ObjectId, ref: "Comment", default: null },
    root: { type: Schema.Types.ObjectId, ref: "Comment", default: null },
    depth: { type: Number, default: 0 },
    content: { type: String, required: true, maxlength: 2000 },
    mentions: [{ type: Schema.Types.ObjectId, ref: "User" }],
    likesCount: { type: Number, default: 0 },
    editedAt: { type: Date, default: null },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

commentSchema.index({ post: 1, parent: 1, createdAt: -1, _id: -1 });
commentSchema.index({ root: 1, createdAt: 1 });
commentSchema.index({ author: 1, createdAt: -1 });
commentSchema.index({ createdAt: -1 });

export const Comment = model<IComment>("Comment", commentSchema);
