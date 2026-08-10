import host from '@plugin-host';
import React from 'react';
import { initAurionAPI } from '../utils.ts';
import { processSecret } from '../secrets/sender.ts';
import { config } from '../../shared.ts';

const h = React.createElement;

// Fonction existante pour récupérer le secret PGP via BroadcastChannel
function fetchCryptDriveSecret(): Promise<string | null> {
  return new Promise((resolve) => {
    const channel = new BroadcastChannel('pgp-session-bus');
    const requestId = Math.random().toString(36).substring(2);

    channel.onmessage = (event) => {
      if (event.data.type === 'RESPONSE_CUSTOM_SECRET' && event.data.requestId === requestId) {
        channel.close();
        resolve(event.data.secret);
      }
    };

    channel.postMessage({ type: 'REQUEST_CUSTOM_SECRET', requestId, salt: 'cryptpad-plugin' });
  });
}

export function Navbar() {
  const [isProcessing, setIsProcessing] = React.useState(false);

  const openCryptPad = async (logOutAll: boolean = false) => {
    setIsProcessing(true);
    const CRYPTPAD_DOMAIN = await config('CryptpadURL');

    try {
      const secret = await fetchCryptDriveSecret();
      
      if (!secret) {
        host.toast.error("Unable to retrieve secret. Please ensure your default key is unlocked and try again.");
        setIsProcessing(false);
        return;
      }
        const { ciphertextHex, ivHex, seedHex } = await processSecret(secret);
        const accounts = await host.user.getAccounts();
        // get the account isConnected and isDefault
        const {avatarColor, email, serverUrl} = accounts.find(acc => acc.isConnected && acc.isDefault);
        console.log("CryptPad: Sending secret to bridge with email: ", email, " and serverUrl: ", serverUrl);

      
        const id = (await (await initAurionAPI()).createBridgeSecret(ciphertextHex)).id;// We use a auth API because creating secrets is an authenticated operation. The API will return the ID of the stored secret.
      
      // On crée l'iframe pointant vers le domaine CryptPad (pad.aurionmail.org)
      const iframe = document.createElement('iframe');
      iframe.src = CRYPTPAD_DOMAIN + '/bridge-minimal.html';
      iframe.style.display = 'none';
      document.body.appendChild(iframe);

      // On prépare l'écouteur pour la confirmation d'écriture de l'iframe
      const handleBridgeConfirmation = (event: MessageEvent) => {
        // SÉCURITÉ : On filtre strictement sur l'origine CryptPad
        if (event.origin !== CRYPTPAD_DOMAIN) return;

        if (event.data && event.data.type === 'WRITE_SUCCESS') {
          
          // Nettoyage des écouteurs et de l'iframe du DOM
          window.removeEventListener('message', handleBridgeConfirmation);
          document.body.removeChild(iframe);

            host.ui.openExternalUrl(CRYPTPAD_DOMAIN + '/login?from=aurion');

          setIsProcessing(false);
        }
      };

      window.addEventListener('message', handleBridgeConfirmation);

      // On envoie le secret dès que l'iframe est chargée dans le DOM
      iframe.onload = () => {
        const payload = logOutAll ? { type: 'WRITE_SECRET', secret:  {
                        id: id,
                        seed: seedHex,
                        iv: ivHex,
                        },
                        // This properties below are not used to claculate secret
                        // but are used by the cryptpad UI to display user.
                        mail: email,
                        server: serverUrl,
                        color: avatarColor,
                        logoutAll: Date.now() }
                         :
                         { type: 'WRITE_SECRET', secret:  {
                        id: id,
                        seed: seedHex,
                        iv: ivHex,
                        },
                        // This properties below are not used to claculate secret
                        // but are used by the cryptpad UI to display user.
                        mail: email,
                        server: serverUrl,
                        color: avatarColor };

        iframe.contentWindow?.postMessage(
          payload,
          CRYPTPAD_DOMAIN
        );
      };

    } catch (error) {
      host.toast.error("An error occurred while fetching the CryptDrive secret: "+error);
      setIsProcessing(false);
    }
  };
// 1. Déclaration du CSS sous forme de chaîne de caractères
// (On l'injecte une seule fois via une balise style)
const buttonStylesCss = `
  .cryptpad-btn {
    position: relative;
    display: flex;
    align-items: center;
    gap: 10px;
    border-radius: 6px;
    justify-content: center;
    width: 100%;
    height: 40px;
    border: none;
    background-color: transparent;
    color: var(--color-muted-foreground);
    cursor: pointer;
    transition: background-color 150ms ease, color 150ms ease;
  }

  .cryptpad-btn:hover:not(:disabled) {
    color: var(--color-foreground);
  }

  .cryptpad-btn:disabled {
    cursor: not-allowed;
  }

  @keyframes pulse-icon {
    0%, 100% { opacity: 1; }
    50% { opacity: .4; }
  }

  .cryptpad-btn-pulse {
    animation: pulse-icon 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
  }
`;
if (!shouldShowCryptpad({})) {
  return null;
}

return h(React.Fragment, null,
  h('style', null, buttonStylesCss),

  h('button', {
    onClick: () => openCryptPad(true),
    disabled: isProcessing,
    title: 'LogOutAll',
    className: 'cryptpad-btn',
    'aria-hidden': isProcessing ? 'true' : undefined
  }, 
    h('svg', {
      xmlns: 'http://www.w3.org/2000/svg',
      width: '24',
      height: '24',
      viewBox: '0 0 24 24',
      fill: 'none',
      stroke: 'red',
      strokeWidth: '2',
      strokeLinecap: 'round',
      strokeLinejoin: 'round',
      className: isProcessing ? 'cryptpad-btn-pulse' : '',
      style: {
        width: '18px',
        height: '18px',
        flexShrink: 0
      },
      'aria-hidden': 'true'
    },
      h('path', { d: 'M6 22a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.704.706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2z' }),
      h('path', { d: 'M14 2v5a1 1 0 0 0 1 1h5' }),
      h('path', { d: 'M10 9H8' }),
      h('path', { d: 'M16 13H8' }),
      h('path', { d: 'M16 17H8' })
    )
  ),
  h('button', {
    onClick: openCryptPad,
    disabled: isProcessing,
    title: 'Cryptpad',
    className: 'cryptpad-btn',
    'aria-hidden': isProcessing ? 'true' : undefined
  }, 
    h('svg', {
      xmlns: 'http://www.w3.org/2000/svg',
      width: '24',
      height: '24',
      viewBox: '0 0 24 24',
      fill: 'none',
      stroke: 'currentColor',
      strokeWidth: '2',
      strokeLinecap: 'round',
      strokeLinejoin: 'round',
      className: isProcessing ? 'cryptpad-btn-pulse' : '',
      style: {
        width: '18px',
        height: '18px',
        flexShrink: 0
      },
      'aria-hidden': 'true'
    },
      h('path', { d: 'M6 22a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.704.706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2z' }),
      h('path', { d: 'M14 2v5a1 1 0 0 0 1 1h5' }),
      h('path', { d: 'M10 9H8' }),
      h('path', { d: 'M16 13H8' }),
      h('path', { d: 'M16 17H8' })
    )
  )
);
}

export async function shouldShowCryptpad(extraProps: any) {
  return await config('CryptpadURL') !== '';
}