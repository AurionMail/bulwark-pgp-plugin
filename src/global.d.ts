
declare module '@plugin-host' {
  export const i18n : any;
    export const composer: {
    replaceSelection: (
      composerId: string | undefined,
      payload: { html: string; text?: string },
    ) => Promise<unknown> | unknown;
  };
  export const storage: {
    get(key: string): Promise<any>;
    set(key: string, value: any): Promise<void>;
  };
  export const jmap: {
    fetchBlob(blobId: string, options?: { name?: string; type?: string, rangeHeader?: number }): Promise<Uint8Array>;
    uploadBlob(blob: Uint8Array, name: string, type: string): Promise<{ blobId: string; size: number; type: string; }>;
    sendRaw(blob: ArrayBuffer, identityId: string, options: { envelopeRecipients: string[] }): Promise<void>;
    submitRaw(blob: ArrayBuffer, identityId: string, options?: { envelopeRecipients: string[] }): Promise<void>;
    importRaw(blob: ArrayBuffer, mailboxRoles: string[], options?: { identityId: string; envelopeRecipients: string[] }): Promise<void>;
  };
  export const crypto: {
      getPublicKeys() : Promise<PublicKeyInfo[]>;
      createPublicKey(input: PublicKeyInput): Promise<string>;//id of key
      removePublicKey(keyId: string): Promise<void>;
      setEncryptionAtRest(config: EncryptionAtRestConfig): Promise<void>;
      getEncryptionAtRest(): Promise<EncryptionAtRestConfig>;
      getPublicKeyFromWKD(email: string): Promise<WkdResult>;
      getWebAuthn(masterCredentialIdBytes: number[]): Promise<{credentialId: number[]; prfSecret: number[]}>;
      createWebAuthn(name: string, displayName: string):  Promise<{ success: true; credentialId: number[]; prfSecret: number[] } | { success: false; reason: 'NEEDS_USER_ACTION'; credentialId: number[], prfSecret?: number[] } | { success: false; reason: string; credentialId?: number[], prfSecret?: number[] }>;
      //getOrCreateWebAuthn(masterCredIdBytes?: number[], rpId?: string, userVisibleName?: string): Promise<{ credentialId: number[]; prfSecret: number[] }>;
    },
  export const upfiles: {
    get(fileId: string): Promise<File>;
    save(formerId: string, file: File): Promise<string>;
    
  };
  export const admin:{
    getConfig(value?: string): Promise<any>;
  },
  export const http: {
    post(path: string, body: Record<string, unknown> | Blob, options?: { headers?: Record<string, string> }) : Promise<{ ok: boolean; status: number; data: unknown }>;
    fetch(url: string, init?: unknown):Promise<Any>;
  }
  export const user: {
    getAccounts(): Promise<AccountEntry[]>;
    getIdentities(): Promise<Identity[]>;
    logout(): Promise<void>;
  }
  export const log: {
    info(msg: string, ...args: any[]): void;
    warn(msg: string, ...args: any[]): void;
    error(msg: string, ...args: any[]): void;
  };
  export const contacts: {
      get(contactId: string): Promise<ContactCard>;
      update(contactId: string, updates: Partial<ContactCard>): Promise<void>;
      create(contact: ContactCard): Promise<string>;
      search(query: string): Promise<ContactCard[]>;
    },

  export const toast: {
    success(msg: string): void;
    error(msg: string): void;
    info(msg: string): void;
    warning(msg: string): void;
  };
  export const ui: {
    confirm(options: { title: string; message: string; danger?: boolean; confirmLabel?: string }): Promise<boolean>;
    prompt(opts: {
        title?: string;
        message?: string;
        confirmLabel?: string;
        cancelLabel?: string;
        fields?: Array<{ name: string; label: string; type?: 'text' | 'password'; placeholder?: string; required?: boolean }>;
      }): Promise<Record<string, string> | null>;
      downloadFile: (opts: { content: string; filename: string; contentType?: string }) => Promise<void>;
      rerenderEmail(): void;
      rerenderFetchedEmails(): void;
      openExternalUrl(url: string): void;
      openDialog(properties: any): any;
  };
  export const http: {
    fetch(url: string, init: any): Promise<any>;
  };
  export const plugin: {
    settings?: {
      autoImportSignerCerts?: boolean;
      defaultSign?: boolean;
      defaultEncrypt?: boolean;
      lockOnLogout?: boolean;
      removeOnLogout?: boolean;
      encryptDrafts?: boolean;
      askForDefaultKeyPassOnActivated?: "default" | "all" | "false";
      alwaysSendPubKey?: boolean;
      tryToFetchMissingKeys?: boolean;
      StoreDangerous?: boolean;
      generateKey?: 'curve25519' | 'ed25519Legacy' | 'rsa4096';
    };
  } | undefined;
}

// global.d.ts

declare module '@plugin-host/ui' {
  import type { ComponentType, ReactNode } from 'react';

  export type UiTone = 'neutral' | 'muted' | 'info' | 'success' | 'warning' | 'danger';
  export type UiSize = 'xs' | 'sm' | 'md' | 'lg';
  export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';

  export interface BaseLayoutProps {
    children?: ReactNode;
    gap?: number | string;
    className?: string;
  }

  export interface StackProps extends BaseLayoutProps {
    align?: 'start' | 'center' | 'end' | 'stretch';
    justify?: 'start' | 'center' | 'end' | 'between' | 'around';
  }

  export interface RowProps extends BaseLayoutProps {
    wrap?: boolean;
    align?: 'start' | 'center' | 'end' | 'stretch';
    justify?: 'start' | 'center' | 'end' | 'between' | 'around';
  }

  export interface TextProps {
    children?: ReactNode;
    size?: UiSize;
    tone?: UiTone;
    className?: string;
  }

  export interface HeadingProps {
    children?: ReactNode;
    level?: 1 | 2 | 3 | 4 | 5 | 6;
    tone?: UiTone;
    className?: string;
  }

  export interface ButtonProps {
    children?: ReactNode;
    variant?: ButtonVariant;
    size?: UiSize;
    disabled?: boolean;
    busy?: boolean;
    onClick?: () => void;
    className?: string;
  }

  export interface AlertProps {
    children?: ReactNode;
    tone?: UiTone;
    icon?: string;
    className?: string;
  }

  export interface SpinnerProps {
    label?: string;
    size?: UiSize;
    className?: string;
  }

  export interface ProgressBarProps {
    value?: number | null;
    label?: string;
    className?: string;
  }

  export interface DialogButtonItem {
    id: string;
    label: string;
    variant?: ButtonVariant;
    disabled?: boolean;
    busy?: boolean;
  }

  export interface DialogButtonsProps {
    buttons: DialogButtonItem[];
    onClick: (id: string) => void;
    className?: string;
  }

  export const Stack: ComponentType<StackProps>;
  export const Row: ComponentType<RowProps>;
  export const Text: ComponentType<TextProps>;
  export const Heading: ComponentType<HeadingProps>;
  export const Button: ComponentType<ButtonProps>;
  export const Alert: ComponentType<AlertProps>;
  export const Spinner: ComponentType<SpinnerProps>;
  export const ProgressBar: ComponentType<ProgressBarProps>;
  export const DialogButtons: ComponentType<DialogButtonsProps>;
}