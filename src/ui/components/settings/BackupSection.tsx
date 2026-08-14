// src/components/settings/BackupSection.tsx
import React, { RefObject } from 'react';
import host from '@plugin-host';

interface BackupSectionProps {
  busy: boolean;
  jsonFileRef: RefObject<HTMLInputElement | null>;
  onExportJSON: () => void;
  onImportJSON: () => void;
  accountId: string | undefined;
}

export function BackupSection({
  busy,
  jsonFileRef,
  onExportJSON,
  onImportJSON,
  accountId,
}: BackupSectionProps) {
  return (
    <div style={{ borderTop: '1px solid var(--color-border, #e2e8f0)', paddingTop: '16px', marginTop: '8px' }}>
      <h3 style={{ margin: '0 0 4px', fontSize: '15px', fontWeight: 600 }}>
        {host.i18n.t('settings.json_backup_title')}
      </h3>
      <p style={{ margin: '0 0 12px', fontSize: '13px', color: 'var(--color-muted-foreground, #64748b)' }}>
        {host.i18n.t('settings.json_backup_desc')}
      </p>

      <div style={{ display: 'flex', gap: '12px' }}>
        <button
          type="button"
          className="composer-btn"
          style={{ flex: 1 }}
          disabled={busy}
          onClick={onExportJSON}
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
          >
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          {accountId ? host.i18n.t('settings.export_json_account') : host.i18n.t('settings.export_json')}
        </button>

        <input
          ref={jsonFileRef}
          type="file"
          accept=".json"
          style={{ display: 'none' }}
          onChange={onImportJSON}
        />

        <button
          type="button"
          className="composer-btn"
          style={{ flex: 1 }}
          disabled={busy}
          onClick={() => jsonFileRef.current?.click()}
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
          >
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" y1="3" x2="12" y2="15" />
          </svg>
          {accountId ? host.i18n.t('settings.import_json_account') : host.i18n.t('settings.import_json')}
        </button>
      </div>
    </div>
  );
}