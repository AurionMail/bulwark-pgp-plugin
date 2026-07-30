// Inclus dans la page/iframe de l'App Fille
import { readSecret, removeSecret } from '../../storage.ts';
import { deriveKeyFromSeed, hexToBuffer } from './common.js';
import{ AurionAPI } from '../api.ts';

// 2. RÉCUPÉRATION DU SECRET (FETCH + DÉCHIFFREMENT + PURGE IMMÉDIATE)
export async function consumeSecret(secretId: string ) {

  // A. Récupération des données depuis IndexedDB
    const record = await readSecret();
    if(!record) {
        throw new Error("No IndexedDB secret.");
    }

  // B. Fetch du secret chiffré depuis le serveur (Burn-on-Read côté serveur)
  const  ciphertext  = (await new AurionAPI().getBridgeSecret(secretId)).encryptedData;

  // C. Reconstitution de la clé et déchiffrement en RAM
  const seedBytes = hexToBuffer(record.seed);
  const ivBytes = hexToBuffer(record.iv);
  const ciphertextBuffer = hexToBuffer(ciphertext);

  const key = await deriveKeyFromSeed(seedBytes as BufferSource); // Reconstruit la CryptoKey non-extractable

  const decryptedBuffer = await window.crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: ivBytes as BufferSource},
    key,
    ciphertextBuffer as BufferSource
  );

  const secretInRAM = new TextDecoder().decode(decryptedBuffer);

  // D. PURGE IMMÉDIATE de l'IndexedDB post-utilisation
  await removeSecret();

  return secretInRAM; // Disponible uniquement en RAM pour l'application
}