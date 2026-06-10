// URLs para react-pdf en Cloudflare Workers.
// Los fonts/logo se sirven como assets estáticos del mismo Worker.
const BASE = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

export const FONT_REGULAR = `${BASE}/fonts/Poppins-Regular.ttf`;
export const FONT_MEDIUM  = `${BASE}/fonts/Poppins-Medium.ttf`;
export const FONT_BOLD    = `${BASE}/fonts/Poppins-Bold.ttf`;
export const LOGO_URL     = `${BASE}/Poppins.png`;
