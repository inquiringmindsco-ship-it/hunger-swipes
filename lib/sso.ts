import crypto from 'crypto';

export type SsoTokenPayload = {
  email: string;
  target: string;
  exp: number;
};

function getSsoSecret(): string {
  const secret = process.env.IMG_X_LIKENESS_SSO_SECRET;
  if (!secret) throw new Error('Missing IMG_X_LIKENESS_SSO_SECRET');
  return secret;
}

export function verifySsoToken(token: string): SsoTokenPayload | null {
  try {
    const [encoded, sig] = token.split('.');
    if (!encoded || !sig) return null;

    const expectedSig = crypto.createHmac('sha256', getSsoSecret()).update(encoded).digest('base64url');
    if (sig.length !== expectedSig.length) return null;

    let diff = 0;
    for (let i = 0; i < sig.length; i += 1) {
      diff |= sig.charCodeAt(i) ^ expectedSig.charCodeAt(i);
    }
    if (diff !== 0) return null;

    const parsed = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8'));
    if (!parsed?.email || parsed.target !== 'hunger-swipes' || typeof parsed.exp !== 'number') return null;
    if (Date.now() > parsed.exp) return null;

    return parsed as SsoTokenPayload;
  } catch {
    return null;
  }
}
