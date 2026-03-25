// src/lib/pagos/bin-lookup.ts
import type { BinLookupResult } from './types';

// Chilean bank BIN ranges (first 6 digits → bank + card info)
const BIN_CATALOG: { prefix: string; result: BinLookupResult }[] = [
  // Banco Santander
  { prefix: '405616', result: { banco: 'Santander', tipo_tarjeta: 'visa', categoria: 'platinum', programa_puntos: 'Latam Pass', tasa_puntos: 1.0 } },
  { prefix: '450799', result: { banco: 'Santander', tipo_tarjeta: 'visa', categoria: 'signature', programa_puntos: 'Latam Pass', tasa_puntos: 1.5 } },
  { prefix: '455096', result: { banco: 'Santander', tipo_tarjeta: 'visa', categoria: 'gold', programa_puntos: 'Latam Pass', tasa_puntos: 0.8 } },
  { prefix: '525508', result: { banco: 'Santander', tipo_tarjeta: 'mastercard', categoria: 'black', programa_puntos: 'Latam Pass', tasa_puntos: 2.0 } },
  // BCI
  { prefix: '451795', result: { banco: 'BCI', tipo_tarjeta: 'visa', categoria: 'platinum', programa_puntos: 'Latam Pass', tasa_puntos: 1.0 } },
  { prefix: '465375', result: { banco: 'BCI', tipo_tarjeta: 'visa', categoria: 'signature', programa_puntos: 'Dollar', tasa_puntos: 1.2 } },
  { prefix: '542553', result: { banco: 'BCI', tipo_tarjeta: 'mastercard', categoria: 'gold', programa_puntos: 'Dollar', tasa_puntos: 0.7 } },
  // Banco de Chile
  { prefix: '459206', result: { banco: 'Banco de Chile', tipo_tarjeta: 'visa', categoria: 'platinum', programa_puntos: 'Travel Club', tasa_puntos: 1.0 } },
  { prefix: '476257', result: { banco: 'Banco de Chile', tipo_tarjeta: 'visa', categoria: 'infinite', programa_puntos: 'Travel Club', tasa_puntos: 1.8 } },
  { prefix: '553770', result: { banco: 'Banco de Chile', tipo_tarjeta: 'mastercard', categoria: 'black', programa_puntos: 'Travel Club', tasa_puntos: 2.0 } },
  // Banco Estado
  { prefix: '402006', result: { banco: 'Banco Estado', tipo_tarjeta: 'visa', categoria: 'classic', programa_puntos: 'Puntos Estado', tasa_puntos: 0.5 } },
  { prefix: '402007', result: { banco: 'Banco Estado', tipo_tarjeta: 'visa', categoria: 'gold', programa_puntos: 'Puntos Estado', tasa_puntos: 0.8 } },
  // Falabella
  { prefix: '627103', result: { banco: 'Banco Falabella', tipo_tarjeta: 'otra', categoria: 'classic', programa_puntos: 'CMR Puntos', tasa_puntos: 1.0 } },
  { prefix: '559138', result: { banco: 'Banco Falabella', tipo_tarjeta: 'mastercard', categoria: 'gold', programa_puntos: 'CMR Puntos', tasa_puntos: 1.2 } },
  // Scotiabank
  { prefix: '450970', result: { banco: 'Scotiabank', tipo_tarjeta: 'visa', categoria: 'platinum', programa_puntos: 'Scotia Rewards', tasa_puntos: 0.8 } },
  // Itau
  { prefix: '438136', result: { banco: 'Itau', tipo_tarjeta: 'visa', categoria: 'platinum', programa_puntos: 'Latam Pass', tasa_puntos: 1.0 } },
];

// Fallback detection by first digit (card network)
const NETWORK_MAP: Record<string, 'visa' | 'mastercard' | 'amex' | 'diners'> = {
  '4': 'visa',
  '5': 'mastercard',
  '3': 'amex',
  '36': 'diners',
};

export function lookupBin(bin: string): BinLookupResult | null {
  const cleanBin = bin.replace(/\s/g, '').substring(0, 6);
  if (cleanBin.length < 6) return null;

  // Exact BIN match
  const match = BIN_CATALOG.find(entry => cleanBin.startsWith(entry.prefix));
  if (match) return match.result;

  // Fallback: detect network only
  const firstDigit = cleanBin[0];
  const network = NETWORK_MAP[cleanBin.substring(0, 2)] || NETWORK_MAP[firstDigit];
  if (network) {
    return {
      banco: 'Banco no identificado',
      tipo_tarjeta: network,
      categoria: 'otra',
      programa_puntos: 'Consulta con tu banco',
      tasa_puntos: 0.5,
    };
  }

  return null;
}

// Bank color themes for UI
export const BANK_THEMES: Record<string, { bg: string; text: string; accent: string }> = {
  'Santander': { bg: 'bg-red-50', text: 'text-red-800', accent: 'bg-red-600' },
  'BCI': { bg: 'bg-blue-50', text: 'text-blue-800', accent: 'bg-blue-600' },
  'Banco de Chile': { bg: 'bg-sky-50', text: 'text-sky-800', accent: 'bg-sky-600' },
  'Banco Estado': { bg: 'bg-green-50', text: 'text-green-800', accent: 'bg-green-600' },
  'Banco Falabella': { bg: 'bg-lime-50', text: 'text-lime-800', accent: 'bg-lime-600' },
  'Scotiabank': { bg: 'bg-red-50', text: 'text-red-800', accent: 'bg-red-700' },
  'Itau': { bg: 'bg-orange-50', text: 'text-orange-800', accent: 'bg-orange-600' },
};
