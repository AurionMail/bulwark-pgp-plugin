import { unlockPrivateKey } from "../pgp/import.ts";
import { broadcastUnlockKey } from "../pgp/session-broadcast.ts";
import { getAllDefaultKeyRecords, getDefaultKeyRecord } from "../storage.ts";
import host from '@plugin-host';

export async function askForDefaultKeyPass(type: 'default' | 'all'): Promise<void> {
  let defaultKeys;
  if (type === 'default') {
    defaultKeys = [await getDefaultKeyRecord()];
  } else {
    defaultKeys = await getAllDefaultKeyRecords();
  }

  for (const defaultKey of defaultKeys) {
    if (!defaultKey) continue;

    const result = await host.ui.prompt({
      title: host.i18n.t('prompt.unlock_default_key.title'),
      message: host.i18n.t('prompt.unlock_default_key.message') + ' ' + defaultKey.email,
      fields: [{ 
        name: 'passphrase', 
        label: host.i18n.t('prompt.unlock_default_key.passphrase_label'), 
        type: 'password', 
        required: true 
      }]
    });
    if (!result || !result.passphrase) {
      return; 
    }

    const unlockPassphrase = result.passphrase;

    try {
      const { unlockedPrivateKey, signingKey, decryptionKey, aesKey, hmacKey } = await unlockPrivateKey(defaultKey, unlockPassphrase);     
      
      broadcastUnlockKey({ 
        id: defaultKey.id, 
        unlockedPrivateKey, 
        signingKey, 
        decryptionKey,
        aesKey: aesKey,
        hmacKey: hmacKey,
      });
      host.ui.rerenderFetchedEmails();
    } catch (error) {
      throw new Error('Failed to unlock the default key: ' + (error instanceof Error ? error.message : String(error)));
    }
  }
}