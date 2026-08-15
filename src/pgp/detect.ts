export interface PgpDetectionResult {
  type: 'pgp-inline-encrypted' | 'pgp-inline-signed' | 'pgp-mime-encrypted' | 'pgp-mime-signed' | 'pgp-encrypted-file' | 'pgp-signature-file' | null;
  supported: boolean;
  blobId?: string | null;
  partId?: string | null;
  signedPartBlobId?: string | null;
  signatureBlobId?: string | null;
  htmlBody?: string | null;
  textBody?: string | null;
}

export function detectPgp(
  contentType: string, 
  bodyStructure: any, 
  bodyValues: any, 
  attachments: any[], 
  textBody: string
): PgpDetectionResult {
  const noResult: PgpDetectionResult = { type: null, supported: false };

  // 1. Detection of PGP INLINE mode (Plain text body)
  if (bodyValues || textBody) {
    const { plainText, htmlText } = extractEmailContent(bodyStructure, bodyValues);
    const contentToTest = plainText || textBody || '';

    if (contentToTest.includes('-----BEGIN PGP MESSAGE-----')) {
      return { type: 'pgp-inline-encrypted', supported: true, htmlBody: htmlText, textBody: contentToTest };
    }
    if (contentToTest.includes('-----BEGIN PGP SIGNED MESSAGE-----')) {
      return { type: 'pgp-inline-signed', supported: true, htmlBody: htmlText, textBody: contentToTest };
    }
  }

  // 2. Detection via main Content-Type (PGP/MIME - RFC 3156)
  if (contentType) {
    const ct = contentType.toLowerCase();

    if (ct.includes('multipart/encrypted') && ct.includes('protocol="application/pgp-encrypted"')) {
      const part = findPgpMimePart(bodyStructure, 'application/octet-stream');
      return { 
        type: 'pgp-mime-encrypted', 
        blobId: bodyStructure?.blobId || part?.blobId,
        partId: part?.partId, 
        supported: true 
      };
    }

    if (ct.includes('multipart/signed') && ct.includes('protocol="application/pgp-signature"')) {
      const sigPart = findPgpMimePart(bodyStructure, 'application/pgp-signature');
      return { 
        type: 'pgp-mime-signed', 
        // IMPORTANT : Pour PGP/MIME Signé, blobId doit cibler l'e-mail entier/le conteneur
        blobId: bodyStructure?.blobId, 
        partId: bodyStructure?.partId, 
        signatureBlobId: sigPart?.blobId, 
        supported: true 
      };
    }
  }

  // 3. Detection via attachments (.asc, .pgp, .sig files)
  if (attachments && attachments.length > 0) {
    for (const att of attachments) {
      const type = att.type?.toLowerCase() || '';
      const name = att.name?.toLowerCase() || '';

      if (type.includes('application/pgp-encrypted')) {
        return { type: 'pgp-mime-encrypted', blobId: att.blobId, partId: att.partId, supported: true };
      }
      
      if (type.includes('application/pgp-signature') || name === 'signature.asc' || name.endsWith('.sig')) {
        return { 
          type: 'pgp-mime-signed', 
          blobId: bodyStructure?.blobId, 
          partId: bodyStructure?.partId, 
          signatureBlobId: att.blobId, 
          supported: true 
        };
      }
      
      // Fallback chiffré seul
      if (name.endsWith('.pgp') || (name.endsWith('.asc') && name !== 'signature.asc')) {
        return { type: 'pgp-encrypted-file', blobId: att.blobId, partId: att.partId, supported: true };
      }
    }
  }

  // 4. Detection by traversing the JMAP / MIME structural tree
  if (bodyStructure) {
    const result = walkBodyStructure(bodyStructure);
    if (result) return result;
  }

  return noResult;
}

/**
 * Recursively traverses the tree of email parts
 */
function walkBodyStructure(part: any): PgpDetectionResult | null {
  if (!part) return null;
  const type = part.type?.toLowerCase() || '';

  if (type.includes('application/pgp-encrypted')) {
    return { type: 'pgp-mime-encrypted', blobId: part.blobId, partId: part.partId, supported: true };
  }

  if (type === 'multipart/encrypted' || type === 'multipart/signed') {
    const subParts = part.subParts || [];
    
    const hasPgp = subParts.some((sp: any) => {
      const sType = sp.type?.toLowerCase() || '';
      return sType.includes('application/pgp-encrypted') || sType.includes('application/pgp-signature');
    });

    if (hasPgp) {
      if (type === 'multipart/encrypted') {
        const encryptedControlPart = subParts.find((sp: any) => sp.type?.toLowerCase().includes('application/octet-stream'));
        return { 
          type: 'pgp-mime-encrypted', 
          blobId: part.blobId || encryptedControlPart?.blobId, 
          partId: encryptedControlPart?.partId, 
          supported: true 
        };
      } else {
        // multipart/signed: Le blob principal doit être le conteneur part.blobId
        const signaturePart = subParts.find((sp: any) => sp.type?.toLowerCase().includes('application/pgp-signature'));
        return {
          type: 'pgp-mime-signed',
          blobId: part.blobId,
          partId: part.partId,
          signatureBlobId: signaturePart?.blobId || null,
          supported: true
        };
      }
    }
  }

  // Recursive descent in the JMAP tree
  if (part.subParts) {
    for (const sub of part.subParts) {
      const result = walkBodyStructure(sub);
      if (result) return result;
    }
  }

  return null;
}

/**
 * Finds the specific sub-part corresponding to the requested PGP protocol
 */
function findPgpMimePart(bodyStructure: any, protocolType: string): any | null {
  if (!bodyStructure) return null;
  const type = bodyStructure.type?.toLowerCase() || '';
  if (type.includes(protocolType)) {
    return bodyStructure;
  }
  if (bodyStructure.subParts) {
    for (const sub of bodyStructure.subParts) {
      const found = findPgpMimePart(sub, protocolType);
      if (found) return found;
    }
  }
  return null;
}

function extractEmailContent(bodyStructure: any, bodyValues: any): { plainText: string | null, htmlText: string | null } {
  let plainText: string | null = null;
  let htmlText: string | null = null;

  if (!bodyStructure || !bodyValues) return { plainText, htmlText };

  const walk = (part: any) => {
    if (!part) return;
    if (part.type === 'text/plain' && bodyValues[part.partId]) {
      plainText = bodyValues[part.partId].value;
    } else if (part.type === 'text/html' && bodyValues[part.partId]) {
      htmlText = bodyValues[part.partId].value;
    }
    if (Array.isArray(part.subParts)) {
      part.subParts.forEach(walk);
    }
  };

  walk(bodyStructure);
  return { plainText, htmlText };
}