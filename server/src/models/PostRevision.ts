import { Schema, model, type Types } from "mongoose";

export interface IPostRevision {
  _id: Types.ObjectId;
  post: Types.ObjectId;
  editor: Types.ObjectId;
  title: string;
  content: string;
  tags: string[];
  createdAt: Date;
}

const revisionSchema = new Schema<IPostRevision>(
  {
    post: { type: Schema.Types.ObjectId, ref: "Post", required: true },
    editor: { type: Schema.Types.ObjectId, ref: "User", required: true },
    title: { type: String, default: "" },
    content: { type: String, default: "" },
    tags: { type: [String], default: [] },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

revisionSchema.index({ post: 1, createdAt: -1 });

export const PostRevision = model<IPostRevision>("PostRevision", revisionSchema);
