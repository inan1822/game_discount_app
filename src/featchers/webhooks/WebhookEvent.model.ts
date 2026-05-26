import mongoose, { Schema, Document } from "mongoose"

// Records every Stripe event we've processed so a duplicate webhook delivery
// (Stripe retries on 5xx, also possible on network blips) does not re-fulfill
// the same order or re-send the delivery email.
export interface IWebhookEvent extends Document {
  stripeEventId: string
  processedAt: Date
}

const WebhookEventSchema = new Schema<IWebhookEvent>({
  stripeEventId: { type: String, required: true, unique: true },
  processedAt:   { type: Date, default: () => new Date() },
})

// Auto-expire after 30 days — Stripe never retries this far out, so keeping
// older rows wastes space.
WebhookEventSchema.index({ processedAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 30 })

export const WebhookEvent = mongoose.model<IWebhookEvent>("WebhookEvent", WebhookEventSchema)
