import { describe, it, expect } from 'vitest';
import { estadoStarterTrial } from './estado-suscripcion';

const ALTA = new Date('2026-01-01T00:00:00Z');

describe('estadoStarterTrial (usuario sin empleador → Starter en trial)', () => {
  it('dentro de los 30 días → trial, con días restantes y sin solo-lectura', () => {
    const r = estadoStarterTrial(ALTA, new Date('2026-01-11T00:00:00Z'));
    expect(r.estado).toBe('trial');
    expect(r.plan_tipo).toBe('starter');
    expect(r.enTrial).toBe(true);
    expect(r.diasRestantesTrial).toBe(20);
    expect(r.soloLectura).toBe(false);
  });

  it('pasados los 30 días → pausada + solo-lectura', () => {
    const r = estadoStarterTrial(ALTA, new Date('2026-02-15T00:00:00Z'));
    expect(r.estado).toBe('pausada');
    expect(r.enTrial).toBe(false);
    expect(r.diasRestantesTrial).toBe(0);
    expect(r.soloLectura).toBe(true);
  });

  it('ciclo y próximo cobro nulos (aún no hay suscripción)', () => {
    const r = estadoStarterTrial(ALTA, new Date('2026-01-05T00:00:00Z'));
    expect(r.ciclo).toBeNull();
    expect(r.fecha_proximo_cobro).toBeNull();
  });
});
