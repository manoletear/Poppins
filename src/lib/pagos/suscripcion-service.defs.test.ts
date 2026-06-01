import { describe, it, expect } from 'vitest';
import { planIdFlow, planesParaFlow } from './suscripcion-service';
import { FLOW_INTERVAL } from '@/lib/flow';

describe('planIdFlow', () => {
  it('genera el id determinístico poppins_<plan>_<ciclo>', () => {
    expect(planIdFlow('pro', 'mensual')).toBe('poppins_pro_mensual');
    expect(planIdFlow('pro', 'anual')).toBe('poppins_pro_anual');
    expect(planIdFlow('pro_plus', 'mensual')).toBe('poppins_pro_plus_mensual');
    expect(planIdFlow('pro_plus', 'anual')).toBe('poppins_pro_plus_anual');
  });
});

describe('planesParaFlow', () => {
  const defs = planesParaFlow('https://cb.example/callback');

  it('define exactamente los 4 planes recurrentes', () => {
    expect(defs).toHaveLength(4);
    expect(defs.map((d) => d.planId).sort()).toEqual([
      'poppins_pro_anual',
      'poppins_pro_mensual',
      'poppins_pro_plus_anual',
      'poppins_pro_plus_mensual',
    ]);
  });

  it('mapea el ciclo al intervalo de Flow correcto', () => {
    for (const d of defs) {
      const esAnual = d.planId.endsWith('_anual');
      expect(d.interval).toBe(esAnual ? FLOW_INTERVAL.ANUAL : FLOW_INTERVAL.MENSUAL);
    }
  });

  it('cada plan tiene monto > 0 y propaga el urlCallback', () => {
    for (const d of defs) {
      expect(d.amount).toBeGreaterThan(0);
      expect(d.urlCallback).toBe('https://cb.example/callback');
      expect(d.name.length).toBeGreaterThan(0);
    }
  });
});
