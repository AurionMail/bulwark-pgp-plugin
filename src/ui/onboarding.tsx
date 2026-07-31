import React from 'react';
import host from '@plugin-host';
import { card, selectStyle } from './shared.ts';

const h = React.createElement;
const { useState } = React;

interface OnboardingFlowProps {
  busy: boolean;
  onImportClick: () => void;
  onGenerate: (name: string, email: string, pass: string) => void;
  onJsonImport: () => void;
}

interface UnifiedIdentityOption {
  email: string;
  defaultName: string;
}

export function OnboardingFlow({ busy, onImportClick, onGenerate, onJsonImport }: OnboardingFlowProps) {
  const [step, setStep] = useState<number>(1);
  const [name, setName] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [pass, setPass] = useState<string>('');
  const [identityOptions, setIdentityOptions] = useState<UnifiedIdentityOption[]>([]);
  const [loadingIdentities, setLoadingIdentities] = useState<boolean>(false);

  React.useEffect(() => {
    async function loadUserIdentities() {
      setLoadingIdentities(true);
      try {
        const [accounts, identities] = await Promise.all([
          host.user.getAccounts(),
          host.user.getIdentities()
        ]);

        const map = new Map<string, string>(); // Key: email (lowercase), Value: name

        accounts.forEach(acc => {
          if (!acc.email) return;
          const key = acc.email.toLowerCase().trim();
          if (!map.has(key)) {
            map.set(key, acc.displayName || acc.username || '');
          }
        });
        identities.forEach(id => {
          if (!id.email) return;
          const key = id.email.toLowerCase().trim();
          if (!map.has(key)) {
            map.set(key, id.name || '');
          }
        });

        const unifiedList: UnifiedIdentityOption[] = Array.from(map.entries()).map(([email, defaultName]) => ({
          email,
          defaultName
        }));

        setIdentityOptions(unifiedList);
        if (unifiedList.length > 0) {
          setEmail(unifiedList[0].email);
          setName(unifiedList[0].defaultName);
        }
      } catch (err) {
        console.error('Failed to load identity options', err);
      } finally {
        setLoadingIdentities(false);
      }
    }

    loadUserIdentities();
  }, []);

  const handleEmailChange = (selectedEmail: string) => {
    setEmail(selectedEmail);
    const found = identityOptions.find(opt => opt.email === selectedEmail);
    if (found) {
      setName(found.defaultName);
    }
  };

  const inputStyle = {
    height: '2.25rem', padding: '0 0.75rem', borderRadius: '0.375rem', 
    border: '1px solid var(--color-border, #e2e8f0)', 
    backgroundColor: 'var(--color-background, #ffffff)', 
    outline: 'none', marginBottom: '8px'
  };

  if (step === 1) {
    return h('div', { style: { ...card, padding: '28px', display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '600px' } },
      h('h2', { style: { margin: '0', fontSize: '18px', fontWeight: 600 } }, 'Welcome to Secure Messaging'),
      h('ul', { style: { margin: 0, paddingLeft: '20px', lineHeight: '1.6', fontSize: '14px', color: 'var(--color-muted-foreground, #64748b)' } },
        h('li', { style: { marginBottom: '6px' } }, 'Drafts and attachments are locally encrypted for your privacy.'),
        h('li', { style: { marginBottom: '6px' } }, 'Sending to a recipient without a public key will send 2 separate emails.'),
        h('li', { style: { marginBottom: '6px' } }, 'You have full control over the persistence of your keys (Passphrase or WebAuthn).'),
        h('li', { style: { marginBottom: '6px' } }, 'Imported public keys are automatically linked to your contacts.')
      ),
      h('div', { style: { display: 'flex', justifyContent: 'flex-end' } },
        h('button', { className: 'composer-btn', onClick: () => setStep(2) }, 'Continue')
      )
    );
  }

  if (step === 2) {
    return h('div', { style: { ...card, padding: '28px', display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '600px' } },
      h('h2', { style: { margin: '0', fontSize: '18px', fontWeight: 600 } }, 'Setup Your Identity'),
      h('p', { style: { margin: 0, fontSize: '14px', color: 'var(--color-muted-foreground, #64748b)' } }, 
        'To get started, you need a private key. You can either import an existing one or generate a new keypair.'
      ),
      h('div', { style: { display: 'flex', gap: '12px', marginTop: '8px' } },
        h('button', { className: 'composer-btn', style: { flex: 1 }, disabled: busy, onClick: () => setStep(3) }, 'Generate New Key'),
      )
    );
  }

  if (step === 3) {
    return h('div', { style: { ...card, padding: '28px', display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '600px' } },
      h('h2', { style: { margin: '0', fontSize: '18px', fontWeight: 600 } }, 'How OpenPGP Works'),
      h('p', { style: { margin: 0, fontSize: '14px', lineHeight: '1.5', color: 'var(--color-muted-foreground, #64748b)' } }, 
        'OpenPGP uses a pair of keys to keep your communications safe. The ',
        h('strong', null, 'Public Key'), ' is shared with others so they can encrypt messages sent to you. The ',
        h('strong', null, 'Private Key'), ' stays securely on your device and is used to decrypt those messages. Never share your private key!'
      ),
      h('div', { style: { display: 'flex', justifyContent: 'space-between' } },
        h('button', { className: 'composer-btn', onClick: () => setStep(2) }, 'Back'),
        h('button', { className: 'composer-btn', onClick: () => setStep(4) }, 'Next')
      )
    );
  }

  return h('div', { style: { ...card, padding: '28px', display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '600px' } },
    h('h2', { style: { margin: '0', fontSize: '18px', fontWeight: 600 } }, 'Generate Keypair'),
    h('div', { style: { padding: '12px', backgroundColor: 'var(--color-warning, #e0f2fe)', borderRadius: '6px', fontSize: '13px', color: 'var(--color-warning-foreground, #fffef5)' } },
      h('strong', null, 'Important Backup: '),
      'Upon generation, a revocation certificate and a backup recovery code will be downloaded. Keep them in a safe place! You will need them if you lose your passphrase.'
    ),
    h('div', { style: { display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px' } },

      h('select', {
        value: email,
        disabled: busy || loadingIdentities,
        onChange: (e: React.ChangeEvent<HTMLSelectElement>) => handleEmailChange(e.target.value),
        style: selectStyle
      }, 
        identityOptions.length === 0
          ? h('option', { value: '' }, loadingIdentities ? 'Loading identities...' : 'No email accounts found')
          : identityOptions.map(opt => h('option', { key: opt.email, value: opt.email }, opt.email))
      ),

      h('input', { 
        type: 'text', 
        placeholder: 'Full Name', 
        required: true, 
        value: name, 
        onChange: (e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value), 
        style: inputStyle 
      }),

      h('input', { 
        type: 'password', 
        placeholder: 'Secure Passphrase', 
        required: true, 
        value: pass, 
        onChange: (e: React.ChangeEvent<HTMLInputElement>) => setPass(e.target.value), 
        style: inputStyle 
      })
    ),
    h('div', { style: { display: 'flex', justifyContent: 'space-between' } },
      h('button', { className: 'composer-btn', disabled: busy, onClick: () => setStep(3) }, 'Back'),
      h('button', { 
        className: 'composer-btn', 
        disabled: busy || !email || !pass, 
        onClick: () => onGenerate(name, email, pass) 
      }, 'Generate & Download Backup')
    )
  );
}