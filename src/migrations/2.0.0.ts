import host from '@plugin-host';
import { listKeyRecords, saveKeyRecord } from '../storage.ts';

const DB_NAME = 'pgp-plugin-store';
const MESSAGE_CACHE_STORE = 'message-cache';

// ── Interfaces ──────────────────────────────────────

interface LegacyEncryptedMessageCache {
  id: string;
  keyRecordId?: string;
  encryptedPayload: Uint8Array;
  iv: Uint8Array;
}

// ── IndexedDB Helpers ───────────────────────────────

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Runs an operation on the object store and reliably closes the DB connection.
 */
async function withStore<T>(
  mode: IDBTransactionMode,
  callback: (store: IDBObjectStore, tx: IDBTransaction) => Promise<T> | T
): Promise<T> {
  const db = await openDB();
  try {
    return await new Promise<T>((resolve, reject) => {
      const tx = db.transaction(MESSAGE_CACHE_STORE, mode);
      const store = tx.objectStore(MESSAGE_CACHE_STORE);

      let result: T;

      Promise.resolve(callback(store, tx))
        .then((res) => {
          result = res;
        })
        .catch(reject);

      tx.oncomplete = () => resolve(result);
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error || new Error('Transaction aborted'));
    });
  } finally {
    db.close();
  }
}

export async function saveMessageCacheBatch(caches: LegacyEncryptedMessageCache[]): Promise<void> {
  if (caches.length === 0) return;
  await withStore('readwrite', (store) => {
    for (const item of caches) {
      store.put(item);
    }
  });
}

export async function getAllMessageCache(): Promise<LegacyEncryptedMessageCache[]> {
  return withStore('readonly', (store) => {
    return new Promise((resolve, reject) => {
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result as LegacyEncryptedMessageCache[]);
      req.onerror = () => reject(req.error);
    });
  });
}

export async function clearAllMessageCache(): Promise<void> {
  await withStore('readwrite', (store) => store.clear());
}

// ── Migration Main ──────────────────────────────────

export async function main(): Promise<void> {
  const accounts = await host.user.getAccounts();
  const keys = await listKeyRecords();

  if (keys.length === 0) {
    host.log.warn(`Migration to 2.0.0: No keys found. Migration not needed.`);
    return;
  }

  if (accounts.length === 0) {
    host.log.warn(`Migration to 2.0.0: No user accounts found.`);
    return;
  }

  // Case A: Single Account (Automatically assign all keys)
  if (accounts.length === 1) {
    const singleAccount = accounts[0];
    host.log.warn(`Migration to 2.0.0: Single account found (${singleAccount.id}). Auto-assigning all keys.`);

    for (const key of keys) {
      if (!key.accountId) {
        key.accountId = singleAccount.id;
        await saveKeyRecord(key);
      }
    }

    const messageCaches = await getAllMessageCache();
    const defaultKey = keys.find((k) => k.default === true);

    if (defaultKey && messageCaches.length > 0) {
      for (const cache of messageCaches) {
        cache.keyRecordId = defaultKey.id;
      }
      // Batch write in a single transaction
      await saveMessageCacheBatch(messageCaches);
    }
    return;
  }

  // Case B: Multiple Accounts (Prompt user for account association)
  for (const key of keys) {
    // Skip recovery keys if applicable
    if (key.id?.endsWith('recovery')) {
      continue;
    }

    if (!key.accountId && key.id) {
      const matchingAccount = accounts.find((acc) => acc.email === key.email);

      if (matchingAccount) {
        key.accountId = matchingAccount.id;
        await saveKeyRecord(key);
      } else {
        host.log.warn(`No matching account found for email: ${key.email}`);

        let assignedAccountId: string | null = null;

        // Prompt retry loop until a valid accountId is provided or skipped
        while (!assignedAccountId) {
          const result = await host.ui.prompt({
            title: 'Account Association Needed',
            message: `The key with email ${key.email} has no associated account.\nAvailable accounts: ${accounts.map((acc) => acc.id).join(', ')}`,
            fields: [
              { name: 'accountId', label: 'Account ID', type: 'text', placeholder: 'Enter Account ID', required: true }
            ]
          });

          if (!result?.accountId) {
            host.log.warn(`No Account ID entered for key ${key.email}. Skipping key.`);
            break;
          }

          const accountExists = accounts.some((acc) => acc.id === result.accountId);
          if (accountExists) {
            assignedAccountId = result.accountId;
          } else {
            host.log.warn(`Account ID "${result.accountId}" does not exist. Please try again.`);
          }
        }

        if (assignedAccountId) {
          key.accountId = assignedAccountId;
          await saveKeyRecord(key);
        }
      }
    }
  }

  // Confirm before clearing cache
  await host.ui.confirm({
    title: 'Migration Notice',
    message: 'All message cache must be cleared due to account association changes.',
    danger: true,
    confirmLabel: 'Clear Cache'
  });

  await clearAllMessageCache();
  host.log.warn(`Migration to 2.0.0: Message cache cleared successfully.`);
}