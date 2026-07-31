import { AurionAPI } from './api.ts';
import { readSecret, getToken, setToken, removeSecret, clearDangerousStorage, loadDangerousPassphrases, getKeyRecord } from '../storage.ts';
import  host  from '@plugin-host';
import { 
  listKeyRecords, 
  saveKeyRecord, 
  deleteKeyRecord, 
  clearAllMessageCache, 
  saveMessageCache, 
  listPublicCerts, 
  savePublicCert, 
  deletePublicCert, 
} from '../storage.ts';
import { generateUUID } from '../util.ts';
import { consumeSecret } from './secrets/client.ts';
import { config, settings } from '../shared.ts';
import { argon2id } from 'hash-wasm';
import { broadcastUnlockKey } from '../pgp/session-broadcast.ts';
import { unlockPrivateKey } from '../pgp/import.ts';
import {CHANNEL_NAME} from '../pgp/session-broadcast.ts';
import { broadcastInitializeMasterPass } from './session-broadcast.ts';

export async function initAurionAPI(): Promise<AurionAPI> {
  const baseUrl: string =  await config('AurionURL');
  host.log.info(`Initializing AurionAPI with base URL: ${baseUrl}`);
  const api = new AurionAPI(baseUrl);

    // regarder si on a un trasnfert de secret local/server.
    const secret = await readSecret();
    if (secret) {
        //un secret est détecté, on va l'utiliser pour récupérer les inforrmations d'authentification.
        const masterPass = await consumeSecret(secret.id);
        host.log.info(`Using secret: ${masterPass} to authenticate with AurionAPI.`);
        const mail = (await host.user.getAccounts()).filter(acc => acc.isConnected === true && acc.isDefault === true)[0]?.email;
        // get username from email (before @)
        const username = mail.split('@')[0];
        const salt = new TextEncoder().encode(`auth_salt_${username}`);
        const pass = await argon2id({
          password: masterPass,
          salt: salt,
          parallelism: 1,
          iterations: 3,
          memorySize: 65536,
          hashLength: 32,
          outputType: 'hex',
        });
        
        // on se connecte avec le mail et le mot de passe.
        const data = await api.login(username, pass);
        await setToken(data.token);
        await removeSecret();
        await restoreKeys(masterPass);
    }else{
        // si on a pas de secret, on cherche un token
        const token = await getToken();
        if(token){
            api.setToken(token);
        }else{
            console.log("Aucun secret ni token trouvé pour l'API Aurion.");
        }
    }
    return api;
}

async function restoreKeys(masterPass: string): Promise<void> {

  try {
    console.log("Restoring keys from dangerous storage with masterPass:", masterPass);
    broadcastInitializeMasterPass(masterPass);
    console.log("Broadcasted masterPass to background session listener.");
    const keys = await listKeyRecords()
    // we assume all keys have the same master password, so we use the provided masterPass to unlock them. 
    // Indeed, in Aurion context, the master password is used to generate keys.
    
    if (keys.length > 0) {
      for (const rec of keys) {
          // This naturally calls `getIndex` inside unlockPrivateKey and loads RAM
          const { unlockedPrivateKey, signingKey, decryptionKey, aesKey } = await unlockPrivateKey(rec, masterPass, true);

          broadcastUnlockKey({ 
        id: rec.id, 
        unlockedPrivateKey, 
        signingKey, 
        decryptionKey ,
        aesKey: aesKey,
      });
      }
      // Broadcast unlock status to other listeners
      const channel = new BroadcastChannel(CHANNEL_NAME);
      channel.postMessage({ type: 'KEY_UPDATED', isUnlocked: true });
      channel.close();
    }
  } catch (err) {
    host.log.error('Failed to auto-unlock keys from dangerous storage:', err);
  }
}


export async function syncfromAurion(api: AurionAPI): Promise<void> {
  // 1. Récupération des données du coffre-fort distant
  const vaultData = await api.getVault();
  console.log("Données du coffre-fort récupérées depuis Aurion:", vaultData);

  const remoteKeys = vaultData.keys || [];
  const remoteMessageCache = vaultData.messageCache || [];

  // ==========================================
  // 2. SYNCHRONISATION DU CACHE (Écrasement complet)
  // ==========================================
  await clearAllMessageCache();
  for (const item of remoteMessageCache) {
    await saveMessageCache(item);
  }

  // ==========================================
  // 3. SYNCHRONISATION DES CLÉS PRIVÉES
  // ==========================================
  const localKeys = await listKeyRecords();

  const remoteKeyIds = new Set(remoteKeys.map((k) => k.id));
  const localKeyIds = new Set(localKeys.map((k) => k.id));

  // A. Supprimer les clés locales qui n'existent plus sur Aurion
  for (const localKey of localKeys) {
    if (!remoteKeyIds.has(localKey.id)) {
      await deleteKeyRecord(localKey.id, false);
    }
  }

  // B. Ajouter ou mettre à jour les clés distantes
  for (const remoteKey of remoteKeys) {
    // Si la clé n'existe pas localement ou a été modifiée, on l'enregistre
    if (!localKeyIds.has(remoteKey.id)) {
      await saveKeyRecord(remoteKey, false);
    }else  if(!localKeys.find(k => k.id === remoteKey.id && k.encryptedPrivateKey === remoteKey.encryptedPrivateKey)) {
        await deleteKeyRecord(remoteKey.id, false);
        await saveKeyRecord(remoteKey, false);
        await clearDangerousStorage();
    }
  }

  // ==========================================
  // 4. GÉNÉRATION ET SYNCHRONISATION DES CLÉS PUBLIQUES (PublicCert)
  // ==========================================
  const currentPublicCerts = await listPublicCerts();
  const certFingerprints = new Set(currentPublicCerts.map((c) => c.fingerprint));

  for (const keyRecord of remoteKeys) {
    // On génère la cert publique si la clé possède un bloc public et n'est pas déjà présente
    if (keyRecord.publicKey && !certFingerprints.has(keyRecord.fingerprint)) {
      await savePublicCert({
        id: generateUUID(),
        email: keyRecord.email,
        publicKey: keyRecord.publicKey,
        issuer: keyRecord.issuer,
        subject: keyRecord.subject,
        notBefore: keyRecord.notBefore,
        notAfter: keyRecord.notAfter,
        fingerprint: keyRecord.fingerprint,
        source: 'aurion-sync',
        default: keyRecord.default
      });
      // Ajouter au set local pour éviter d'éventuels doublons lors de la même exécution
      certFingerprints.add(keyRecord.fingerprint);
    }
  }

  // Nettoyage optionnel : Supprimer les certs publiques provenant de clés privées supprimées
  const activeFingerprints = new Set(remoteKeys.map((k) => k.fingerprint));
  for (const cert of currentPublicCerts) {
    if (cert.source === 'aurion-sync' && !activeFingerprints.has(cert.fingerprint)) {
      await deletePublicCert(cert.id);
    }
  }
}

export async function syncKeysToAurion(api: AurionAPI): Promise<{status: string;}> {
  return await api.updateKeys(await listKeyRecords());
}