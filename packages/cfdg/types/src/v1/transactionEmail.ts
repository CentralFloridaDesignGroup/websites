/** V1 attachment interface representing a file attachment */
export type Attachment = {
  /** Name of the attachment file */
  filename: string;
  /** Base64 encoded data of the attachment */
  data: string;
  /** MIME type of the attachment */
  mimetype: string;
}

/** Package interface representing an email package for Brevo */
export type Package = {
  /** Array of emails to populate the 'to' email field */
  toEmail: string[];
  /** Array of emails to populate the 'cc' email field */
  ccEmail?: string[];
  /** Reply to email address if different from sending email */
  replyToEmail: string;
  /** Subject of the email */
  subject: string;
  /** ID of the Brevo email template to use */
  templateId: number;
  /** Array of file attachments to include in the email */
  attachments?: Attachment[];
}

/** Form submission interface representing a submission containing email packages */
export type FormSubmission = {
  /** Key-value pairs of form submission parameters. See Brevo documentation for further information. */
  params: Record<string, string>;
  /** Array of email packages to send. Each package gets a param package attached. */
  packages: Package[];
}
