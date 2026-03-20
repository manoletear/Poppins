/**
 * Poppins ERP — Mock Data
 * Estructura mapeada con BUK API
 * Reemplazar cada array con el fetch() correspondiente
 * Docs: /docs/BUK-API.md
 */

export const EMPLOYEES = [
  {
    id: 1,
    // BUK: identification_number
    rut: '12.345.678-9',
    // BUK: first_name
    nombre: 'María',
    // BUK: last_name
    apellido: 'González Pérez',
    // BUK: position.name
    cargo: 'Nana',
    fecha_ingreso: '2023-03-01',
    // BUK: employment_status → 'active' | 'inactive'
    estado: 'activo',
    // BUK: contract_type
    tipo_contrato: 'indefinido',
    jornada: 45,
    // BUK: base_salary
    sueldo_base: 450000,
    afp: 'Habitat',
    salud: 'Fonasa',
    email: 'maria.g@gmail.com',
    telefono: '+56 9 8765 4321',
    direccion: 'Av. Los Leones 432, Providencia',
    // UI only
    ini: 'MG',
    col: '#7C3AED',
  },
  {
    id: 2,
    rut: '15.678.901-2',
    nombre: 'Carmen',
    apellido: 'Rojas Silva',
    cargo: 'Cocinera',
    fecha_ingreso: '2022-07-15',
    estado: 'activo',
    tipo_contrato: 'indefinido',
    jornada: 45,
    sueldo_base: 520000,
    afp: 'Capital',
    salud: 'Isapre Cruz Blanca',
    email: 'carmen.r@gmail.com',
    telefono: '+56 9 9876 5432',
    direccion: 'Teatinos 890, Santiago',
    ini: 'CR',
    col: '#059669',
  },
  {
    id: 3,
    rut: '16.234.567-8',
    nombre: 'Ana',
    apellido: 'Martínez López',
    cargo: 'Nana',
    fecha_ingreso: '2024-01-10',
    estado: 'activo',
    tipo_contrato: 'plazo_fijo',
    jornada: 30,
    sueldo_base: 350000,
    afp: 'Provida',
    salud: 'Fonasa',
    email: 'ana.m@gmail.com',
    telefono: '+56 9 7654 3210',
    direccion: 'Av. Grecia 1201, Ñuñoa',
    ini: 'AM',
    col: '#D97706',
  },
  {
    id: 4,
    rut: '10.987.654-3',
    nombre: 'Rosa',
    apellido: 'Vega Contreras',
    cargo: 'Cuidadora',
    fecha_ingreso: '2021-11-20',
    estado: 'inactivo',
    tipo_contrato: 'indefinido',
    jornada: 45,
    sueldo_base: 480000,
    afp: 'Habitat',
    salud: 'Fonasa',
    email: 'rosa.v@gmail.com',
    telefono: '+56 9 6543 2109',
    direccion: "O'Higgins 567, Puente Alto",
    ini: 'RV',
    col: '#DC2626',
  },
  {
    id: 5,
    rut: '18.111.222-5',
    nombre: 'Lucía',
    apellido: 'Fuentes Mora',
    cargo: 'Asesora del Hogar',
    fecha_ingreso: '2025-06-01',
    estado: 'activo',
    tipo_contrato: 'indefinido',
    jornada: 45,
    sueldo_base: 430000,
    afp: 'Cuprum',
    salud: 'Fonasa',
    email: 'lucia.f@gmail.com',
    telefono: '+56 9 5432 1098',
    direccion: 'Av. Kennedy 4567, Las Condes',
    ini: 'LF',
    col: '#2563EB',
  },
];

export const LIQUIDACIONES = [
  // María González — Enero 2026
  {
    id: 1, eid: 1, periodo: '2026-01',
    base: 450000, hex: 0, bono: 30000, grat: 37500,
    d_salud: 36000, d_afp: 45000, d_otros: 0,
    haberes: 517500, descuentos: 81000, liquido: 436500,
    estado: 'pagada', fecha_pago: '2026-01-31',
  },
  // María González — Diciembre 2025
  {
    id: 2, eid: 1, periodo: '2025-12',
    base: 450000, hex: 22500, bono: 50000, grat: 37500,
    d_salud: 36000, d_afp: 45000, d_otros: 0,
    haberes: 560000, descuentos: 81000, liquido: 479000,
    estado: 'pagada', fecha_pago: '2025-12-31',
  },
  // Carmen Rojas — Enero 2026
  {
    id: 3, eid: 2, periodo: '2026-01',
    base: 520000, hex: 0, bono: 0, grat: 43333,
    d_salud: 41600, d_afp: 52000, d_otros: 0,
    haberes: 563333, descuentos: 93600, liquido: 469733,
    estado: 'pagada', fecha_pago: '2026-01-31',
  },
  // Ana Martínez — Enero 2026
  {
    id: 4, eid: 3, periodo: '2026-01',
    base: 350000, hex: 0, bono: 0, grat: 29167,
    d_salud: 28000, d_afp: 35000, d_otros: 0,
    haberes: 379167, descuentos: 63000, liquido: 316167,
    estado: 'pagada', fecha_pago: '2026-01-31',
  },
  // Lucía Fuentes — Enero 2026 (pendiente)
  {
    id: 5, eid: 5, periodo: '2026-01',
    base: 430000, hex: 21500, bono: 0, grat: 35833,
    d_salud: 34400, d_afp: 43000, d_otros: 0,
    haberes: 487333, descuentos: 77400, liquido: 409933,
    estado: 'pendiente', fecha_pago: null,
  },
];

export const VACACIONES = [
  { id: 1, eid: 1, tipo: 'vacaciones', inicio: '2026-02-10', fin: '2026-02-21', dias: 10, estado: 'aprobada', obs: '' },
  { id: 2, eid: 2, tipo: 'licencia_medica', inicio: '2026-01-15', fin: '2026-01-17', dias: 3, estado: 'aprobada', obs: 'Reposo médico' },
  { id: 3, eid: 3, tipo: 'vacaciones', inicio: '2026-03-01', fin: '2026-03-07', dias: 5, estado: 'pendiente', obs: '' },
  { id: 4, eid: 5, tipo: 'permiso', inicio: '2026-02-28', fin: '2026-02-28', dias: 1, estado: 'pendiente', obs: 'Trámite personal' },
];

export const BENEFITS = [
  { icon: '🏥', label: 'Seguro complementario', desc: 'Cobertura adicional de salud', asignados: [1, 2], monto: 15000 },
  { icon: '🚌', label: 'Bono movilización', desc: 'Transporte mensual garantizado', asignados: [1, 3, 5], monto: 25000 },
  { icon: '🍽️', label: 'Colación', desc: 'Bono de alimentación diario', asignados: [2], monto: 45000 },
  { icon: '🎂', label: 'Regalo de cumpleaños', desc: 'Detalle especial cada año', asignados: [1, 2, 3, 5], monto: 5000 },
];
