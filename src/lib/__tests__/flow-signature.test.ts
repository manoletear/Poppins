import { describe, it, expect, vi, afterEach } from 'vitest';
import crypto from 'crypto';

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

/** Firma como lo hace Flow: params (sin `s`) ordenados alfabéticamente, HMAC-SHA256. */
function flowSign(params: Record<string, string>, secret: string): string {
  const toSign = Object.keys(params).sort().map((k) => `${k}${params[k]}`).join('');
  return crypto.createHmac('sha256', secret).update(toSign).digest('hex');
}

describe('verifyFlowSignature', () => {
  it('en modo simulado (sandbox, sin llaves reales) acepta', async () => {
    vi.resetModules();
    vi.stubEnv('FLOW_API_KEY', 'flow_sandbox_key');
    const { verifyFlowSignature } = await import('../flow');
    expect(verifyFlowSignature({ subscriptionId: 'x', s: 'lo-que-sea' })).toBe(true);
  });

  it('con llaves reales: acepta firma válida', async () => {
    vi.resetModules();
    vi.stubEnv('FLOW_API_KEY', 'real_api_key');
    vi.stubEnv('FLOW_SECRET_KEY', 'secret123');
    const { verifyFlowSignature } = await import('../flow');
    const params = { subscriptionId: 'sub_1', status: '2' };
    const s = flowSign(params, 'secret123');
    expect(verifyFlowSignature({ ...params, s })).toBe(true);
  });

  it('con llaves reales: rechaza firma inválida o ausente', async () => {
    vi.resetModules();
    vi.stubEnv('FLOW_API_KEY', 'real_api_key');
    vi.stubEnv('FLOW_SECRET_KEY', 'secret123');
    const { verifyFlowSignature } = await import('../flow');
    expect(verifyFlowSignature({ subscriptionId: 'sub_1', status: '2', s: 'deadbeef' })).toBe(false);
    expect(verifyFlowSignature({ subscriptionId: 'sub_1', status: '2' })).toBe(false); // sin s
  });

  it('con llaves reales: rechaza si manipulan un parámetro', async () => {
    vi.resetModules();
    vi.stubEnv('FLOW_API_KEY', 'real_api_key');
    vi.stubEnv('FLOW_SECRET_KEY', 'secret123');
    const { verifyFlowSignature } = await import('../flow');
    const s = flowSign({ subscriptionId: 'sub_1', status: '2' }, 'secret123');
    // mismo `s` pero status alterado → debe fallar
    expect(verifyFlowSignature({ subscriptionId: 'sub_1', status: '4', s })).toBe(false);
  });
});
