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
  const pwHash = await crypto.subtle.digest(
    "SHA-256",
    encoder.encode(password)
  );
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
  const pwHash = await crypto.subtle.digest(
    "SHA-256",
    encoder.encode(password)
  );
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

export async function encodeState(
  state: string,
  password: string
): Promise<string> {
  return aesGcmEncrypt(state, password);
}

export async function decodeState(
  encryptedState: string,
  password: string
): Promise<string> {
  let state: string;
  try {
    state = await aesGcmDecrypt(encryptedState, password);
  } catch {
    throw new Error("Invalid state value");
  }
  return state;
}

export async function encodeSession(
  token: string,
  password: string
): Promise<string> {
  return aesGcmEncrypt(token, password);
}
