import { randomBytes, createCipheriv, createDecipheriv, scryptSync } from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const SALT_LENGTH = 32;
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;
const KEY_LENGTH = 32;

/**
 * Encrypt a buffer using AES-256-GCM with a passphrase.
 * Output format: [salt (32 bytes)] [iv (16 bytes)] [authTag (16 bytes)] [ciphertext]
 */
export function encryptBuffer(buffer: Buffer, passphrase: string): Buffer {
  const salt = randomBytes(SALT_LENGTH);
  const key = scryptSync(passphrase, salt, KEY_LENGTH);
  const iv = randomBytes(IV_LENGTH);

  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(buffer), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return Buffer.concat([salt, iv, authTag, encrypted]);
}

/**
 * Decrypt a buffer that was encrypted with encryptBuffer.
 */
export function decryptBuffer(encryptedBuffer: Buffer, passphrase: string): Buffer {
  const salt = encryptedBuffer.subarray(0, SALT_LENGTH);
  const iv = encryptedBuffer.subarray(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
  const authTag = encryptedBuffer.subarray(SALT_LENGTH + IV_LENGTH, SALT_LENGTH + IV_LENGTH + AUTH_TAG_LENGTH);
  const ciphertext = encryptedBuffer.subarray(SALT_LENGTH + IV_LENGTH + AUTH_TAG_LENGTH);

  const key = scryptSync(passphrase, salt, KEY_LENGTH);

  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
}

/**
 * Generate a random passphrase (32 hex characters = 128 bits of entropy).
 */
export function generatePassphrase(): string {
  return randomBytes(16).toString('hex');
}
