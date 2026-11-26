// lib/cryptpad-drive.ts

export interface CryptPadFileMeta {
  title?: string;
  fileType?: string;
  href?: string;
  roHref?: string;
  channel?: string;
  ctime?: number;
  atime?: number;
  owners?: string[];
}

export type CryptPadTreeNode = {
  [key: string]: number | string | CryptPadTreeNode;
};

export interface CryptPadDrive {
  root?: CryptPadTreeNode;
  filesData?: Record<string, CryptPadFileMeta>;
  sharedFolders?: Record<string, unknown>;
  sharedFoldersTemp?: Record<string, unknown>;
  static?: Record<string, unknown>;
  template?: unknown[];
  trash?: Record<string, unknown>;
}

export interface CryptPadDrivePayload {
  drive?: CryptPadDrive;
}

export interface CryptPadFolderItem {
  name: string;
  path: string;
}

export interface CryptPadFileItem {
  id: string;
  name: string;
  path: string; // clé unique : `${folderPath}/${name}#${id}`
  fileType: string;
  ctime?: number;
  atime?: number;
  href: string;
  roHref: string;
  hasReadOnly: boolean;
}

export interface CryptPadFolderListing {
  folders: CryptPadFolderItem[];
  files: CryptPadFileItem[];
}

export type CryptPadAccessMode = 'write' | 'readonly';

export type CryptPadAccessModesMap = Record<string, CryptPadAccessMode>;

export interface CryptPadShareLink {
  id: string;
  name: string;
  mode: CryptPadAccessMode;
  url: string;
}

/**
 * Normalise un lien CryptPad (ex: "/pad/#/2/pad/view/...") avec l'URL de base
 * de l'instance CryptPad si nécessaire (ex: "https://cryptpad.fr").
 */
export function resolveCryptPadUrl(rawUrl: string | undefined, origin = ''): string {
  if (!rawUrl) return '';
  if (/^https?:\/\//i.test(rawUrl)) return rawUrl;
  const base = origin.replace(/\/+$/, '');
  const path = rawUrl.startsWith('/') ? rawUrl : `/${rawUrl}`;
  return `${base}${path}`;
}

function isFileIdRef(value: unknown): value is number | string {
  return (
    typeof value === 'number' ||
    (typeof value === 'string' && /^\d+$/.test(value))
  );
}

function isFolderNode(value: unknown): value is CryptPadTreeNode {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Indexe l'arborescence à partir de drive.root et drive.filesData.
 */
export function indexCryptPadDrive(
  cryptpadData: CryptPadDrive | null | undefined,
  { origin = '' }: { origin?: string } = {},
): Map<string, CryptPadFolderListing> {
  const drive: CryptPadDrive =
    (cryptpadData && 'drive' in cryptpadData ? cryptpadData.drive : cryptpadData) ?? {};
  const root = drive.root ?? {};
  const filesData = drive.filesData ?? {};
  const folders = new Map<string, CryptPadFolderListing>();

  const ensureFolder = (folderPath: string): CryptPadFolderListing => {
    let listing = folders.get(folderPath);
    if (!listing) {
      listing = { folders: [], files: [] };
      folders.set(folderPath, listing);
    }
    return listing;
  };

  ensureFolder('/');

  const walk = (node: CryptPadTreeNode, currentPath: string): void => {
    const bucket = ensureFolder(currentPath);

    for (const [key, value] of Object.entries(node)) {
      if (isFileIdRef(value)) {
        const fileId = String(value);
        const meta = filesData[fileId];
        if (!meta) continue;

        const name = meta.title || `Fichier ${fileId}`;
        const displayPath = currentPath === '/' ? `/${name}` : `${currentPath}/${name}`;
        const writeUrl = resolveCryptPadUrl(meta.href, origin);
        const readOnlyUrl = resolveCryptPadUrl(meta.roHref, origin);

        bucket.files.push({
          id: fileId,
          name,
          path: `${displayPath}#${fileId}`,
          fileType: meta.fileType || 'cryptpad/document',
          ctime: meta.ctime,
          atime: meta.atime,
          href: writeUrl,
          roHref: readOnlyUrl,
          hasReadOnly: Boolean(readOnlyUrl),
        });
      } else if (isFolderNode(value)) {
        const folderPath = currentPath === '/' ? `/${key}` : `${currentPath}/${key}`;
        bucket.folders.push({
          name: key,
          path: folderPath,
        });
        walk(value, folderPath);
      }
    }
  };

  walk(root, '/');

  for (const listing of folders.values()) {
    listing.folders.sort((a, b) => a.name.localeCompare(b.name));
    listing.files.sort((a, b) => a.name.localeCompare(b.name));
  }

  return folders;
}

/**
 * Construit la liste des liens finaux à partir des fichiers sélectionnés
 * et du mode choisi ('write' | 'readonly') pour ceux qui ont un roHref.
 */
export function buildCryptPadShareLinks(
  entries: CryptPadFileItem[],
  accessModes: CryptPadAccessModesMap = {},
): CryptPadShareLink[] {
  return entries
    .map((entry): CryptPadShareLink | null => {
      const wantsReadOnly = accessModes[entry.path] === 'readonly';
      const useReadOnly = wantsReadOnly && Boolean(entry.roHref);
      const url = useReadOnly ? entry.roHref : (entry.href || entry.roHref);
      if (!url) return null;

      return {
        id: entry.id,
        name: entry.name,
        mode: useReadOnly ? 'readonly' : 'write',
        url,
      };
    })
    .filter((item): item is CryptPadShareLink => item !== null);
}