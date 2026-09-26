import { Schema, model, type Types } from "mongoose";

export interface ISeries {
  _id: Types.ObjectId;
  author: Types.ObjectId;
  title: string;
  slug: string;
  description: string;
  createdAt: Date;
}

const seriesSchema = new Schema<ISeries>(
  {
    author: { type: Schema.Types.ObjectId, ref: "User", required: true },
    title: { type: String, required: true, maxlength: 120 },
    slug: { type: String, required: true },
    description: { type: String, default: "", maxlength: 500 },
  },
  { timestamps: true }
);

seriesSchema.index({ author: 1, slug: 1 }, { unique: true });

export const Series = model<ISeries>("Series", seriesSchema);
