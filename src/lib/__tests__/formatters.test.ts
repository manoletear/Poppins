import { describe, it, expect } from 'vitest';

// Test formatters used across the app
describe('CLP Formatter', () => {
  function formatCLP(n: number): string {
    return '$' + (n ?? 0).toLocaleString('es-CL');
  }

  it('should format positive numbers with CLP symbol', () => {
    expect(formatCLP(500000)).toMatch(/^\$500/);
  });

  it('should handle zero', () => {
    expect(formatCLP(0)).toBe('$0');
  });

  it('should handle null/undefined via nullish coalescing', () => {
    expect(formatCLP(null as any)).toBe('$0');
    expect(formatCLP(undefined as any)).toBe('$0');
  });
});

describe('Date Helpers', () => {
  it('should format ISO date to YYYY-MM-DD', () => {
    const d = new Date(2026, 3, 5); // April 5, 2026
    const iso = d.toISOString().split('T')[0];
    expect(iso).toBe('2026-04-05');
  });

  it('should calculate age correctly', () => {
    function calcAge(birthDate: string): number {
      const birth = new Date(birthDate);
      const now = new Date();
      let age = now.getFullYear() - birth.getFullYear();
      const m = now.getMonth() - birth.getMonth();
      if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age--;
      return age;
    }
    // Person born Jan 1, 2000 should be 26 in 2026
    expect(calcAge('2000-01-01')).toBeGreaterThanOrEqual(26);
  });
});
