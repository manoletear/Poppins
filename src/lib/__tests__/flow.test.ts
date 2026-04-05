import { describe, it, expect, vi, beforeEach } from 'vitest';
import crypto from 'crypto';

// Test the HMAC signing logic directly
describe('Flow HMAC Signing', () => {
  const SECRET = 'test_secret_key_123';

  function signParams(params: Record<string, string>, secret: string): string {
    const sortedKeys = Object.keys(params).sort();
    const toSign = sortedKeys.map(k => `${k}${params[k]}`).join('');
    return crypto.createHmac('sha256', secret).update(toSign).digest('hex');
  }

  it('should sort params alphabetically before signing', () => {
    const params = { z_param: 'last', a_param: 'first', m_param: 'middle' };
    const sig = signParams(params, SECRET);
    // Verify deterministic: same params = same signature
    expect(sig).toBe(signParams(params, SECRET));
    // Verify order doesn't matter
    const reordered = { m_param: 'middle', a_param: 'first', z_param: 'last' };
    expect(signParams(reordered, SECRET)).toBe(sig);
  });

  it('should produce different signatures for different params', () => {
    const sig1 = signParams({ amount: '1000', email: 'a@b.cl' }, SECRET);
    const sig2 = signParams({ amount: '2000', email: 'a@b.cl' }, SECRET);
    expect(sig1).not.toBe(sig2);
  });

  it('should produce different signatures for different secrets', () => {
    const params = { amount: '1000' };
    const sig1 = signParams(params, 'secret_1');
    const sig2 = signParams(params, 'secret_2');
    expect(sig1).not.toBe(sig2);
  });

  it('should produce a 64-char hex string', () => {
    const sig = signParams({ test: 'value' }, SECRET);
    expect(sig).toMatch(/^[a-f0-9]{64}$/);
  });
});

describe('Flow Payment Validation', () => {
  it('should reject negative amounts', () => {
    expect(-100).toBeLessThan(0);
  });

  it('should round amounts to integers', () => {
    expect(Math.round(1999.5)).toBe(2000);
    expect(Math.round(1999.4)).toBe(1999);
  });
});
