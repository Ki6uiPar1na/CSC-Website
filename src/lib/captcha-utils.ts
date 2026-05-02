import crypto from 'crypto';

export const CAPTCHA_SECRET = process.env.CAPTCHA_SECRET || 'fallback-secret-for-dev-only';
export const CAPTCHA_EXPIRY = 5 * 60 * 1000; // 5 minutes

export function getCaptchaHmac(answer: string, expiry: number): string {
  const tokenData = `${answer.toLowerCase()}:${expiry}`;
  return crypto.createHmac('sha256', CAPTCHA_SECRET).update(tokenData).digest('hex');
}

export function verifyCaptcha(answer: string, token: string): boolean {
  if (!answer || !token) return false;

  const [hmac, expiryStr] = token.split(':');
  const expiry = parseInt(expiryStr, 10);

  if (isNaN(expiry) || Date.now() > expiry) {
    return false;
  }

  const expectedHmac = getCaptchaHmac(answer, expiry);

  return hmac === expectedHmac;
}
