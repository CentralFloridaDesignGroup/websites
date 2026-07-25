export interface Attachment {
  filename: string;
  data: string;
  mimetype: string;
}

export interface Package {
  toEmail: string[];
  ccEmail?: string[];
  replyToEmail: string;
  subject: string;
  templateId: number;
  attachments?: Attachment[];
}

export interface FormSubmission {
  params: Record<string, string>;
  packages: Package[];
}