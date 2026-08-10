export interface Email {
  id: string;
  threadId: string;
  mailboxIds: Record<string, boolean>;
  keywords: Record<string, boolean>;
  size: number;
  receivedAt: string;
  from?: EmailAddress[];
  to?: EmailAddress[];
  cc?: EmailAddress[];
  bcc?: EmailAddress[];
  replyTo?: EmailAddress[];
  subject?: string;
  sentAt?: string;
  preview?: string;
  textBody?: EmailBodyPart[];
  htmlBody?: EmailBodyPart[];
  bodyValues?: Record<string, EmailBodyValue>;
  attachments?: Attachment[];
  hasAttachment: boolean;
  // Extended header information
  messageId?: string;
  inReplyTo?: string[];
  references?: string[];
  headers?: Record<string, string | string[]>;
  // Security headers parsed
  
  // S/MIME support
  blobId?: string;
  bodyStructure?: EmailBodyPart;
 

}
interface EmailAddress {
  name?: string;
  email: string;
}

interface EmailBodyValue {
  value: string;
  isEncodingProblem?: boolean;
  isTruncated?: boolean;
}


interface EmailBodyPart {
  partId: string;
  blobId: string;
  size: number;
  name?: string;
  type: string;
  charset?: string;
  disposition?: string;
  cid?: string;
  language?: string[];
  location?: string;
  subParts?: EmailBodyPart[];
}

export interface Attachment {
  partId: string;
  blobId: string;
  size: number;
  name?: string;
  type: string;
  charset?: string;
  cid?: string;
  disposition?: string;
}

export interface MimeParsedAttachment {
  name: string;
  type: string;
  size: number;
  dataUrl: string;
}