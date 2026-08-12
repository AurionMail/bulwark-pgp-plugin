import { EncryptedMessageCache, getKeyRecord, saveKeyRecord, saveMessageCache, clearAllMessageCache } from "../storage.ts";
import { importOpenPgpPrivateKey, unlockPrivateKey } from "./import.ts";
import { broadcastUnlockKey, fetchRamIndexFromBackground } from "./session-broadcast.ts";
import * as openpgp from 'openpgp';
import host from '@plugin-host';

export async function changePassword(keyID: string, oldPassphrase: string, newPassphrase: string) {
  const originalRec = await getKeyRecord(keyID);

  if (!originalRec) {
    host.toast.error(host.i18n.t('settings.error.key_not_found'));
    return;
  }

  try {
    const { unlockedPrivateKey } = await unlockPrivateKey(originalRec, oldPassphrase);
    const parsedKey = await openpgp.readKey({ armoredKey: unlockedPrivateKey });
    const reencryptedPgpKey = await openpgp.encryptKey({
      privateKey: parsedKey as openpgp.PrivateKey,
      passphrase: newPassphrase
    });
    const newArmoredPgpKey = reencryptedPgpKey.armor();
    const { keyRecord: updatedRecord } = await importOpenPgpPrivateKey(
      newArmoredPgpKey, 
      newPassphrase, 
      newPassphrase
    );

    updatedRecord.id = originalRec.id;
    updatedRecord.recoverable = originalRec.recoverable;
    if (originalRec.default) {
      updatedRecord.default = true;
    }

    await saveKeyRecord(updatedRecord, false);
    const unlockedSession = await unlockPrivateKey(updatedRecord, newPassphrase);
    if (updatedRecord.default && unlockedSession.aesKey) {
      await changePassphraseForCache(unlockedSession.aesKey);
    }
    broadcastUnlockKey({ 
      id: updatedRecord.id, 
      unlockedPrivateKey: unlockedSession.unlockedPrivateKey, 
      signingKey: unlockedSession.signingKey, 
      decryptionKey: unlockedSession.decryptionKey,
      aesKey: unlockedSession.aesKey
    });

    host.toast.success("Your passphrase has been successfully changed!");

  } catch (err) {
    const error = err as Error;
    host.toast.error(host.i18n.t('settings.error.unlock_failed', { 
      message: error?.message ? error.message : "Invalid current passphrase." 
    }));
  }
}

async function changePassphraseForCache(newAesKey: CryptoKey) {
  const decryptedIndex = await fetchRamIndexFromBackground();

  if (!decryptedIndex || Object.keys(decryptedIndex).length === 0) {
    await clearAllMessageCache();
    return;
  }
  const encryptedCache: EncryptedMessageCache[] = await Promise.all(
    Object.entries(decryptedIndex).map(async ([mailId, decryptedPayload]) => {
      const textBytes = new TextEncoder().encode(JSON.stringify(decryptedPayload));
      const iv = crypto.getRandomValues(new Uint8Array(12));

      const encryptedPayload = await crypto.subtle.encrypt(
        { name: "AES-GCM", iv },
        newAesKey,
        textBytes
      );

      return {
        id: mailId,
        encryptedPayload: new Uint8Array(encryptedPayload),
        iv: iv
      };
    })
  );

  await clearAllMessageCache();
  await Promise.all(encryptedCache.map(record => saveMessageCache(record)));
}