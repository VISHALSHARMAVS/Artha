import crypto from 'node:crypto';

const JWT_SECRET = process.env.JWT_SECRET || 'artha_secure_jwt_secret_institutional_key_2026';

export interface TokenPayload {
  userId: string;
  email: string;
  iat?: number;
  exp?: number;
}

export class Security {
  /**
   * Hashes a password using scrypt with a cryptographically secure random salt.
   */
  static hashPassword(password: string): { hash: string; salt: string } {
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.scryptSync(password, salt, 64).toString('hex');
    return { hash, salt };
  }

  /**
   * Constant-time password verification using scrypt and timingSafeEqual.
   */
  static verifyPassword(password: string, hash: string, salt: string): boolean {
    try {
      const derivedKey = crypto.scryptSync(password, salt, 64);
      const originalKey = Buffer.from(hash, 'hex');
      if (derivedKey.length !== originalKey.length) {
        return false;
      }
      return crypto.timingSafeEqual(derivedKey, originalKey);
    } catch {
      return false;
    }
  }

  /**
   * Generates a signed, URL-safe JWT (HMAC-SHA256) valid for 7 days.
   */
  static generateToken(payload: { userId: string; email: string }): string {
    const header = { alg: 'HS256', typ: 'JWT' };
    const now = Math.floor(Date.now() / 1000);
    const fullPayload: TokenPayload = {
      ...payload,
      iat: now,
      exp: now + 7 * 24 * 60 * 60, // 7 days expiration
    };

    const encodedHeader = Buffer.from(JSON.stringify(header)).toString('base64url');
    const encodedPayload = Buffer.from(JSON.stringify(fullPayload)).toString('base64url');
    const signature = crypto
      .createHmac('sha256', JWT_SECRET)
      .update(`${encodedHeader}.${encodedPayload}`)
      .digest('base64url');

    return `${encodedHeader}.${encodedPayload}.${signature}`;
  }

  /**
   * Verifies HMAC-SHA256 signature and checks expiration.
   */
  static verifyToken(token: string): TokenPayload | null {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) return null;

      const [encodedHeader, encodedPayload, signature] = parts;

      // Verify HMAC signature in constant time
      const expectedSignature = crypto
        .createHmac('sha256', JWT_SECRET)
        .update(`${encodedHeader}.${encodedPayload}`)
        .digest('base64url');

      const expectedBuf = Buffer.from(expectedSignature);
      const signatureBuf = Buffer.from(signature);

      if (expectedBuf.length !== signatureBuf.length) return null;
      if (!crypto.timingSafeEqual(expectedBuf, signatureBuf)) return null;

      // Parse payload and check expiration
      const payload: TokenPayload = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString('utf8'));
      const now = Math.floor(Date.now() / 1000);
      if (payload.exp && payload.exp < now) {
        return null; // Expired
      }

      return payload;
    } catch {
      return null;
    }
  }
}
