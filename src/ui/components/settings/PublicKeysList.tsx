import React, { RefObject } from 'react';
import host from '@plugin-host';
import { PublicCert } from '../../../storage.ts';
import { btn, fmtDate, isExpired, card } from '../../shared.ts';
import { AccountEntry } from '../../../util.ts';

interface PublicKeysSectionProps {
  certs: PublicCert[];
  busy: boolean;
  certFileRef: RefObject<HTMLInputElement | null>;
  searchEmail: string;
  setSearchEmail: (email: string) => void;
  onRemoveCert: (c: PublicCert) => void;
  onUploadKey: (c: PublicCert) => void;
  onImportCertFile: () => void;
  onSearchAndImportKey: (e?: React.FormEvent) => void;
  selectedAccountId: string | undefined;
  accounts: AccountEntry[]; // Replace 'any[]' with the actual type for accounts
  onDownloadKey: (c: PublicCert) => void;
}

export function PublicKeysSection({
  certs,
  busy,
  certFileRef,
  searchEmail,
  setSearchEmail,
  onRemoveCert,
  onUploadKey,
  onImportCertFile,
  onSearchAndImportKey,
  selectedAccountId,
  accounts,
  onDownloadKey,
}: PublicKeysSectionProps) {
  return (
    <div>
      <h3 style={{ margin: '0 0 4px', fontSize: '15px', fontWeight: 600 }}>
        {host.i18n.t('settings.public_keys_title')}
      </h3>
      <p style={{ margin: '0 0 8px', fontSize: '13px', color: 'var(--color-muted-foreground, #64748b)' }}>
        {host.i18n.t('settings.public_keys_desc')}
      </p>

      {/* Liste des clés publiques ou état vide */}
      {certs.length === 0 ? (
        <div style={{ ...card, fontSize: '13px', color: 'var(--color-muted-foreground, #64748b)', marginBottom: '12px' }}>
          {host.i18n.t('settings.no_public_keys')}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '12px' }}>
          {certs.map((c) => { 
            const accentColor = selectedAccountId == undefined 
              ? accounts.find((a) => a.id === c.accountId)?.avatarColor
              : undefined;

              const borderColor = accentColor || 'var(--color-border, #e2e8f0)';
            
            return(
            <div
              key={c.id}
              style={{ ...card, display: 'flex', justifyContent: 'space-between', gap: '8px', alignItems: 'center', borderColor: borderColor }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '13px' }}>
                    {c.email || c.subject}
                    {c.source === 'private-key' && (
                      <span style={{ marginLeft: '8px', fontSize: '11px', padding: '2px 6px', borderRadius: '4px', background: '#f1f5f9', color: '#475569', fontWeight: 'normal' }}>
                        {host.i18n.t('settings.own_key_badge')}
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--color-muted-foreground, #64748b)' }}>
                    {`${c.source === 'private-key' ? host.i18n.t('settings.linked_key') : c.source} · ${host.i18n.t('settings.key_expires')} ${fmtDate(c.notAfter)}${isExpired(c.notAfter) ? ` · ${host.i18n.t('settings.key_expired')}` : ''}`}
                  </div>
                </div>
              </div>

              {/* Action : Supprimer (si clé externe) ou Publier (si clé interne) */}
              <div style={{ display: 'flex', gap: '6px', alignItems: 'flex-start' }}>
              {c.source !== 'private-key' ? (
                <button
                  type="button"
                  style={{ ...btn, color: 'var(--color-destructive, #dc2626)', borderColor: 'var(--color-destructive, #dc2626)' }}
                  className="trash-btn"
                  title={host.i18n.t('settings.action.delete')}
                  disabled={busy}
                  onClick={() => onRemoveCert(c)}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="1rem"
                    height="1rem"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M10 11v6" />
                    <path d="M14 11v6" />
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
                    <path d="M3 6h18" />
                    <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                  </svg>
                </button>
              ) : (
                <button
                  type="button"
                  className="lock-btn"
                  style={{ ...btn, color: 'var(--color-foreground)' }}
                  title={host.i18n.t('settings.action.upload')}
                  disabled={busy}
                  onClick={() => onUploadKey(c)}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="14px"
                    height="14px"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="17 8 12 3 7 8" />
                    <line x1="12" y1="3" x2="12" y2="15" />
                  </svg>
                </button>
              )}
              <button
                  type="button"
                  className="lock-btn"
                  style={{ ...btn, color: 'var(--color-foreground)' }}
                  title={host.i18n.t('settings.action.upload')}
                  disabled={busy}
                  onClick={() => onDownloadKey(c)}
                >
                 <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16px"
                  height="16px"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
              </button>
            </div>

            </div>
          )})}
        </div>
      )}

      {/* Bouton d'importation de clé publique depuis un fichier */}
      <div>
        <input
          ref={certFileRef}
          type="file"
          accept=".asc,.key,.pub"
          style={{ display: 'none' }}
          onChange={onImportCertFile}
        />
        <button
          type="button"
          className="composer-btn"
          style={{ width: '100%' }}
          disabled={busy}
          onClick={() => certFileRef.current?.click()}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="1rem"
            height="1rem"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ marginRight: '0.5rem' }}
            aria-hidden="true"
          >
            <path d="M5 12h14" />
            <path d="M12 5v14" />
          </svg>
          {host.i18n.t('settings.add_public_key')}
        </button>
      </div>

      {/* Bloc de recherche sur annuaire distant */}
      <div style={{ ...card, marginTop: '16px', backgroundColor: 'var(--color-muted, #f8fafc)' }}>
        <h4 style={{ margin: '0 0 6px', fontSize: '14px', fontWeight: 600 }}>
          {host.i18n.t('settings.search_public_key_title')}
        </h4>
        <p style={{ margin: '0 0 10px', fontSize: '12px', color: 'var(--color-muted-foreground)' }}>
          {host.i18n.t('settings.search_public_key_desc')}
        </p>
        <form style={{ display: 'flex', gap: '8px' }}>
          <input
            type="email"
            style={{
              height: '2.25rem',
              padding: '0 0.75rem',
              borderRadius: '0.375rem',
              flex: 1,
              border: '1px solid var(--color-border, #e2e8f0)',
              backgroundColor: 'var(--color-background, #ffffff)',
              color: 'var(--color-foreground, #0f172a)',
              outline: 'none',
            }}
            placeholder="contact@example.com"
            value={searchEmail}
            onChange={(e) => setSearchEmail(e.target.value)}
            disabled={busy}
            required
          />
          <button
            type="button"
            onClick={onSearchAndImportKey}
            className="composer-btn"
            disabled={busy || !searchEmail}
            style={{ padding: '0 12px' }}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16px"
              height="16px"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ marginRight: '6px' }}
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            {host.i18n.t('settings.search_public_key')}
          </button>
        </form>
      </div>
    </div>
  );
}