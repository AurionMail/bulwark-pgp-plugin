// lib/share-from-cryptpad.ts
// Opens the CryptPad file picker dialog for the composer and inserts the
// selected share links (read/write href or read-only roHref).
import host from '@plugin-host';
import {
  type ApplyPickerResultSummary,
  applyPickerResult,
} from './results.ts';
import type { CryptPadDrive } from './reader.ts';
import { config } from '../../../shared.ts';

export interface OpenDialogOptions {
  title: string;
  slot: string;
  extraProps?: Record<string, unknown>;
  width?: number;
}


export async function shareLinksFromCryptPad(
  composerId: string | undefined,
): Promise<ApplyPickerResultSummary> {
  if (typeof composerId !== 'string' || !composerId) {
    return { links: 0 };
  }
  const result = await host.ui.openDialog({
    title: host.i18n.t('picker.title'),
    slot: 'plugin-dialog',
    extraProps:  {
      composerId,
      cryptpadData : mockCryptpadData,
      origin: await config('CryptpadURL'),
    },
    width: 760,
  });
  return applyPickerResult(result, composerId);
}



 const mockCryptpadData: CryptPadDrive = {
    filesData: {
      '335390719574960': {
        atime: 1795540052696,
        channel: 'dc23d63bb37a705d515f640f950b9e833d7f5efc729cdf24',
        ctime: 1795540052696,
        fileType: 'text/markdown',
        href: '/file/#/2/file/z+UksvOuz6u4n7oWPWdARyjI/',
        owners: ['L/tVBHMQlfAoV7NfkaQfs+tvhZvIjNEWX2efLizGUQA='],
        title: 'README.md',
      },
      '2308867959305764': {
        atime: 1795542370887,
        channel: '08f46b160b67f4e17dda6340aaba37976f6e458183a99544',
        ctime: 1795542370887,
        fileType: 'application/x-javascript',
        href: '/file/#/2/file/Wtftqml2iwbRCykwlOLXfqRM/',
        owners: ['L/tVBHMQlfAoV7NfkaQfs+tvhZvIjNEWX2efLizGUQA='],
        title: 'build.js',
      },
      '5302747466925271': {
        atime: 1795542896162,
        channel: '002e4ff4f6dffb63091deb28223e2106',
        ctime: 1795542822998,
        href: '/pad/#/2/pad/edit/-hqavOiKBEFJ+0+q00IoPZ2D/',
        owners: ['L/tVBHMQlfAoV7NfkaQfs+tvhZvIjNEWX2efLizGUQA='],
        roHref: '/pad/#/2/pad/view/aHOFzLNTubCthQzODKbsoZKn4v9d8o9+Ufi50K8lPy0/',
        title: 'Rich text - mar. 24 novembre 2026',
      },
    },
    root: {
      '932c727a3c5cce307c7a458745b058de': 2308867959305764,
      'salut mo': {
        '0d9cbc07f05906e7191a780b21a6ae76': 335390719574960,
        '58df928256f4a6000fd6eb7db1076878': 5302747466925271,
      },
    },
    sharedFolders: {},
    sharedFoldersTemp: {},
    static: {},
    template: [],
    trash: {},
};