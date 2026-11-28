import { VaultTree } from '../../api.ts'; 
import { initAurionAPI } from '../../utils.ts';
import { fetchCryptDriveTreeSecret } from '../utils.ts';
import { CryptPadDrivePayload } from './types.ts';

const HKDF_INFO = 'AURION-0K-SECRET-V1';
const ENCRYPTION_ALGO = 'AES-GCM';

export interface EncryptedTreeEnvelope {
  encryptedTree: string;
  iv: string;
}

export interface DecryptedTreeResult {
  tree: CryptPadDrivePayload;
  meta: Omit<VaultTree, 'encryptedPayload'>;
}

function hexToBytes(hexString: string): Uint8Array {
  const normalized = hexString.trim();
  if (normalized.length === 0 || normalized.length % 2 !== 0 || !/^[0-9a-fA-F]+$/.test(normalized)) {
    throw new Error('Invalid hex string');
  }
  const bytes = new Uint8Array(normalized.length / 2);
  for (let i = 0; i < normalized.length; i += 2) {
    bytes[i / 2] = parseInt(normalized.slice(i, i + 2), 16);
  }
  return bytes;
}

export async function deriveTreeAesKey(
  seed: Uint8Array | string,
  salt: Uint8Array = new Uint8Array(16)
): Promise<CryptoKey> {
  const seedBytes = typeof seed === 'string' ? hexToBytes(seed) : seed;

  const hkdfMasterKey = await crypto.subtle.importKey(
    'raw',
    seedBytes as BufferSource,
    'HKDF',
    false,
    ['deriveKey']
  );

  return crypto.subtle.deriveKey(
    {
      name: 'HKDF',
      hash: 'SHA-256',
      salt: salt  as BufferSource,
      info: new TextEncoder().encode(HKDF_INFO),
    },
    hkdfMasterKey,
    { name: ENCRYPTION_ALGO, length: 256 },
    false,
    ['decrypt']
  );
}

function parseEncryptedEnvelope(rawPayload: string | EncryptedTreeEnvelope): EncryptedTreeEnvelope {
  const parsed: unknown = typeof rawPayload === 'string' ? JSON.parse(rawPayload) : rawPayload;

  if (
    !parsed ||
    typeof parsed !== 'object' ||
    typeof (parsed as EncryptedTreeEnvelope).encryptedTree !== 'string' ||
    typeof (parsed as EncryptedTreeEnvelope).iv !== 'string'
  ) {
    throw new Error('Invalid encrypted tree payload format');
  }

  return parsed as EncryptedTreeEnvelope;
}


export async function decryptTreePayload(
  rawPayload: string | EncryptedTreeEnvelope,
  keyOrSeed: CryptoKey | Uint8Array | string,
  salt?: Uint8Array
): Promise<CryptPadDrivePayload> {
  const key =
    keyOrSeed instanceof CryptoKey
      ? keyOrSeed
      : await deriveTreeAesKey(keyOrSeed, salt);

  const { encryptedTree, iv } = parseEncryptedEnvelope(rawPayload);
  const ivBytes = hexToBytes(iv);
  const cipherBytes = hexToBytes(encryptedTree);

  const decryptedBuffer = await crypto.subtle.decrypt(
    { name: ENCRYPTION_ALGO, iv: ivBytes as BufferSource },
    key,
    cipherBytes as BufferSource
  );

  const jsonText = new TextDecoder().decode(decryptedBuffer);
  return JSON.parse(jsonText) as CryptPadDrivePayload;
}


export async function fetchAndDecryptTree(
  salt?: Uint8Array
): Promise<DecryptedTreeResult> {
  const seed = await fetchCryptDriveTreeSecret();
  if (!seed) {
    throw new Error('No seed found for decrypting the CryptPad tree.');
  }
  try {
    const response = await (await initAurionAPI()).getTree();
    const tree = await decryptTreePayload(response.encryptedPayload, seed, salt);

    const { encryptedPayload: _ignored, ...meta } = response;
    return { tree, meta };
  } catch (error) {
    console.error(`Failed to fetch and decrypt the CryptPad tree: ${error instanceof Error ? error.message : String(error)}`);
    return { tree: { drive: undefined }, meta: { userId: '', createdAt: '', updatedAt: '' } };
  }
}