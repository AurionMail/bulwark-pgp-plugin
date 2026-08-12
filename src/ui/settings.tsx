import React from 'react'
const h = React.createElement;
import { useSettingsLogic } from './components/settings/useSettingsLogic.ts';
import { BackupSection } from './components/settings/BackupSection.tsx';

import { OnboardingFlow } from './onboarding.tsx';
import { PrivateKeysSection } from './components/settings/PrivateKeysList.tsx';
import { PublicKeysSection } from './components/settings/PublicKeysList.tsx';

export function SettingsSection() {
const {
    keys, certs, unlocked, persisted, busy,
    fileRef, certFileRef, jsonFileRef,
    searchEmail, setSearchEmail, gen, setGen,
    refresh,
    handleFileChange,
    initiateUnlock,
    handleGenerateKey,
    handleLinkWebAuthn,
    handleUnlockAllWithWebAuthn,
    initiateRecoveryUnlock,
    handleUploadKey,
    handleSearchAndImportKey,
    importCertFile,
    removeCert,
    lock,
    removeKey,
    handleSetDefaultPrivateKey,
    handleSetServerSideEncryption,
    handleExportJSON,
    handleImportJSON
  } = useSettingsLogic();

  if (keys.length === 0) {
    return h('div', { style: { display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '720px' } },
      // We still need the styles loaded for the onboarding component buttons
      h('style', null, `
        .composer-btn {
          display: inline-flex; align-items: center; justify-content: center;
          border-radius: 0.375rem; font-weight: 500; height: 2.25rem; padding: 0 1rem;
          cursor: pointer; transition: all 150ms; border: 1px solid var(--color-border, #e2e8f0);
          background-color: var(--color-background, #ffffff); color: var(--color-foreground, #0f172a);
        }
        .composer-btn:hover { background-color: var(--color-accent, #2563eb) !important; color: var(--color-accent-foreground, #ffffff) !important; opacity: 1 !important; }
        .composer-btn:disabled { opacity: 0.5 !important; cursor: not-allowed; }
      `),
      h('input', { ref: fileRef, type: 'file', accept: '.asc,.key,.pgp', style: { display: 'none' }, onChange: handleFileChange }),
      h('input', { ref: jsonFileRef, type: 'file', accept: '.json', style: { display: 'none' }, onChange: handleImportJSON }),
      h(OnboardingFlow, {
        busy: busy,
        onImportClick: () => fileRef.current && fileRef.current.click(),
        onJsonImport: () => jsonFileRef.current && jsonFileRef.current.click(),
        onGenerate: (name, email, pass) => {
          // Fire the modified generation logic
          void handleGenerateKey({ name, email, pass });
        }
      })
    );
  }

  return h('div', { style: { display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '720px' } },
    h('style', null, `
      .composer-btn {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        border-radius: 0.375rem;
        font-weight: 500;
        height: 2.25rem;
        padding: 0 1rem;
        cursor: pointer;
        transition: all 150ms cubic-bezier(0.4, 0, 0.2, 1);
        border: 1px solid var(--color-border, #e2e8f0);
        background-color: var(--color-background, #ffffff);
        color: var(--color-foreground, #0f172a);
      }
      .composer-btn:hover {
        background-color: var(--color-accent, #2563eb) !important;
        color: var(--color-accent-foreground, #ffffff) !important;
        opacity: 1 !important;
      }
      .composer-btn:disabled {
        opacity: 0.5 !important;
        cursor: not-allowed;
      }
    `),

    h('style', null, `
      .trash-btn {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        border-radius: 0.375rem;
        font-weight: 500;
        height: 2.25rem;
        padding: 0 1rem;
        cursor: pointer;
        transition: all 150ms cubic-bezier(0.4, 0, 0.2, 1);
        background-color: #f000;
      }
      .trash-btn:hover {
        background-color: var(--color-accent, #2563eb) !important;
        opacity: 1 !important;
      }
      .trash-btn:disabled {
        opacity: 0.5 !important;
        cursor: not-allowed;
      }
    `),

    h('style', null, `
      .lock-btn {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        border-radius: 0.375rem;
        font-weight: 500;
        height: 2.25rem;
        padding: 0 1rem;
        cursor: pointer;
        transition: all 150ms cubic-bezier(0.4, 0, 0.2, 1);
        background-color: #f000;
        color: var(--color-foreground);
      }
      .lock-btn:hover {
        background-color: var(--color-accent, #2563eb) !important;
        color: var(--color-accent-foreground, #ffffff) !important;
        opacity: 1 !important;
      }
      .lock-btn:disabled {
        opacity: 0.5 !important;
        cursor: not-allowed;
      }
    `),

    <PrivateKeysSection
      keys={keys}
      unlocked={unlocked}
      persisted={persisted}
      busy={busy}
      fileRef={fileRef}
      gen={gen}
      setGen={setGen}
      onUnlockAllWebAuthn={handleUnlockAllWithWebAuthn}
      onSetDefaultKey={handleSetDefaultPrivateKey}
      onSetServerSideEncryption={handleSetServerSideEncryption}
      onLock={lock}
      onUnlock={initiateUnlock}
      onRecoveryUnlock={initiateRecoveryUnlock}
      onLinkWebAuthn={handleLinkWebAuthn}
      onRemoveKey={removeKey}
      onFileChange={handleFileChange}
      onGenerateKey={() => handleGenerateKey()}
    />,
    <PublicKeysSection
      certs={certs}
      busy={busy}
      certFileRef={certFileRef}
      searchEmail={searchEmail}
      setSearchEmail={setSearchEmail}
      onRemoveCert={removeCert}
      onUploadKey={handleUploadKey}
      onImportCertFile={importCertFile}
      onSearchAndImportKey={handleSearchAndImportKey}
    />,
    <BackupSection
        busy={busy}
        jsonFileRef={jsonFileRef}
        onExportJSON={handleExportJSON}
        onImportJSON={handleImportJSON}
      />,
  );
}