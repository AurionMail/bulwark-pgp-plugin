import { deriveKeyFromSeed, bufferToHex } from './common.js';

export async function processSecret(secretValue: string) {
  // 1. Génération de l'entropie
  const seed = window.crypto.getRandomValues(new Uint8Array(32));
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  
  // 2. Dérivation de la clé
  const key = await deriveKeyFromSeed(seed);

  // 3. Chiffrement
  const encodedSecret = new TextEncoder().encode(secretValue);
  const ciphertextBuffer = await window.crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encodedSecret
  );

  const ciphertextHex = bufferToHex(ciphertextBuffer);
  const ivHex = bufferToHex(iv);
  const seedHex = bufferToHex(seed);

  return { ciphertextHex, ivHex, seedHex };
}