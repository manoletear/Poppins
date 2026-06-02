// Validadores chilenos reutilizables (RUT módulo 11, email).

export function cleanRut(rut: string): string {
  return (rut || '').replace(/[^0-9kK]/g, '').toUpperCase();
}

/** Valida un RUT chileno con su dígito verificador (módulo 11). */
export function validateRut(rut: string): boolean {
  const c = cleanRut(rut);
  if (c.length < 2) return false;
  const body = c.slice(0, -1);
  const dv = c.slice(-1);
  if (!/^\d+$/.test(body)) return false;
  let sum = 0;
  let mul = 2;
  for (let i = body.length - 1; i >= 0; i--) {
    sum += parseInt(body[i], 10) * mul;
    mul = mul === 7 ? 2 : mul + 1;
  }
  const res = 11 - (sum % 11);
  const dvCalc = res === 11 ? '0' : res === 10 ? 'K' : String(res);
  return dvCalc === dv;
}

/** Formatea un RUT a 12.345.678-9. */
export function formatRut(rut: string): string {
  const c = cleanRut(rut);
  if (c.length < 2) return c;
  const body = c.slice(0, -1);
  const dv = c.slice(-1);
  return `${body.replace(/\B(?=(\d{3})+(?!\d))/g, '.')}-${dv}`;
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test((email || '').trim());
}
