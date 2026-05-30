import { describe, it, expect } from 'vitest';
import {
  addDays,
  trialFin,
  enTrial,
  diasRestantesTrial,
  primerCobro,
  proximoCobro,
  montoCobro,
  estadoPorTrial,
  esSoloLectura,
  TRIAL_DIAS,
} from './suscripcion-engine';

const ALTA = new Date('2026-01-01T00:00:00Z');
const iso = (d: Date) => d.toISOString().slice(0, 10);

describe('addDays', () => {
  it('suma días sin mutar el original', () => {
    const r = addDays(ALTA, 30);
    expect(iso(r)).toBe('2026-01-31');
    expect(iso(ALTA)).toBe('2026-01-01'); // no mutado
  });
  it('soporta cruce de mes/año', () => {
    expect(iso(addDays(new Date('2026-12-20T00:00:00Z'), 20))).toBe('2027-01-09');
  });
});

describe('trial', () => {
  it('trialFin = alta + 30 días', () => {
    expect(iso(trialFin(ALTA))).toBe('2026-01-31');
    expect(TRIAL_DIAS).toBe(30);
  });
  it('enTrial true antes del fin, false en/después del fin', () => {
    expect(enTrial(new Date('2026-01-15T00:00:00Z'), ALTA)).toBe(true);
    expect(enTrial(new Date('2026-01-31T00:00:00Z'), ALTA)).toBe(false);
    expect(enTrial(new Date('2026-02-10T00:00:00Z'), ALTA)).toBe(false);
  });
  it('diasRestantesTrial cuenta hacia abajo y nunca negativo', () => {
    expect(diasRestantesTrial(new Date('2026-01-01T00:00:00Z'), ALTA)).toBe(30);
    expect(diasRestantesTrial(new Date('2026-01-21T00:00:00Z'), ALTA)).toBe(10);
    expect(diasRestantesTrial(new Date('2026-03-01T00:00:00Z'), ALTA)).toBe(0);
  });
});

describe('primerCobro', () => {
  it('Camino A → alta + 60 días (meses 1-2 gratis, primer cobro "mes 3")', () => {
    expect(iso(primerCobro('A_inmediato', ALTA, ALTA))).toBe('2026-03-02'); // 60 días
  });
  it('Camino B → la fecha en que se suscribe tras el trial', () => {
    const fechaSub = new Date('2026-02-05T00:00:00Z');
    expect(iso(primerCobro('B_post_trial', ALTA, fechaSub))).toBe('2026-02-05');
  });
});

describe('proximoCobro', () => {
  const ultimo = new Date('2026-03-02T00:00:00Z');

  it('mensual = +30 días', () => {
    const r = proximoCobro('B_post_trial', 'mensual', ultimo, 1);
    expect(iso(r.fecha)).toBe('2026-04-01');
    expect(r.gratis).toBe(false);
  });

  it('anual = +365 días, nunca gratis', () => {
    const r = proximoCobro('A_inmediato', 'anual', ultimo, 12);
    expect(iso(r.fecha)).toBe('2027-03-02');
    expect(r.gratis).toBe(false);
  });

  it('Camino A: el cobro nº 12 y 24 son gratis (1 mes gratis cada 12)', () => {
    expect(proximoCobro('A_inmediato', 'mensual', ultimo, 12).gratis).toBe(true);
    expect(proximoCobro('A_inmediato', 'mensual', ultimo, 24).gratis).toBe(true);
    expect(proximoCobro('A_inmediato', 'mensual', ultimo, 11).gratis).toBe(false);
    expect(proximoCobro('A_inmediato', 'mensual', ultimo, 0).gratis).toBe(false);
  });

  it('Camino B: nunca regala meses', () => {
    expect(proximoCobro('B_post_trial', 'mensual', ultimo, 12).gratis).toBe(false);
    expect(proximoCobro('B_post_trial', 'mensual', ultimo, 24).gratis).toBe(false);
  });
});

describe('montoCobro', () => {
  it('Pro mensual $19.990, anual $199.900 (10 meses)', () => {
    expect(montoCobro('pro', 'mensual')).toBe(19990);
    expect(montoCobro('pro', 'anual')).toBe(199900);
  });
  it('Pro+ mensual $24.990, anual $249.900', () => {
    expect(montoCobro('pro_plus', 'mensual')).toBe(24990);
    expect(montoCobro('pro_plus', 'anual')).toBe(249900);
  });
  it('Starter = 0', () => {
    expect(montoCobro('starter', 'mensual')).toBe(0);
  });
});

describe('estadoPorTrial / esSoloLectura', () => {
  it('dentro del trial → trial', () => {
    expect(estadoPorTrial(new Date('2026-01-10T00:00:00Z'), ALTA, false)).toBe('trial');
  });
  it('trial vencido sin suscripción → pausada', () => {
    expect(estadoPorTrial(new Date('2026-02-15T00:00:00Z'), ALTA, false)).toBe('pausada');
  });
  it('con suscripción activa → activa (aunque pasen los 30 días)', () => {
    expect(estadoPorTrial(new Date('2026-02-15T00:00:00Z'), ALTA, true)).toBe('activa');
  });
  it('esSoloLectura solo para pausada/cancelada', () => {
    expect(esSoloLectura('pausada')).toBe(true);
    expect(esSoloLectura('cancelada')).toBe(true);
    expect(esSoloLectura('trial')).toBe(false);
    expect(esSoloLectura('activa')).toBe(false);
    expect(esSoloLectura('past_due')).toBe(false);
  });
});
