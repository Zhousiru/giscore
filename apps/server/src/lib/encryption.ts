/**
 * AES-GCM encryption utilities for OAuth state and session tokens.
 * Compatible with Cloudflare Workers (uses Web Crypto API).
 */

function toHex(buffer: Uint8Array): string {
  return Array.from(buffer)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function fromHex(hex: string): Uint8Array {
  const matches = hex.match(/.{2}/g);
  if (!matches) throw new Error("Invalid hex string");
  return new Uint8Array(matches.map((byte) => parseInt(byte, 16)));
}

function toBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]!);
  }
  return btoa(binary);
}

function fromBase64(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export async function aesGcmEncrypt(
  plaintext: string,
  password: string
): Promise<string> {
  const encoder = new TextEncoder();
  const pwHash = await crypto.subtle.digest("SHA-256", encoder.encode(password));
  const iv = crypto.getRandomValues(new Uint8Array(12));

  const key = await crypto.subtle.importKey(
    "raw",
    pwHash,
    { name: "AES-GCM" },
    false,
    ["encrypt"]
  );

  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    encoder.encode(plaintext)
  );

  return toHex(iv) + toBase64(ciphertext);
}

export async function aesGcmDecrypt(
  ciphertext: string,
  password: string
): Promise<string> {
  const encoder = new TextEncoder();
  const pwHash = await crypto.subtle.digest("SHA-256", encoder.encode(password));
  const iv = fromHex(ciphertext.slice(0, 24));
  const ct = fromBase64(ciphertext.slice(24));

  const key = await crypto.subtle.importKey(
    "raw",
    pwHash,
    { name: "AES-GCM" },
    false,
    ["decrypt"]
  );

  const plainBuffer = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    key,
    ct
  );

  return new TextDecoder().decode(plainBuffer);
}

const DEFAULT_VALIDITY_PERIOD = 5 * 60 * 1000; // 5 minutes
const TOKEN_VALIDITY_PERIOD = 1000 * 60 * 60 * 24 * 365; // 1 year

interface State {
  value: string;
  expires: number;
}

export async function encodeState(
  value: string,
  password: string,
  expires = Date.now() + DEFAULT_VALIDITY_PERIOD
): Promise<string> {
  const state: State = { value, expires };
  return aesGcmEncrypt(JSON.stringify(state), password);
}

export async function decodeState(
  encryptedState: string,
  password: string
): Promise<string> {
  let state: State;
  try {
    const decrypted = await aesGcmDecrypt(encryptedState, password);
    state = JSON.parse(decrypted);
  } catch {
    throw new Error("Invalid state value.");
  }
  if (Date.now() > state.expires) {
    throw new Error("State has expired.");
  }
  return state.value;
}

export async function encodeSession(
  token: string,
  password: string
): Promise<string> {
  return encodeState(token, password, Date.now() + TOKEN_VALIDITY_PERIOD);
}

export { TOKEN_VALIDITY_PERIOD };
