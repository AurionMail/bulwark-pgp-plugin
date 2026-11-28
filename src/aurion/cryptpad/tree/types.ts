export type CryptPadLinkMode = 'write' | 'readonly';

export interface ShareLinkItem {
  id?: string;
  name?: string;
  url: string;
  mode?: CryptPadLinkMode;
  size?: number;
  password?: string;
  includePassword?: boolean;
  expireDate?: string;
}

export interface ApplyPickerResultSummary {
  links: number;
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