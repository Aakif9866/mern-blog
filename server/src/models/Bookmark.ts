import { Schema, model, type Types } from "mongoose";

export interface IBookmarkCollection {
  _id: Types.ObjectId;
  owner: Types.ObjectId;
  name: string;
  description: string;
  createdAt: Date;
}

const collectionSchema = new Schema<IBookmarkCollection>(
  {
    owner: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    name: { type: String, required: true, maxlength: 60 },
    description: { type: String, default: "", maxlength: 200 },
  },
  { timestamps: true }
);

export const BookmarkCollection = model<IBookmarkCollection>("BookmarkCollection", collectionSchema);

export interface IBookmark {
  _id: Types.ObjectId;
  user: Types.ObjectId;
  post: Types.ObjectId;
  /** Optional collection; null means the default "Saved" list. */
  list?: Types.ObjectId | null;
  createdAt: Date;
}

const bookmarkSchema = new Schema<IBookmark>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    post: { type: Schema.Types.ObjectId, ref: "Post", required: true },
    list: { type: Schema.Types.ObjectId, ref: "BookmarkCollection", default: null },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

bookmarkSchema.index({ user: 1, post: 1 }, { unique: true });
bookmarkSchema.index({ user: 1, list: 1, createdAt: -1, _id: -1 });

export const Bookmark = model<IBookmark>("Bookmark", bookmarkSchema);
