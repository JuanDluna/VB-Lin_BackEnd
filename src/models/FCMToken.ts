import mongoose, { Schema, Document, Types } from 'mongoose';

/**
 * Interfaz TypeScript para el modelo FCMToken
 * Almacena tokens de Firebase Cloud Messaging para push notifications
 */
export interface IFCMToken extends Document {
  _id: mongoose.Types.ObjectId;
  userId: Types.ObjectId;
  token: string;
  platform?: string; // 'android', 'ios', 'web'
  createdAt: Date;
}

/**
 * Esquema de Mongoose para FCMToken
 */
const FCMTokenSchema = new Schema<IFCMToken>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    token: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    platform: {
      type: String,
      enum: ['android', 'ios', 'web'],
      default: 'web',
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: false,
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

// Índices compuestos
FCMTokenSchema.index({ userId: 1, token: 1 });
FCMTokenSchema.index({ createdAt: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 }); // Expirar tokens después de 90 días

export const FCMToken = mongoose.model<IFCMToken>('FCMToken', FCMTokenSchema);

