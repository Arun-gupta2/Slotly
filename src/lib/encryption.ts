import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';

// The key must be exactly 32 bytes (256 bits).
// We expect CALENDAR_ENCRYPTION_KEY in .env.local to be a 32 char string.
function getKey() {
  const envKey = process.env.CALENDAR_ENCRYPTION_KEY;
  if (!envKey) {
    throw new Error('Missing CALENDAR_ENCRYPTION_KEY in environment');
  }
  
  if (envKey.length !== 32) {
    // If it's not 32 chars, we'll hash it to get exactly 32 bytes
    return crypto.createHash('sha256').update(envKey).digest();
  }
  
  return Buffer.from(envKey, 'utf-8');
}

export function encrypt(text: string): string {
  const iv = crypto.randomBytes(12); // GCM standard IV size is 12 bytes
  const cipher = crypto.createCipheriv(ALGORITHM, getKey(), iv);
  
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const authTag = cipher.getAuthTag().toString('hex');
  
  // Format: iv:authTag:encryptedData
  return `${iv.toString('hex')}:${authTag}:${encrypted}`;
}

export function decrypt(encryptedData: string): string {
  const parts = encryptedData.split(':');
  if (parts.length !== 3) {
    throw new Error('Invalid encrypted format');
  }
  
  const [ivHex, authTagHex, contentHex] = parts;
  
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  const content = Buffer.from(contentHex, 'hex');
  
  const decipher = crypto.createDecipheriv(ALGORITHM, getKey(), iv);
  decipher.setAuthTag(authTag);
  
  let decrypted = decipher.update(content, undefined, 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}
