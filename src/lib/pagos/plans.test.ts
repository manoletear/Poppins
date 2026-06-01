import { describe, it, expect } from 'vitest';
import { PLANES, getPlan, getPrecio, canAddTrabajador } from './plans';

describe('catálogo de planes', () => {
  it('expone exactamente starter / pro / pro_plus', () => {
    expect(Object.keys(PLANES).sort()).toEqual(['pro', 'pro_plus', 'starter']);
  });

  it('getPlan devuelve el plan correcto', () => {
    expect(getPlan('pro').nombre).toBe('Pro');
    expect(getPlan('pro_plus').nombre).toBe('Pro+');
    expect(getPlan('starter').es_trial).toBe(true);
  });
});

describe('getPrecio', () => {
  it('starter es gratis en ambos ciclos', () => {
    expect(getPrecio('starter', 'mensual')).toBe(0);
    expect(getPrecio('starter', 'anual')).toBe(0);
  });

  it('mensual = precio_mensual del plan', () => {
    expect(getPrecio('pro', 'mensual')).toBe(19990);
    expect(getPrecio('pro_plus', 'mensual')).toBe(24990);
  });

  it('anual = 10 × mensual (ahorro de 2 meses)', () => {
    expect(getPrecio('pro', 'anual')).toBe(getPrecio('pro', 'mensual') * 10);
    expect(getPrecio('pro_plus', 'anual')).toBe(getPrecio('pro_plus', 'mensual') * 10);
  });
});

describe('canAddTrabajador', () => {
  it('starter / pro permiten 1 trabajador (límite 1)', () => {
    for (const tipo of ['starter', 'pro'] as const) {
      expect(canAddTrabajador(tipo, 0)).toBe(true);  // puede agregar el primero
      expect(canAddTrabajador(tipo, 1)).toBe(false); // ya tiene el máximo
      expect(canAddTrabajador(tipo, 2)).toBe(false);
    }
  });

  it('pro_plus es ilimitado (max_trabajadores = -1)', () => {
    expect(canAddTrabajador('pro_plus', 0)).toBe(true);
    expect(canAddTrabajador('pro_plus', 5)).toBe(true);
    expect(canAddTrabajador('pro_plus', 9999)).toBe(true);
  });
});
