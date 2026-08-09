import { onRenderEmailBody } from "./onRenderEmailBody.ts";
import { Email, MimeParsedAttachment } from "../types.ts";

async function common(email: Email, withAttachments: boolean): Promise<Email> {
    // we use the onRenderEmailBody function to get data
    const initialBody = { html: '', text: '', attachments: [] as unknown[] };
    const rawContentType = email.headers?.['content-type'] || email.headers?.['Content-Type'];
    const ctx = {
            id: email.id,
            contentType: Array.isArray(rawContentType) ? rawContentType[0] : rawContentType,
            bodyStructure: email.bodyStructure,
            bodyValues: email.bodyValues,
            attachments: email.attachments,
            blobId: email.blobId,
            from: email.from,
    };

    const result = await onRenderEmailBody(initialBody, ctx);
    if (result && typeof result === 'object') {
        const htmlBody = result.html || '';
        const textBody = result.text || '';
        const attachments = result.attachments as MimeParsedAttachment[] || [];
        if (htmlBody) {
            email.htmlBody = [{
                partId: 'pgp-rendered-html',
                blobId: '',
                size: htmlBody.length,
                type: 'text/html',
            }];
            email.bodyValues = email.bodyValues || {};
            email.bodyValues['pgp-rendered-html'] = { value: htmlBody };
        }
        if (textBody) {
            email.textBody = [{
                partId: 'pgp-rendered-text',
                blobId: '',
                size: textBody.length,
                type: 'text/plain',
            }];
            email.bodyValues = email.bodyValues || {};
            email.bodyValues['pgp-rendered-text'] = { value: textBody };
        }
        if (attachments.length > 0 && withAttachments) {
            // we must upload ouselves the attachments to the host and get blobIds for them.
        }
        return email;
    }else{
        return email;
    }
}

export async function onBeforeComposeOpenToReply(email:Email): Promise<Email> {
    return common(email, false);
}

export async function onBeforeComposeOpenToReplyAll(email:Email): Promise<Email> {
    return common(email, false);
}

/* export function getQuoteBodies(
  email: Pick<Email, "textBody" | "htmlBody" | "bodyValues" | "preview">
): { body: string; htmlBody?: string } {
  const textPart = email.textBody?.[0];
  const htmlPart = email.htmlBody?.[0];
  const textValue = textPart ? email.bodyValues?.[textPart.partId]?.value : undefined;
  const htmlValue = htmlPart ? email.bodyValues?.[htmlPart.partId]?.value : undefined;

  const textPartIsHtml = textPart?.type?.toLowerCase() === "text/html";
  // A missing type is treated as HTML, matching the viewer's rendering path.
  const htmlPartIsHtml = !htmlPart?.type || htmlPart.type.toLowerCase() === "text/html";

  const body = textValue
    ? (textPartIsHtml ? htmlToPlainText(textValue, { paragraphSpacing: true }) : textValue)
    : (email.preview || "");
  return {
    body,
    htmlBody: htmlPartIsHtml ? htmlValue || undefined : undefined,
  };
} */