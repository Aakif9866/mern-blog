import { Schema, model, type Types } from "mongoose";

export const REPORT_REASONS = ["spam", "harassment", "hate", "misinformation", "nsfw", "plagiarism", "other"] as const;
export const REPORT_STATUSES = ["open", "resolved", "dismissed"] as const;
export type ReportTarget = "post" | "comment";

export interface IReport {
  _id: Types.ObjectId;
  reporter: Types.ObjectId;
  targetType: ReportTarget;
  target: Types.ObjectId;
  targetAuthor: Types.ObjectId;
  reason: (typeof REPORT_REASONS)[number];
  details: string;
  status: (typeof REPORT_STATUSES)[number];
  resolvedBy?: Types.ObjectId | null;
  resolvedAt?: Date | null;
  resolution?: string;
  createdAt: Date;
}

const reportSchema = new Schema<IReport>(
  {
    reporter: { type: Schema.Types.ObjectId, ref: "User", required: true },
    targetType: { type: String, enum: ["post", "comment"], required: true },
    target: { type: Schema.Types.ObjectId, required: true },
    targetAuthor: { type: Schema.Types.ObjectId, ref: "User", required: true },
    reason: { type: String, enum: REPORT_REASONS, required: true },
    details: { type: String, default: "", maxlength: 1000 },
    status: { type: String, enum: REPORT_STATUSES, default: "open" },
    resolvedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
    resolvedAt: { type: Date, default: null },
    resolution: { type: String, default: "" },
  },
  { timestamps: true }
);

reportSchema.index({ status: 1, createdAt: -1, _id: -1 });
reportSchema.index({ reporter: 1, target: 1 });

export const Report = model<IReport>("Report", reportSchema);
