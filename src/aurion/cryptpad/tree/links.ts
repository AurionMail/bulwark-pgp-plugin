// lib/links.ts
// Share links in the message: the block that lists them. The picker puts it
// into the message at the caret.

import { formatSize } from './format.ts';
import { ShareLinkItem } from './types.ts';

type TranslateFn = (key: string, params?: Record<string, string | number>) => string;


interface LinkBlockOutput {
  html: string;
  text: string;
}

function escapeHtml(s: unknown): string {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function safeUrl(url: unknown): string {
  const s = String(url ?? '').trim();
  return /^https?:\/\//i.test(s) ? s : '';
}

function details(t: TranslateFn, link: ShareLinkItem, locale?: string): string[] {
  const parts: string[] = [];
  if (link.mode === 'readonly') parts.push(t('tree.links.readOnly'));
  else if (link.mode === 'write') parts.push(t('tree.links.readWrite'));
  if (link.size) parts.push(formatSize(link.size, locale));
  if (link.password && link.includePassword) {
    parts.push(t('links.password', { password: link.password }));
  }
  if (link.expireDate) {
    parts.push(t('links.until', { date: link.expireDate }));
  }
  return parts;
}

/** HTML and plain text listing the links, in the sender's language. */
export function linkBlock(
  t: TranslateFn,
  links: ShareLinkItem[] | null | undefined,
  locale?: string,
): LinkBlockOutput {
  const usable = (links ?? [])
    .map((l) => ({ ...l, safeHref: safeUrl(l.url) }))
    .filter((l): l is ShareLinkItem & { safeHref: string } => Boolean(l.safeHref));

  if (usable.length === 0) return { html: '', text: '' };

  const title = t('tree.links.title');
  const items = usable
    .map((l) => {
      const extra = details(t, l, locale);
      const label = escapeHtml(l.name || l.safeHref);
      const href = escapeHtml(l.safeHref);
      const meta = extra.length ? ` (${escapeHtml(extra.join(', '))})` : '';
      return `<li><a href="${href}">${label}</a>${meta}</li>`;
    })
    .join('');

  const html = `<div class="cryptpad-links"><p><strong>${escapeHtml(title)}</strong></p><ul>${items}</ul></div>`;

  const lines = usable.map((l) => {
    const extra = details(t, l, locale);
    const meta = extra.length ? ` (${extra.join(', ')})` : '';
    return `- ${l.name || l.safeHref}: ${l.safeHref}${meta}`;
  });

  return { html, text: `\n\n${title}\n${lines.join('\n')}\n` };
}