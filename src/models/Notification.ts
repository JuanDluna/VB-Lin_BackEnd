import mongoose, { Schema, Document, Types } from 'mongoose';

/**
 * Interfaz TypeScript para el modelo Notification
 */
export interface INotification extends Document {
  _id: mongoose.Types.ObjectId;
  userId: Types.ObjectId;
  type: 'reserva' | 'recordatorio' | 'vencimiento';
  message: string;
  read: boolean;
  sentAt: Date;
}

/**
 * Esquema de Mongoose para Notification
 */
const NotificationSchema = new Schema<INotification>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    type: {
      type: String,
      enum: ['reserva', 'recordatorio', 'vencimiento'],
      required: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
    },
    read: {
      type: Boolean,
      default: false,
    },
    sentAt: {
      type: Date,
      default: Date.now,
      required: true,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (_doc, ret) => {
        ret.id = ret._id;
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Índices
NotificationSchema.index({ userId: 1 });
NotificationSchema.index({ read: 1 });
NotificationSchema.index({ sentAt: -1 });

export const Notification = mongoose.model<INotification>('Notification', NotificationSchema);

