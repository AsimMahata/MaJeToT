import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IProgress {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  groupId: string;
  sectionId: string;
  topicId: string | null;
  type: 'checkbox' | 'lecture';
  checked: boolean | null;
  lecturesDone: number | null;
  updatedAt: Date;
}

const progressSchema = new Schema<IProgress>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  groupId: { type: String, ref: 'Group', required: true },
  sectionId: { type: String, required: true },
  topicId: { type: String, default: null },
  type: { type: String, enum: ['checkbox', 'lecture'], required: true },
  checked: { type: Boolean, default: null },
  lecturesDone: { type: Number, default: null },
}, { timestamps: true });

// Compound unique index: one progress entry per user per section per topic
progressSchema.index({ userId: 1, sectionId: 1, topicId: 1 }, { unique: true });

export const Progress = mongoose.model<IProgress>('Progress', progressSchema);
