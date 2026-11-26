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
  type CryptPadDrive,
  type CryptPadFileItem,
  type CryptPadShareLink,
  buildCryptPadShareLinks,
  indexCryptPadDrive,
} from './reader.ts';

const LAST_PATH_KEY = 'cryptpadPickerPath';

export type PickerResult =
  | null
  | { action: 'links'; links: CryptPadShareLink[] };


export interface PickerDialogProps {
  cryptpadData:  CryptPadDrive | null | undefined;
  origin: string;
  composerId: string;
  onResult: (result: PickerResult) => void;
}

export function PickerDialog({
  cryptpadData,
  origin = '',
  onResult,
  composerId,
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
    void host.storage?.set(LAST_PATH_KEY, target).catch(() => {});
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
        throw new Error('Aucun lien valide trouvé pour la sélection.');
      }
      onResult({ action: 'links', links });
      setBusy(false);
    } catch (err) {
      fail(err);
    }
  };

  const none = entries.length === 0;
  const buttons = [
    { id: 'cancel', label: t('common.cancel'), variant: 'secondary' as const, disabled: busy },
    {
      id: 'links',
      label: t('picker.shareLinks'),
      variant: 'primary' as const,
      disabled: none || busy,
      busy,
    },
  ];

  const onButtonClick = (id: string): void => {
    if (id === 'cancel') onResult(null);
    else if (id === 'links') void shareLinks();
  };

  return h(
    Stack,
    { gap: 3 },
    h(
      Row,
      { gap: 2, wrap: false },
      h(
        Button,
        {
          variant: 'secondary',
          disabled: path === '/' || busy,
          onClick: goParent,
        },
        '←',
      ),
      h(Text, { size: 'sm', tone: 'muted' }, path),
    ),
    h(
      Stack,
      { gap: 2 },
      ...currentListing.folders.map((folder) =>
        h(
          Row,
          { key: folder.path, gap: 2 },
          h(
            Button,
            {
              variant: 'secondary',
              disabled: busy,
              onClick: () => navigate(folder.path),
            },
            `${folder.name}`,
          ),
        ),
      ),
      ...currentListing.files.map((file) => {
        const isSelected = selected.has(file.path);
        const mode: CryptPadAccessMode = accessModes[file.path] ?? 'write';
        return h(
          Row,
          { key: file.path, gap: 2 },
          h(
            Button,
            {
              variant: isSelected ? 'primary' : 'secondary',
              disabled: busy,
              onClick: () => toggleFile(file),
            },
            `${isSelected ? '☑' : '☐'} ${file.name}`,
          ),
          file.fileType ? h(Text, { size: 'xs', tone: 'muted' }, file.fileType) : null,
          isSelected && file.hasReadOnly
            ? h(
                Row,
                { gap: 1 },
                h(
                  Button,
                  {
                    variant: mode === 'write' ? 'primary' : 'secondary',
                    onClick: () => setFileAccessMode(file.path, 'write'),
                  },
                  'Lecture / Écriture',
                ),
                h(
                  Button,
                  {
                    variant: mode === 'readonly' ? 'primary' : 'secondary',
                    onClick: () => setFileAccessMode(file.path, 'readonly'),
                  },
                  'Lecture seule (ro)',
                ),
              )
            : null,
        );
      }),
      !currentListing.folders.length && !currentListing.files.length
        ? h(Text, { size: 'xs', tone: 'muted' }, 'Dossier vide.')
        : null,
    ),
    h(
      Text,
      { tone: 'muted', size: 'xs' },
      entries.length
        ? `${entries.length} fichier(s) sélectionné(s) — partage uniquement par lien`
        : 'Sélectionnez un ou plusieurs fichiers pour générer un lien de partage.',
    ),
    busy ? h(Spinner, { label: t('picker.sharing') }) : null,
    h(DialogButtons, { buttons, onClick: onButtonClick }),
  );
}