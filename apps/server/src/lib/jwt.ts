// GitHub App JWT generation using Web Crypto API (Cloudflare Workers compatible)

interface JWTPayload {
  iat: number;
  exp: number;
  iss: string;
}

function base64UrlEncode(data: Uint8Array): string {
  const base64 = btoa(String.fromCharCode(...data));
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function textToBase64Url(text: string): string {
  const encoder = new TextEncoder();
  return base64UrlEncode(encoder.encode(text));
}

// PKCS#1 to PKCS#8 wrapper: wraps RSA private key in PKCS#8 ASN.1 structure
function wrapPkcs1ToPkcs8(pkcs1Bytes: Uint8Array): Uint8Array {
  // PKCS#8 header for RSA: SEQUENCE { version, AlgorithmIdentifier { rsaEncryption OID }, OCTET STRING }
  const pkcs8Header = new Uint8Array([
    0x30, 0x82, 0x00, 0x00, // SEQUENCE, length placeholder (bytes 2-3)
    0x02, 0x01, 0x00, // INTEGER version = 0
    0x30, 0x0d, // SEQUENCE (AlgorithmIdentifier)
    0x06, 0x09, 0x2a, 0x86, 0x48, 0x86, 0xf7, 0x0d, 0x01, 0x01, 0x01, // OID rsaEncryption
    0x05, 0x00, // NULL
    0x04, 0x82, 0x00, 0x00, // OCTET STRING, length placeholder (bytes 24-25)
  ]);

  const totalLength = pkcs8Header.length + pkcs1Bytes.length;
  const result = new Uint8Array(totalLength);
  result.set(pkcs8Header);
  result.set(pkcs1Bytes, pkcs8Header.length);

  // Set SEQUENCE length (total - 4 bytes for SEQUENCE tag and length)
  const seqLength = totalLength - 4;
  result[2] = (seqLength >> 8) & 0xff;
  result[3] = seqLength & 0xff;

  // Set OCTET STRING length
  const octetLength = pkcs1Bytes.length;
  result[24] = (octetLength >> 8) & 0xff;
  result[25] = octetLength & 0xff;

  return result;
}

async function importPrivateKey(pem: string): Promise<CryptoKey> {
  const isPkcs1 = pem.includes("BEGIN RSA PRIVATE KEY");

  const pemContents = pem
    .replace(/-----BEGIN RSA PRIVATE KEY-----/, "")
    .replace(/-----END RSA PRIVATE KEY-----/, "")
    .replace(/-----BEGIN PRIVATE KEY-----/, "")
    .replace(/-----END PRIVATE KEY-----/, "")
    .replace(/\s/g, "");

  const binaryString = atob(pemContents);
  const rawBytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    rawBytes[i] = binaryString.charCodeAt(i);
  }

  // Convert PKCS#1 to PKCS#8 if needed
  const bytes = isPkcs1 ? wrapPkcs1ToPkcs8(rawBytes) : rawBytes;

  return crypto.subtle.importKey(
    "pkcs8",
    bytes,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  );
}

export async function createJWT(
  appId: string,
  privateKey: string
): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const payload: JWTPayload = {
    iat: now - 60, // 60 seconds in the past for clock drift
    exp: now + 10 * 60, // 10 minutes max
    iss: appId,
  };

  const header = { alg: "RS256", typ: "JWT" };
  const headerEncoded = textToBase64Url(JSON.stringify(header));
  const payloadEncoded = textToBase64Url(JSON.stringify(payload));
  const message = `${headerEncoded}.${payloadEncoded}`;

  const key = await importPrivateKey(privateKey);
  const encoder = new TextEncoder();
  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    key,
    encoder.encode(message)
  );

  const signatureEncoded = base64UrlEncode(new Uint8Array(signature));
  return `${message}.${signatureEncoded}`;
}
