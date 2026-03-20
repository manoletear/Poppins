import { NextResponse } from 'next/server';
import { getBukSDK } from '@/lib/buk-sdk';

export async function GET() {
  try {
    const sdk = getBukSDK();
    const result = await sdk.healthCheck();
    return NextResponse.json({ data: result }, { status: result.ok ? 200 : 503 });
  } catch (error) {
    console.error('[BUK] Health check error:', error);
    return NextResponse.json(
      {
        data: {
          ok: false,
          latencyMs: 0,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
      },
      { status: 503 }
    );
  }
}
