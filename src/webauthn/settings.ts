import { KeyRecord } from "../storage.ts";
import { bufferToBytes, bytesToBuffer } from "../util.ts";
import { unlockPrivateKey } from "../pgp/import.ts";
import { broadcastUnlockKey } from "../pgp/session-broadcast.ts";
import host from '@plugin-host';

export async function encryptPassphraseWithWebAuthn(passphrase: string, prfSecret: ArrayBuffer): Promise<{ ciphertext: ArrayBuffer; iv: Uint8Array }> {
  const aesKey = await crypto.subtle.importKey("raw", prfSecret, "AES-GCM", false, ["encrypt"]);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    aesKey,
    new TextEncoder().encode(passphrase)
  );
  return { ciphertext, iv };
}

export async function decryptPassphraseWithWebAuthn(encryptedData: ArrayBuffer, prfSecret: ArrayBuffer, iv: ArrayBuffer): Promise<string> {
  try{
  const aesKey = await crypto.subtle.importKey("raw", prfSecret, "AES-GCM", false, ["decrypt"]);
  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    aesKey,
    encryptedData
  );
  return new TextDecoder().decode(decrypted);
  }catch(err){
    host.log.error("Failed to decrypt passphrase with WebAuthn", err);
    throw new Error("Failed to decrypt passphrase with WebAuthn");
  }
}

export async function unlockWithWebAuthnRegisteredKeys(keys : KeyRecord[], unlocked: Record<string, boolean>, setBusy?: (busy: boolean) => void, refresh?: () => Promise<void>) {
  const webauthnKeys = keys.filter(k => k.webauthn && !unlocked[k.id]);
      if (webauthnKeys.length === 0) return;
  
      setBusy?.(true);
      try {
        const firstWebAuthnKey = webauthnKeys[0].webauthn!;
        const masterCredIdBytes = bufferToBytes(firstWebAuthnKey.credentialId);
  
        const response = await host.crypto.getWebAuthn(masterCredIdBytes);
        const prfSecret = bytesToBuffer(response.prfSecret);
        
        for (const rec of webauthnKeys) {
          if (!rec.webauthn) continue;
          if(bufferToBytes(rec.webauthn.credentialId).join(',') !== masterCredIdBytes.join(',')) {
            host.log.warn(`Skipping key ${rec.id} (${rec.email}) because its WebAuthn credential ID does not match the first key's credential ID`);
            continue;
          }
          host.log.info(`Unlocking key ${rec.id} (${rec.email}) with WebAuthn`);
          const realPassphrase = await decryptPassphraseWithWebAuthn(
            rec.webauthn.encryptedPassphrase,
            prfSecret,
            rec.webauthn.iv
          );
  
          const { unlockedPrivateKey, signingKey, decryptionKey, aesKey, hmacKey } = await unlockPrivateKey(rec, realPassphrase);
          
          broadcastUnlockKey({ id: rec.id, unlockedPrivateKey, signingKey, decryptionKey, aesKey, hmacKey });
        }
  
        host.toast.success(host.i18n.t('settings.success.unlock_all_webauthn'));
        await refresh?.();
      } catch (err: any) {
        host.toast.error(host.i18n.t('settings.error.unlock_all_failed', { message: err?.message || String(err) }));
      } finally {
        setBusy?.(false);
      }
}