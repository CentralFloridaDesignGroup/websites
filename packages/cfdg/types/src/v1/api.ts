import type { AuthEnv } from "./auth";

/** 
 * Base API environment variables. Does not include database or storage bindings, which should be defined in the specific API environment type.
 * @extends AuthEnv - Includes authentication-related environment variables.
 */
export type BaseApiEnv = AuthEnv & {

  BREVO_API_KEY: string;
  SENDER_EMAIL: string;
  BREVO_SANDBOX?: string;
  BREVO_WEBHOOK_SECRET?: string;
  STRIPE_SECRET_KEY?: string;
  STRIPE_PUBLISHABLE_KEY?: string;
  STRIPE_WEBHOOK_SECRET?: string;
  INVOICE_PUBLIC_BASE_URL?: string;
  QBO_CLIENT_ID?: string;
  QBO_CLIENT_SECRET?: string;
  QBO_REDIRECT_URI?: string;
  QBO_ENVIRONMENT?: string;
  QBO_MINOR_VERSION?: string;
  NORTHSTAR_PUBLIC_BASE_URL?: string;
};
