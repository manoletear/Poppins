import { NextResponse } from 'next/server';

export async function GET() {
  const apiKey = process.env.FLOW_API_KEY;
  const secretKey = process.env.FLOW_SECRET_KEY;
  const flowEnv = process.env.FLOW_ENV;

  return NextResponse.json({
    hasApiKey: !!apiKey,
    apiKeyLength: apiKey?.length || 0,
    apiKeyFirst8: apiKey?.substring(0, 8) || 'NOT SET',
    hasSecretKey: !!secretKey,
    secretKeyLength: secretKey?.length || 0,
    flowEnv: flowEnv || 'NOT SET (default: production)',
    siteUrl: process.env.NEXT_PUBLIC_SITE_URL || 'NOT SET',
  });
}
