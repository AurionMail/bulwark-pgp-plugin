// lib/apply-picker-result.ts
// What happens after the CryptPad picker closes: share links go into the
// message at the caret as the link block, where the user sees and edits them
// like any text (one Ctrl+Z takes them out again).

import { linkBlock } from './links.ts';
import host from '@plugin-host';
import { ApplyPickerResultSummary, ShareLinkItem } from './types.ts';

export type CryptPadPickerResult =
  | null
  | undefined
  | {
      action: 'links';
      links: ShareLinkItem[];
    };


export async function applyPickerResult(
  result: CryptPadPickerResult,
  composerId: string,
): Promise<ApplyPickerResultSummary> {
  const t = host.i18n.t;
  if (!result || typeof result !== 'object') {
    return { links: 0 };
  }

  if (result.action === 'links' && Array.isArray(result.links) && result.links.length > 0) {
    const block = linkBlock(t, result.links, host.i18n.getLocale());
    if (!block.html) {
      return { links: 0 };
    }

    try {
      await host.composer.replaceSelection(composerId, {
        html: block.html
      });
    } catch (err) {
      host.toast.error(err as string);
      return { links: 0 };
    }

    host.toast.success(t('composer.linksInserted', { count: result.links.length }));
    return { links: result.links.length };
  }

  return { links: 0 };
}