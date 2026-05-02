import path from 'path';
import { getCaptchaHmac, CAPTCHA_EXPIRY } from './captcha-utils';

export interface CaptchaData {
  svg: string;
  token: string;
}

/**
 * Generates a new CAPTCHA challenge.
 * Uses dynamic import of svg-captcha to avoid top-level font loading issues in Next.js/Turbopack.
 */
export async function generateCaptcha(): Promise<CaptchaData> {
  // Dynamic import to prevent top-level execution of svg-captcha's broken path logic
  const svgCaptcha = (await import('svg-captcha')).default;
  
  try {
    // Manually load font from a stable location (public folder) using absolute path
    const fontPath = path.join(process.cwd(), 'public/fonts/Comismsh.ttf');
    svgCaptcha.loadFont(fontPath);
  } catch (err) {
    // Fallback to trying node_modules path if public fails
    try {
      const fallbackPath = path.join(process.cwd(), 'node_modules/svg-captcha/fonts/Comismsh.ttf');
      svgCaptcha.loadFont(fallbackPath);
    } catch (e) {
      console.error('Failed to load captcha font:', e);
    }
  }

  const captcha = svgCaptcha.create({
    size: 6,
    noise: 3,
    color: true,
    background: '#0a0f14',
  });

  const expiry = Date.now() + CAPTCHA_EXPIRY;
  const hmac = getCaptchaHmac(captcha.text, expiry);
  const token = `${hmac}:${expiry}`;

  return {
    svg: captcha.data,
    token
  };
}
