// =============================================================================
// Shared types for the review-request pipeline.
// =============================================================================

/** Validated inbound webhook payload (all fields present + typed). */
export interface ReviewWebhookInput {
  contactId?: string;
  firstName: string;
  lastName?: string;
  phone: string;
  email?: string;
  businessName: string;
  businessOwner?: string;
  reviewLink: string;
  logo?: string;
  image?: string;
  messageType?: string;
}

/** Inputs to the message builder. */
export interface ReviewMessageParams {
  firstName: string;
  businessName: string;
  reviewLink: string;
}

/** Twilio API credentials + messaging service, loaded from the environment. */
export interface TwilioConfig {
  accountSid: string;
  apiKey: string;
  apiSecret: string;
  messagingServiceSid: string;
}

/** Result of a successful send. */
export interface SendResult {
  messageSid: string;
  status: string;
}

/** What the controller returns; the route maps it straight to a response. */
export interface ControllerResponse {
  status: number;
  body: unknown;
}
