import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IGroup {
  _id: string;
  name: string;
  adminId: Types.ObjectId;
  telegramBotToken: string;
  telegramChatId: string;
  createdAt: Date;
  save(): Promise<this>;
}

const groupSchema = new Schema<IGroup>({
  _id: { type: String, required: true },
  name: { type: String, required: true, trim: true },
  adminId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  telegramBotToken: { type: String, default: '' },
  telegramChatId: { type: String, default: '' },
}, { timestamps: true });

export const Group = mongoose.model<IGroup>('Group', groupSchema);
