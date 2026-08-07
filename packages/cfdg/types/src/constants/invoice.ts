/** Invoice status: 'draft', 'sent', 'paid', 'void' */
export const INVOICE_STATUSES = ['draft', 'sent', 'paid', 'void'] as const;

/** Invoice payment kinds: 'payment', 'deposit' */
export const INVOICE_PAYMENT_KINDS = ['payment', 'deposit'] as const;

/** Invoice payment statuses: 'pending', 'succeeded', 'failed', 'void' */
export const INVOICE_PAYMENT_STATUSES = ['pending', 'succeeded', 'failed', 'void'] as const;

/** Invoice email delivery statuses: 'accepted', 'warning', 'failed' */
export const INVOICE_EMAIL_DELIVERY_STATUSES = ['accepted', 'warning', 'failed'] as const;