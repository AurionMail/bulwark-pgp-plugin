import React, { RefObject } from 'react';
import host from '@plugin-host';
import { PublicCert } from '../../../storage.ts';
import { btn, fmtDate, isExpired, card } from '../../shared.ts';
import { AccountEntry } from '../../../util.ts';

interface PublicKeysSectionProps {
  busy: boolean;
  certFileRef: RefObject<HTMLInputElement | null>;
  searchEmail: string;
  setSearchEmail: (email: string) => void;
  onImportCertFile: () => void;
  onSearchAndImportKey: (e?: React.FormEvent) => void;
}

export function PublicKeysSection({
  busy,
  certFileRef,
  searchEmail,
  setSearchEmail,
  onImportCertFile,
  onSearchAndImportKey,
}: PublicKeysSectionProps) {
  return (
    <div>
      <h3 style={{ margin: '0 0 4px', fontSize: '15px', fontWeight: 600 }}>
        {host.i18n.t('settings.public_keys_title')}
      </h3>
      <p style={{ margin: '0 0 8px', fontSize: '13px', color: 'var(--color-muted-foreground, #64748b)' }}>
        {host.i18n.t('settings.public_keys_desc')}
      </p>

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