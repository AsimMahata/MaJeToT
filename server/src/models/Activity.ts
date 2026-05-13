import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IActivity extends Document {
  userId: Types.ObjectId;
  groupId: string;
  userName: string;
  avatarColor: string;
  aiMessage: string;
  delta: {
    topicsCompleted: string[];
    topicsUnchecked: string[];
    lectureDeltas: Array<{ section: string; from: number; to: number; total: number }>;
  };
  createdAt: Date;
}

const activitySchema = new Schema<IActivity>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  groupId: { type: String, ref: 'Group', required: true },
  userName: { type: String, required: true },
  avatarColor: { type: String, default: '#6366f1' },
  aiMessage: { type: String, required: true },
  delta: {
    topicsCompleted: [{ type: String }],
    topicsUnchecked: [{ type: String }],
    lectureDeltas: [{
      section: String,
      from: Number,
      to: Number,
      total: Number,
    }],
  },
}, { timestamps: true });

activitySchema.index({ groupId: 1, createdAt: -1 });

export const Activity = mongoose.model<IActivity>('Activity', activitySchema);
