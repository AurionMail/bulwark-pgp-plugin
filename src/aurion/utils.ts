import { AurionAPI } from './api.ts';
import { readSecret, getToken, setToken, removeSecret, clearDangerousStorage } from '../storage.ts';
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
  KeyRecord 
} from '../storage.ts';
import { generateUUID } from '../util.ts';

export async function initAurionAPI(baseUrl: string = 'http://localhost:8080'): Promise<any> {
  const api = new AurionAPI(baseUrl);

    // regarder si on a un trasnfert de secret local/server.
    const secret = await readSecret();
    if (secret) {
        //un secret est détecté, on va l'utiliser pour récupérer les inforrmations d'authentification.
        const bridgeSecret = await api.getBridgeSecret(secret.id);
        // on dechiffre pour trouver le mot de passe.
        const pass = bridgeSecret.encryptedData; // ici on devrait déchiffrer le mot de passe avec bridgeSecret.secret
        const mail = (await host.user.getAccounts()).filter(acc => acc.isConnected === true && acc.isDefault === true)[0]?.email;
        // on se connecte avec le mail et le mot de passe.
        const data = await api.login(mail, pass);
        await setToken(data.token);
        await removeSecret();
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
      await deleteKeyRecord(localKey.id);
    }
  }

  // B. Ajouter ou mettre à jour les clés distantes
  for (const remoteKey of remoteKeys) {
    // Si la clé n'existe pas localement ou a été modifiée, on l'enregistre
    if (!localKeyIds.has(remoteKey.id)) {
      await saveKeyRecord(remoteKey);
    }else  if(!localKeys.find(k => k.id === remoteKey.id && k.encryptedPrivateKey === remoteKey.encryptedPrivateKey)) {
        await deleteKeyRecord(remoteKey.id);
        await saveKeyRecord(remoteKey);
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