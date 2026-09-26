import { Schema, model, type Types } from "mongoose";

export const NOTIFICATION_TYPES = ["follow", "reaction", "comment", "reply", "mention", "moderation"] as const;
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export interface INotification {
  _id: Types.ObjectId;
  recipient: Types.ObjectId;
  actor?: Types.ObjectId | null;
  type: NotificationType;
  post?: Types.ObjectId | null;
  comment?: Types.ObjectId | null;
  reaction?: string;
  message?: string;
  read: boolean;
  createdAt: Date;
}

const notificationSchema = new Schema<INotification>(
  {
    recipient: { type: Schema.Types.ObjectId, ref: "User", required: true },
    actor: { type: Schema.Types.ObjectId, ref: "User", default: null },
    type: { type: String, enum: NOTIFICATION_TYPES, required: true },
    post: { type: Schema.Types.ObjectId, ref: "Post", default: null },
    comment: { type: Schema.Types.ObjectId, ref: "Comment", default: null },
    reaction: { type: String },
    message: { type: String },
    read: { type: Boolean, default: false },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

notificationSchema.index({ recipient: 1, createdAt: -1, _id: -1 });
notificationSchema.index({ recipient: 1, read: 1 });
// Old notifications are cleaned up automatically after 180 days.
notificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 180 });

export const Notification = model<INotification>("Notification", notificationSchema);
