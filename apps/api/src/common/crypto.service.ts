import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';

/**
 * AES-256-GCM encryption for provider API keys.
 * Key derived from API_KEY_ENCRYPTION_SECRET. Server-side only.
 */
@Injectable()
export class CryptoService {
  private readonly key: Buffer | null;

  constructor(config: ConfigService) {
    const secret = config.get<string>('API_KEY_ENCRYPTION_SECRET');
    this.key = secret && secret.trim() ? createHash('sha256').update(secret.trim()).digest() : null;
  }

  isConfigured(): boolean {
    return this.key !== null;
  }

  private ensureKey(): Buffer {
    if (!this.key) {
      throw new InternalServerErrorException(
        'API_KEY_ENCRYPTION_SECRET is not set on the server. Add it to the root .env file (any long random string) and restart the API. Keys are never stored unencrypted.',
      );
    }
    return this.key;
  }

  encrypt(plaintext: string): string {
    const key = this.ensureKey();
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', key, iv);
    const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return `${iv.toString('base64')}.${tag.toString('base64')}.${encrypted.toString('base64')}`;
  }

  decrypt(payload: string): string {
    const key = this.ensureKey();
    const [ivB64, tagB64, dataB64] = payload.split('.');
    if (!ivB64 || !tagB64 || !dataB64) {
      throw new InternalServerErrorException('Stored API key has an invalid format. Delete and re-add it.');
    }
    const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(ivB64, 'base64'));
    decipher.setAuthTag(Buffer.from(tagB64, 'base64'));
    return Buffer.concat([decipher.update(Buffer.from(dataB64, 'base64')), decipher.final()]).toString('utf8');
  }

  /** e.g. "sk-****ab12" — safe to show in UI. */
  preview(key: string): string {
    const trimmed = key.trim();
    if (trimmed.length <= 8) return '****';
    return `${trimmed.slice(0, 3)}****${trimmed.slice(-4)}`;
  }
}
