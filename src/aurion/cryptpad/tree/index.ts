// lib/share-from-cryptpad.ts
// Opens the CryptPad file picker dialog for the composer and inserts the
// selected share links (read/write href or read-only roHref).
import host from '@plugin-host';
import {
  applyPickerResult,
} from './results.ts';
import { config } from '../../../shared.ts';
import { ApplyPickerResultSummary, CryptPadDrive } from './types.ts';
import { fetchAndDecryptTree } from './decoder.ts';


export async function shareLinksFromCryptPad(
  composerId: string | undefined,
): Promise<ApplyPickerResultSummary> {
  if (typeof composerId !== 'string' || !composerId) {
    return { links: 0 };
  }
  const result = await host.ui.openDialog({
    title: host.i18n.t('tree.picker.title'),
    slot: 'plugin-dialog',
    extraProps:  {
      composerId,
      cryptpadData : (await fetchAndDecryptTree()).tree.drive,
      origin: await config('CryptpadURL'),
    },
    width: 760,
  });
  return applyPickerResult(result, composerId);
}