// Link-only picker for a CryptPad drive object: browse folders from
// drive.root, read file metadata from drive.filesData, choose read/write
// (href) or read-only (roHref) when available, and return share links.
import host from '@plugin-host';

import { createElement as h, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Button,
  DialogButtons,
  Row,
  Spinner,
  Stack,
  Text,
} from '@plugin-host/ui';
import {
  type CryptPadAccessMode,
  type CryptPadAccessModesMap,
  type CryptPadShareLink,
  buildCryptPadShareLinks,
  indexCryptPadDrive,
} from './reader.ts';
import { CryptPadDrive, CryptPadFileItem } from './types.ts';

const LAST_PATH_KEY = 'cryptpadPickerPath';

export type PickerResult =
  | null
  | { action: 'links'; links: CryptPadShareLink[] };

export interface PickerDialogProps {
  cryptpadData: CryptPadDrive | null | undefined;
  origin: string;
  onResult: (result: PickerResult) => void;
}

const pickerStyles = {
  toolbar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '8px',
    padding: '8px 10px',
    borderRadius: '8px',
    border: '1px solid var(--color-border, #e2e8f0)',
    background: 'color-mix(in srgb, var(--color-muted-foreground, #64748b) 6%, transparent)',
  },
  backBtn: (disabled: boolean) => ({
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '28px',
    height: '28px',
    borderRadius: '6px',
    border: '1px solid var(--color-border, #e2e8f0)',
    background: 'var(--color-background, #ffffff)',
    color: 'var(--color-foreground, #0f172a)',
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.45 : 1,
    flexShrink: 0,
  }),
  pathText: {
    flex: 1,
    minWidth: 0,
    fontSize: '12px',
    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
    color: 'var(--color-muted-foreground, #64748b)',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap' as const,
  },
  listContainer: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '6px',
    maxHeight: '280px',
    overflowY: 'auto' as const,
    padding: '2px',
  },
  folderRow: (disabled: boolean) => ({
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    width: '100%',
    padding: '9px 12px',
    borderRadius: '8px',
    border: '1px solid var(--color-border, #e2e8f0)',
    background: 'var(--color-background, #ffffff)',
    color: 'var(--color-foreground, #0f172a)',
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.55 : 1,
    textAlign: 'left' as const,
    boxSizing: 'border-box' as const,
    transition: 'border-color 0.15s ease, background 0.15s ease',
  }),
  folderIconBadge: {
    width: '28px',
    height: '28px',
    borderRadius: '6px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    background: 'color-mix(in srgb, var(--color-primary, #3b82f6) 14%, transparent)',
    color: 'var(--color-primary, #3b82f6)',
  },
  fileRow: (isSelected: boolean, disabled: boolean) => ({
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '10px',
    width: '100%',
    padding: '8px 12px',
    borderRadius: '8px',
    border: isSelected
      ? '1px solid color-mix(in srgb, var(--color-primary, #3b82f6) 55%, transparent)'
      : '1px solid var(--color-border, #e2e8f0)',
    background: isSelected
      ? 'color-mix(in srgb, var(--color-primary, #3b82f6) 9%, transparent)'
      : 'var(--color-background, #ffffff)',
    color: 'var(--color-foreground, #0f172a)',
    opacity: disabled ? 0.55 : 1,
    boxSizing: 'border-box' as const,
    transition: 'border-color 0.15s ease, background 0.15s ease',
  }),
  fileTrigger: (disabled: boolean) => ({
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    flex: 1,
    minWidth: 0,
    padding: 0,
    border: 'none',
    background: 'transparent',
    color: 'inherit',
    cursor: disabled ? 'not-allowed' : 'pointer',
    textAlign: 'left' as const,
  }),
  checkboxBox: (isSelected: boolean) => ({
    width: '18px',
    height: '18px',
    borderRadius: '5px',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    border: isSelected
      ? '1px solid var(--color-primary, #3b82f6)'
      : '1px solid var(--color-border, #cbd5e1)',
    background: isSelected
      ? 'var(--color-primary, #3b82f6)'
      : 'transparent',
    color: '#ffffff',
  }),
  fileTypePill: {
    fontSize: '11px',
    fontWeight: 600,
    padding: '2px 7px',
    borderRadius: '5px',
    border: '1px solid var(--color-border, #e2e8f0)',
    background: 'color-mix(in srgb, var(--color-muted-foreground, #64748b) 10%, transparent)',
    color: 'var(--color-muted-foreground, #64748b)',
    flexShrink: 0,
  },
  modeGroup: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    padding: '2px',
    borderRadius: '7px',
    border: '1px solid var(--color-border, #e2e8f0)',
    background: 'color-mix(in srgb, var(--color-muted-foreground, #64748b) 8%, transparent)',
    flexShrink: 0,
  },
  modeIconBtn: (active: boolean, kind: 'write' | 'readonly') => {
    const accent = kind === 'write'
      ? 'var(--color-primary, #3b82f6)'
      : 'var(--color-warning, #d97706)';
    return {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: '26px',
      height: '26px',
      borderRadius: '5px',
      border: active
        ? `1px solid color-mix(in srgb, ${accent} 45%, transparent)`
        : '1px solid transparent',
      background: active
        ? `color-mix(in srgb, ${accent} 16%, transparent)`
        : 'transparent',
      color: active ? accent : 'var(--color-muted-foreground, #64748b)',
      cursor: 'pointer',
      transition: 'all 0.15s ease',
    };
  },
  emptyState: {
    padding: '24px 12px',
    textAlign: 'center' as const,
    borderRadius: '8px',
    border: '1px dashed var(--color-border, #e2e8f0)',
    color: 'var(--color-muted-foreground, #64748b)',
    fontSize: '12px',
  },
};

function renderFolderIcon() {
  return h(
    'svg',
    {
      viewBox: '0 0 24 24',
      width: '16',
      height: '16',
      fill: 'none',
      stroke: 'currentColor',
      strokeWidth: '2',
      strokeLinecap: 'round',
      strokeLinejoin: 'round',
      'aria-hidden': 'true',
    },
    h('path', { d: 'M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z' }),
  );
}

function renderFileIcon() {
  return h(
    'svg',
    {
      viewBox: '0 0 24 24',
      width: '16',
      height: '16',
      fill: 'none',
      stroke: 'currentColor',
      strokeWidth: '2',
      strokeLinecap: 'round',
      strokeLinejoin: 'round',
      'aria-hidden': 'true',
    },
    h('path', { d: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z' }),
    h('polyline', { points: '14 2 14 8 20 8' }),
  );
}

function renderWriteIcon() {
  return h(
    'svg',
    {
      viewBox: '0 0 24 24',
      width: '14',
      height: '14',
      fill: 'none',
      stroke: 'currentColor',
      strokeWidth: '2',
      strokeLinecap: 'round',
      strokeLinejoin: 'round',
      'aria-hidden': 'true',
    },
    h('path', { d: 'M12 20h9' }),
    h('path', { d: 'M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z' }),
  );
}

function renderReadOnlyIcon() {
  return h(
    'svg',
    {
      viewBox: '0 0 24 24',
      width: '14',
      height: '14',
      fill: 'none',
      stroke: 'currentColor',
      strokeWidth: '2',
      strokeLinecap: 'round',
      strokeLinejoin: 'round',
      'aria-hidden': 'true',
    },
    h('rect', { x: '3', y: '11', width: '18', height: '11', rx: '2', ry: '2' }),
    h('path', { d: 'M7 11V7a5 5 0 0 1 10 0v4' }),
  );
}

function renderCheckIcon() {
  return h(
    'svg',
    {
      viewBox: '0 0 24 24',
      width: '12',
      height: '12',
      fill: 'none',
      stroke: 'currentColor',
      strokeWidth: '3',
      strokeLinecap: 'round',
      strokeLinejoin: 'round',
      'aria-hidden': 'true',
    },
    h('polyline', { points: '20 6 9 17 4 12' }),
  );
}

export function PickerDialog({
  cryptpadData,
  origin = '',
  onResult,
}: PickerDialogProps) {
  const t = host.i18n.t;
  const [path, setPath] = useState<string>('/');
  const [selected, setSelected] = useState(() => new Map());
  const [accessModes, setAccessModes] = useState<CryptPadAccessModesMap>(() => ({}));
  const [busy, setBusy] = useState<boolean>(false);
  const [error, setError] = useState<unknown>(null);

  const tree = useMemo(
    () => indexCryptPadDrive(cryptpadData, { origin }),
    [cryptpadData, origin],
  );

  useEffect(() => {
    host.storage?.get(LAST_PATH_KEY)
      .then((p) => {
        if (typeof p === 'string' && tree.has(p)) {
          setPath(p);
        }
      })
      .catch(() => {});
  }, [tree, host.storage]);

  const currentListing = tree.get(path) ?? { folders: [], files: [] };

  const navigate = (nextPath: string): void => {
    const target = tree.has(nextPath) ? nextPath : '/';
    setPath(target);
    //void host.storage?.set(LAST_PATH_KEY, target).catch(() => {}); Removed for security : it is written unecnrypted on disk
  };

  const goParent = (): void => {
    if (path === '/') return;
    const parts = path.split('/').filter(Boolean);
    parts.pop();
    navigate(parts.length ? `/${parts.join('/')}` : '/');
  };

  const toggleFile = (file: CryptPadFileItem): void => {
    setSelected((prev) => {
      const next = new Map(prev);
      if (next.has(file.path)) {
        next.delete(file.path);
      } else {
        next.set(file.path, file);
        setAccessModes((modes) => ({
          ...modes,
          [file.path]: modes[file.path] ?? 'write',
        }));
      }
      return next;
    });
  };

  const setFileAccessMode = (filePath: string, mode: CryptPadAccessMode): void => {
    setAccessModes((prev) => ({ ...prev, [filePath]: mode }));
  };

  const entries = useMemo(() => [...selected.values()], [selected]);

  const fail = (err: unknown): void => {
    setBusy(false);
    setError(err);
  };

  const shareLinks = async (): Promise<void> => {
    setError(null);
    setBusy(true);
    try {
      const links = buildCryptPadShareLinks(entries, accessModes);
      if (!links.length) {
        throw new Error('No link for current selection.');
      }
      onResult({ action: 'links', links });
      setBusy(false);
    } catch (err) {
      fail(err);
    }
  };

  const none = entries.length === 0;
  const buttons = [
    { id: 'cancel', label: t('tree.picker.cancel'), variant: 'secondary' as const, disabled: busy },
    {
      id: 'links',
      label: t('tree.picker.shareLinks'),
      variant: 'primary' as const,
      disabled: none || busy,
      busy,
    },
  ];

  const onButtonClick = (id: string): void => {
    if (id === 'cancel') onResult(null);
    else if (id === 'links') void shareLinks();
  };

  const isBackDisabled = path === '/' || busy;

  return h(
    Stack,
    { gap: 3 },
    h(
      'div',
      { style: pickerStyles.toolbar },
      h(
        'button',
        {
          type: 'button',
          style: pickerStyles.backBtn(isBackDisabled),
          disabled: isBackDisabled,
          onClick: goParent,
          'aria-label': t('tree.picker.parentFolder'),
          title: t('tree.picker.parentFolder'),
        },
        h(
          'svg',
          {
            viewBox: '0 0 24 24',
            width: '15',
            height: '15',
            fill: 'none',
            stroke: 'currentColor',
            strokeWidth: '2',
            strokeLinecap: 'round',
            strokeLinejoin: 'round',
          },
          h('polyline', { points: '15 18 9 12 15 6' }),
        ),
      ),
      h('span', { style: pickerStyles.pathText, title: path }, path),
    ),
    h(
      'div',
      { style: pickerStyles.listContainer },
      ...currentListing.folders.map((folder) =>
        h(
          'button',
          {
            key: folder.path,
            type: 'button',
            style: pickerStyles.folderRow(busy),
            disabled: busy,
            onClick: () => navigate(folder.path),
          },
          h('span', { style: pickerStyles.folderIconBadge }, renderFolderIcon()),
          h(
            'span',
            {
              style: {
                flex: 1,
                minWidth: 0,
                fontSize: '13px',
                fontWeight: 500,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              },
            },
            folder.name,
          ),
          h(
            'svg',
            {
              viewBox: '0 0 24 24',
              width: '15',
              height: '15',
              fill: 'none',
              stroke: 'var(--color-muted-foreground, #64748b)',
              strokeWidth: '2',
              strokeLinecap: 'round',
              strokeLinejoin: 'round',
              'aria-hidden': 'true',
            },
            h('polyline', { points: '9 18 15 12 9 6' }),
          ),
        ),
      ),
      ...currentListing.files.map((file) => {
        const isSelected = selected.has(file.path);
        const mode: CryptPadAccessMode = accessModes[file.path] ?? 'write';
        return h(
          'div',
          {
            key: file.path,
            style: pickerStyles.fileRow(isSelected, busy),
          },
          h(
            'button',
            {
              type: 'button',
              style: pickerStyles.fileTrigger(busy),
              disabled: busy,
              onClick: () => toggleFile(file),
            },
            h(
              'span',
              { style: pickerStyles.checkboxBox(isSelected) },
              isSelected ? renderCheckIcon() : null,
            ),
            h(
              'span',
              {
                style: {
                  color: isSelected
                    ? 'var(--color-primary, #3b82f6)'
                    : 'var(--color-muted-foreground, #64748b)',
                  display: 'inline-flex',
                  flexShrink: 0,
                },
              },
              renderFileIcon(),
            ),
            h(
              'span',
              {
                style: {
                  flex: 1,
                  minWidth: 0,
                  fontSize: '13px',
                  fontWeight: isSelected ? 600 : 400,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                },
              },
              file.name,
            ),
            file.fileType
              ? h('span', { style: pickerStyles.fileTypePill }, file.fileType)
              : null,
          ),
          isSelected && file.hasReadOnly
            ? h(
                'div',
                {
                  style: pickerStyles.modeGroup,
                  onClick: (e) => e.stopPropagation(),
                },
                h(
                  'button',
                  {
                    type: 'button',
                    style: pickerStyles.modeIconBtn(mode === 'write', 'write'),
                    disabled: busy,
                    onClick: () => setFileAccessMode(file.path, 'write'),
                    title: t('tree.links.readWrite'),
                    'aria-label': t('tree.links.readWrite'),
                    'aria-pressed': mode === 'write',
                  },
                  renderWriteIcon(),
                ),
                h(
                  'button',
                  {
                    type: 'button',
                    style: pickerStyles.modeIconBtn(mode === 'readonly', 'readonly'),
                    disabled: busy,
                    onClick: () => setFileAccessMode(file.path, 'readonly'),
                    title: t('tree.links.readOnly'),
                    'aria-label': t('tree.links.readOnly'),
                    'aria-pressed': mode === 'readonly',
                  },
                  renderReadOnlyIcon(),
                ),
              )
            : null,
        );
      }),
      !currentListing.folders.length && !currentListing.files.length
        ? h('div', { style: pickerStyles.emptyState }, 'Dossier vide.')
        : null,
    ),
    h(
      Text,
      { tone: 'muted', size: 'xs' },
      entries.length
        ? `${entries.length}` + t('tree.picker.selected')
        : t('tree.picker.selectFiles'),
    ),
    busy ? h(Spinner, { label: t('tree.picker.sharing') }) : null,
    h(DialogButtons, { buttons, onClick: onButtonClick }),
  );
}