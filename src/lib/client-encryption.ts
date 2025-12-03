// src/lib/client-encryption.ts
// Client-side AES-GCM encryption/decryption utilities

/**
* Generate a random encryption key
*/
export async function generateKey(): Promise<CryptoKey> {
  return crypto.subtle.generateKey(
    {
      name: 'AES-GCM',
      length: 256,
    },
    true, // extractable
    ['encrypt', 'decrypt']
  );
}

/**
 * Generate a random IV (Initialization Vector) for AES-GCM
 */
export function generateIV(): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(12)); // 12 bytes for AES-GCM
}

/**
 * Encrypt data using AES-GCM
 */
export async function encrypt(
  data: ArrayBuffer | Uint8Array,
  key: CryptoKey,
  iv: Uint8Array
): Promise<ArrayBuffer> {
  const dataArray = data instanceof Uint8Array ? data : new Uint8Array(data);

  return crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: iv as unknown as BufferSource,
      tagLength: 128, // 128-bit authentication tag
    },
    key,
    dataArray as unknown as BufferSource
  );
}

/**
 * Decrypt data using AES-GCM
 */
export async function decrypt(
  encryptedData: ArrayBuffer,
  key: CryptoKey,
  iv: Uint8Array
): Promise<ArrayBuffer> {
  return crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv: iv as unknown as BufferSource,
      tagLength: 128,
    },
    key,
    encryptedData as unknown as BufferSource
  );
}

/**
 * Export a CryptoKey to a base64 string
 */
export async function exportKey(key: CryptoKey): Promise<string> {
  const exported = await crypto.subtle.exportKey('raw', key);
  return arrayBufferToBase64(exported);
}

/**
 * Import a CryptoKey from a base64 string
 */
export async function importKey(keyData: string): Promise<CryptoKey> {
  const keyBuffer = base64ToArrayBuffer(keyData);
  return crypto.subtle.importKey(
    'raw',
    keyBuffer,
    {
      name: 'AES-GCM',
      length: 256,
    },
    true,
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypt a string (for filenames, notes, etc.)
 */
export async function encryptString(
  text: string,
  key: CryptoKey,
  iv: Uint8Array
): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const encrypted = await encrypt(data, key, iv);
  return arrayBufferToBase64(encrypted);
}

/**
 * Decrypt a string
 */
export async function decryptString(
  encryptedText: string,
  key: CryptoKey,
  iv: Uint8Array
): Promise<string> {
  const encryptedData = base64ToArrayBuffer(encryptedText);
  const decrypted = await decrypt(encryptedData, key, iv);
  const decoder = new TextDecoder();
  return decoder.decode(decrypted);
}

/**
 * Encrypt a file (File object)
 */
export async function encryptFile(
  file: File,
  key: CryptoKey,
  iv: Uint8Array
): Promise<ArrayBuffer> {
  const arrayBuffer = await file.arrayBuffer();
  return encrypt(arrayBuffer, key, iv);
}

/**
 * Decrypt a file to a Blob
 */
export async function decryptFile(
  encryptedData: ArrayBuffer,
  key: CryptoKey,
  iv: Uint8Array,
  mimeType?: string
): Promise<Blob> {
  const decrypted = await decrypt(encryptedData, key, iv);
  return new Blob([decrypted], { type: mimeType || 'application/octet-stream' });
}

/**
 * Convert ArrayBuffer to base64 string
 */
export function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Convert base64 string to ArrayBuffer
 */
export function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

/**
 * Convert Uint8Array to hex string
 */
export function uint8ArrayToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Convert hex string to Uint8Array
 */
export function hexToUint8Array(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes;
}

/**
 * Store encryption key in browser (using sessionStorage for security)
 * In production, consider using a more secure storage mechanism
 */
export function storeEncryptionKey(keyData: string): void {
  if (typeof window !== 'undefined') {
    sessionStorage.setItem('encryption_key', keyData);
  }
}

/**
 * Retrieve encryption key from browser storage
 */
export function getStoredEncryptionKey(): string | null {
  if (typeof window !== 'undefined') {
    return sessionStorage.getItem('encryption_key');
  }
  return null;
}

/**
 * Clear stored encryption key
 */
export function clearStoredEncryptionKey(): void {
  if (typeof window !== 'undefined') {
    sessionStorage.removeItem('encryption_key');
  }
}
