import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;

@Injectable()
export class CryptoService {
  private readonly logger = new Logger(CryptoService.name);
  private readonly key: Buffer;

  constructor() {
    const raw = process.env.TOKEN_ENCRYPTION_KEY;
    if (!raw) {
      throw new InternalServerErrorException(
        'TOKEN_ENCRYPTION_KEY env var is required. Generate one with: openssl rand -base64 32',
      );
    }
    const decoded = Buffer.from(raw, 'base64');
    if (decoded.length !== 32) {
      throw new InternalServerErrorException(
        'TOKEN_ENCRYPTION_KEY must be 32 bytes (base64-encoded). Current length: ' + decoded.length,
      );
    }
    this.key = decoded;
  }

  encrypt(plaintext: string): string {
    const iv = randomBytes(IV_LENGTH);
    const cipher = createCipheriv(ALGORITHM, this.key, iv);
    const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
    const authTag = cipher.getAuthTag();
    return Buffer.concat([iv, authTag, ciphertext]).toString('base64');
  }

  decrypt(payload: string): string {
    const buf = Buffer.from(payload, 'base64');
    if (buf.length < IV_LENGTH + AUTH_TAG_LENGTH) {
      throw new InternalServerErrorException('Invalid encrypted payload');
    }
    const iv = buf.subarray(0, IV_LENGTH);
    const authTag = buf.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
    const ciphertext = buf.subarray(IV_LENGTH + AUTH_TAG_LENGTH);
    const decipher = createDecipheriv(ALGORITHM, this.key, iv);
    decipher.setAuthTag(authTag);
    try {
      return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8');
    } catch (e) {
      this.logger.error('Decryption failed: ' + (e as Error).message);
      throw new InternalServerErrorException('Token decryption failed. Key may have changed.');
    }
  }

  last4(plaintext: string): string {
    return plaintext.slice(-4);
  }
}
