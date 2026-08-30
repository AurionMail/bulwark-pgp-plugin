import host from '@plugin-host';
import React from 'react';
import { settings } from '../../../shared.ts';
import { listKeyRecords } from '../../../storage.ts';

const h = React.createElement;
const { useState, useEffect } = React;

type Tone = 'ok' | 'warn' | 'error' | 'muted' | 'blue';

interface SubCardState {
  tone: Tone;
  text: string;
}

interface AccountStatus {
  encryption?: SubCardState;
  encryptionAtRest?: SubCardState;
  draftEncryption?: SubCardState;
  processing?: boolean;
}

export interface AccountStateProps {
  accountId?: string;
}

function getToneColor(tone: Tone): string {
  switch (tone) {
    case 'ok':
      return 'var(--color-success, #16a34a)';
    case 'error':
      return 'var(--color-destructive, #dc2626)';
    case 'warn':
      return 'var(--color-warning, #d97706)';
    case 'blue':
      return 'var(--color-primary, #3b82f6)';
    case 'muted':
    default:
      return 'var(--color-muted-foreground, #64748b)';
  }
}

export function AccountState(props: AccountStateProps) {
  const accountId = props?.accountId;
    if (!accountId) {
    return;
    }

  const [isExpanded, setIsExpanded] = useState(false);
  const [status, setStatus] = useState<AccountStatus | null>({
    processing: true,
    encryption: { tone: 'muted', text: host.i18n?.t('account.processing') || 'Vérification en cours...' },
    encryptionAtRest: { tone: 'muted', text: host.i18n?.t('account.processing') || 'Vérification en cours...' },
    draftEncryption: { tone: 'muted', text: host.i18n?.t('account.processing') || 'Vérification en cours...' },
  });

  useEffect(() => {
    let alive = true;
    const checkAccountStatus = async () => {
      
    // 1. Default Encryption check
        const isDefaultEncrypt = settings().defaultEncrypt === true && settings().tryToFetchMissingKeys === true;
        const encryptionStatus: SubCardState = isDefaultEncrypt
          ? {
              tone: 'ok',
              text: host.i18n?.t('account.encryption_ok'),
            }
          : {
              tone: 'warn',
              text: host.i18n?.t('account.encryption_warn'),
            };

        // 2. Encryption At Rest check
        let isAtRestEnabled = false;
        const atRestConfig = await host.crypto.getEncryptionAtRest();
        console.log(atRestConfig);
        isAtRestEnabled = atRestConfig.type !== 'Disabled';

        // fallback : sometimes, when starting the app, host says Disabled but it is false, so we check the keys.
        if (!isAtRestEnabled) {
          const keys = await listKeyRecords(accountId);
          isAtRestEnabled = keys.some(k => k.serverSide);
        }

        const encryptionAtRestStatus: SubCardState = isAtRestEnabled
          ? {
              tone: 'ok',
              text: host.i18n?.t('account.at_rest_ok'),
            }
          : {
              tone: 'error',
              text: host.i18n?.t('account.at_rest_error'),
            };

        // 3. Draft Encryption check
        const isDraftEncrypt = settings().encryptDrafts === true;
        const draftEncryptionStatus: SubCardState = isDraftEncrypt
          ? {
              tone: 'ok',
              text: host.i18n?.t('account.draft_ok'),
            }
          : {
              tone: 'error',
              text: host.i18n?.t('account.draft_error'),
            };

      if (!alive) return;

        setStatus({
          processing: false,
          encryption: encryptionStatus,
          encryptionAtRest: encryptionAtRestStatus,
          draftEncryption: draftEncryptionStatus,
        });
      
    };

    checkAccountStatus();

    return () => {
      alive = false;
    };
  }, [accountId]);

  if (!status) return null;

  const tones: Tone[] = [
    status.encryption?.tone || 'muted',
    status.encryptionAtRest?.tone || 'muted',
    status.draftEncryption?.tone || 'muted',
  ];

  const globalTone: Tone = tones.includes('error')
    ? 'error'
    : tones.includes('warn')
    ? 'warn'
    : tones.includes('blue')
    ? 'blue'
    : tones.includes('ok')
    ? 'ok'
    : 'muted';

  const mainColor = getToneColor(globalTone);

  const mainTheme = {
    color: mainColor,
    bg: `color-mix(in srgb, ${mainColor} 12%, transparent)`,
    border: `1px solid color-mix(in srgb, ${mainColor} 25%, transparent)`,
    iconBg: `color-mix(in srgb, ${mainColor} 25%, transparent)`,
  };

   const renderHeaderIcon = () => {
    const svgProps = {
      viewBox: '0 0 24 24', width: '20', height: '20', fill: 'none',
      stroke: 'currentColor', strokeWidth: '2', strokeLinecap: 'round', strokeLinejoin: 'round'
    };

    if (globalTone === 'error') {
      return h('svg', svgProps, [
        h('path', { d: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z', key: '1' }),
        h('line', { x1: '12', y1: '8', x2: '12', y2: '12', key: '2' }),
        h('line', { x1: '12', y1: '16', x2: '12.01', y2: '16', key: '3' }),
      ]);
    }

    return h('svg', svgProps, [
      h('path', { d: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z', key: '1' }),
      h('rect', { x: '9', y: '11', width: '6', height: '5', rx: '1', key: '2' }),
      h('path', { d: 'M10 11V9a2 2 0 0 1 4 0v2', key: '3' }),
    ]);
  };

  const renderCardIcon = (tone: Tone) => {
    if (tone === 'ok') {
      return h('svg', {
        xmlns: 'http://www.w3.org/2000/svg',
        viewBox: '0 -960 960 960',
        width: '18',
        height: '18',
        fill: 'currentColor',
      }, h('path', {
        d: 'm382-354 339-339q12-12 28-12t28 12q12 12 12 28.5T777-636L410-268q-12 12-28 12t-28-12L182-440q-12-12-11.5-28.5T183-497q12-12 28.5-12t28.5 12l142 143Z'
      }));
    }

    const svgProps = {
      viewBox: '0 0 24 24', width: '18', height: '18', fill: 'none',
      stroke: 'currentColor', strokeWidth: '2', strokeLinecap: 'round', strokeLinejoin: 'round'
    };

    if (tone === 'error') {
      return h('svg', svgProps, [
        h('path', { d: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z', key: '1' }),
        h('line', { x1: '12', y1: '8', x2: '12', y2: '12', key: '2' }),
        h('line', { x1: '12', y1: '16', x2: '12.01', y2: '16', key: '3' }),
      ]);
    }

    if (tone === 'warn') {
      return h('svg', svgProps, [
        h('path', { d: 'M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z', key: '1' }),
        h('line', { x1: '12', y1: '9', x2: '12', y2: '13', key: '2' }),
        h('line', { x1: '12', y1: '17', x2: '12.01', y2: '17', key: '3' }),
      ]);
    }

    return h('svg', svgProps, [
      h('path', { d: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z', key: '1' }),
      h('rect', { x: '9', y: '11', width: '6', height: '5', rx: '1', key: '2' }),
      h('path', { d: 'M10 11V9a2 2 0 0 1 4 0v2', key: '3' }),
    ]);
  };

  const renderSubCard = (title: string, cardState?: SubCardState) => {
    const tone = cardState?.tone || 'muted';
    const cardColor = getToneColor(tone);

    const cardBg = `color-mix(in srgb, ${cardColor} 8%, transparent)`;
    const cardBorder = `1px solid color-mix(in srgb, ${cardColor} 22%, transparent)`;
    const iconBg = `color-mix(in srgb, ${cardColor} 20%, transparent)`;

    return h('div', {
      style: {
        width: '100%', display: 'flex', alignItems: 'center', gap: '12px',
        padding: '12px 16px', borderRadius: '8px', background: cardBg,
        border: cardBorder, boxSizing: 'border-box'
      }
    }, [
      h('div', {
        key: 'icon-container',
        style: {
          width: '36px', height: '36px', borderRadius: '9999px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0, background: iconBg, color: cardColor
        },
        'aria-hidden': 'true'
      }, renderCardIcon(tone)),

      h('div', {
        key: 'content-container',
        style: { display: 'flex', flexDirection: 'column', gap: '2px', flex: 1, minWidth: 0 }
      }, [
        h('div', {
          key: 'title',
          style: { fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: cardColor }
        }, title),
        h('div', {
          key: 'content',
          style: { fontSize: '13px', fontWeight: 500, color: 'var(--color-foreground)', opacity: tone === 'muted' ? 0.7 : 0.95 }
        }, cardState?.text || '')
      ])
    ]);
  };

  return h('div', {
    style: { display: 'flex', flexDirection: 'column', gap: '10px', width: '100%' }
  }, [
    h('div', {
      role: 'button',
      tabIndex: 0,
      onClick: () => setIsExpanded(!isExpanded),
      onKeyDown: (e) => { if (e.key === 'Enter' || e.key === ' ') setIsExpanded(!isExpanded); },
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '12px 20px',
        background: mainTheme.bg,
        border: mainTheme.border,
        borderRadius: '8px',
        cursor: 'pointer',
        userSelect: 'none',
        color: 'var(--color-foreground)',
      }
    }, [
      h('div', {
        key: 'main-icon',
        style: {
          width: '38px', height: '38px', borderRadius: '9999px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0, background: mainTheme.iconBg, color: mainTheme.color
        },
        'aria-hidden': 'true'
      }, renderHeaderIcon()),

      h('div', {
        key: 'text-container',
        style: { flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '2px' }
      }, [
        h('div', {
          key: 'title',
          style: { fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: mainTheme.color }
        }, host.i18n?.t('account.state_title')),
        h('div', {
          key: 'subtitle',
          style: { fontSize: '13px', fontWeight: 500, opacity: 0.8 }
        }, host.i18n?.t('account.state_subtitle'))
      ]),

      h('div', {
        key: 'status-dots',
        style: { display: 'flex', alignItems: 'center', gap: '6px', margin: '0 8px' }
      }, tones.map((tone, idx) => {
        const dotColor = getToneColor(tone);
        return h('span', {
          key: idx,
          title: `État ${idx + 1}: ${tone}`,
          style: {
            width: '10px',
            height: '10px',
            borderRadius: '9999px',
            backgroundColor: dotColor,
            boxShadow: `0 0 0 2px color-mix(in srgb, ${dotColor} 25%, transparent)`
          }
        });
      })),

      h('div', {
        key: 'arrow',
        style: {
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: mainTheme.color,
          transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
          transition: 'transform 0.2s ease-in-out'
        }
      }, h('svg', {
        viewBox: '0 0 24 24', width: '20', height: '20', fill: 'none',
        stroke: 'currentColor', strokeWidth: '2', strokeLinecap: 'round', strokeLinejoin: 'round'
      }, h('polyline', { points: '6 9 12 15 18 9' })))
    ]),

    isExpanded ? h('div', {
      key: 'expanded-panel',
      style: { display: 'flex', flexDirection: 'column', gap: '8px', marginLeft: '20px', marginRight: '20px' }
    }, [
      renderSubCard(host.i18n?.t('account.encryption'), status.encryption),
      renderSubCard(host.i18n?.t('account.encryptionAtRest'), status.encryptionAtRest),
      renderSubCard(host.i18n?.t('account.draftEncryption'), status.draftEncryption),
    ]) : null
  ]);
}