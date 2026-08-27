import CryptoJS from "crypto-js"
// Import du client SRP via le module ES de thinbus-srp
import thinbusClient from "thinbus-srp/client.mjs"

if (typeof window !== "undefined") {
  ;(window as any).CryptoJS = CryptoJS
}

// Constantes RFC 5054 (2048-bit)
export const RFC5054_2048 = {
  N_base10:
    "21766174458617435773191008891802753781907668374255538511144643224689886235383840957210909013086056401571399717235807266581649606472148410291413364152197364477180887395655483738115072677402235101762521901569820740293149529620419333266262073471054548368736039519702486226506248861060256971802984953561121442680157668000761429988222457090413873973970171927093992114751765168063614761119615476233422096442783117971236371647333871414335895773474667308967050807005509320424799678417036867928316761272274230314067548291133582479583061439577559347101961771406173684378522703483495337037655006751328447510550299250924469288819",
  g_base10: "2",
  k_base16: "5b9e8ef059c6b32ea59fc1d322d37f04aa30bae5aa9003b8321e21ddb04e300",
}

// Instanciation de la classe SRP Client Session
const SRP6JavascriptClientSession = thinbusClient(
  RFC5054_2048.N_base10,
  RFC5054_2048.g_base10,
  RFC5054_2048.k_base16
)

function bufferToHex(buffer: Uint8Array): string {
  return Array.from(buffer)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
}

export interface SrpCredentials {
  srpSalt: string
  srpVerifier: string
}

export function generateSrpCredentials(username: string, newPassword: string): SrpCredentials {
  const normalizedUsername = username.trim().toLowerCase()

  const saltBytes = new Uint8Array(16)
  window.crypto.getRandomValues(saltBytes)
  const saltHex = bufferToHex(saltBytes)

  const srpClient = new SRP6JavascriptClientSession()

  const verifierHex = srpClient.generateVerifier(saltHex, normalizedUsername, newPassword)

  return {
    srpSalt: saltHex,
    srpVerifier: verifierHex,
  }
}