/**
 * Service Layer — Punto de entrada único para datos.
 *
 * Prioridad:
 * 1. USE_MOCK_DATA=true → mock data (dev sin conexiones)
 * 2. Supabase (si hay datos en DB) → lectura local
 * 3. BUK SDK → fetch remoto tipado
 */

import { getBukSDK } from '@/lib/buk-sdk';
import type { BukEmployeeSummary } from '@/lib/buk-sdk/types/employees';
import { mapBukEmployees, mapBukPayrollItems, mapBukAbsences } from './mappers';
import { MOCK_EMPLOYEES, MOCK_PAYROLL_ITEMS, MOCK_ABSENCES, MOCK_BENEFITS } from './mock-data';
// Legacy BUK types - these map to the old English-named schema
// The actual DB tables are in Spanish (trabajadores, liquidaciones, etc.)
type Employee = Record<string, any>;
type Payroll = Record<string, any>;
type Absence = Record<string, any>;
type Benefit = Record<string, any>;
import { createClient } from '@/lib/supabase/server';

const useMock = process.env.USE_MOCK_DATA === 'true';

// ── Helper: mapear BukEmployeeSummary → PoppinsEmployee shape ──

function mapSdkEmployee(emp: BukEmployeeSummary) {
  return {
    id: emp.id,
    nombre: emp.first_name || '',
    apellido: emp.last_name || '',
    nombreCompleto: emp.full_name || `${emp.first_name} ${emp.last_name}`,
    rut: emp.rut || '',
    cargo: emp.current_job?.role?.name || 'Sin cargo',
    fechaIngreso: emp.current_job?.start_date || '',
    estado: emp.active ? 'activo' as const : 'inactivo' as const,
    tipoContrato: 'Indefinido',
    sueldoBase: 0,
    afp: '',
    salud: '',
    email: emp.email || '',
    telefono: emp.phone || '',
    direccion: '',
    iniciales: `${(emp.first_name || ' ')[0]}${(emp.last_name || ' ')[0]}`.toUpperCase(),
    color: `hsl(${((emp.first_name || '').charCodeAt(0) * 137) % 360}, 60%, 45%)`,
    empleador: emp.current_job?.company?.name || '',
  };
}

// ── Employees ──

export async function getEmployees() {
  if (useMock) {
    return mapBukEmployees(MOCK_EMPLOYEES);
  }

  // Intentar Supabase primero
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('employees')
      .select('*')
      .order('nombre');

    const rows = data as unknown as Employee[] | null;
    if (!error && rows && rows.length > 0) {
      return rows.map(emp => ({
        id: emp.buk_id ?? 0,
        nombre: emp.nombre,
        apellido: emp.apellido,
        nombreCompleto: `${emp.nombre} ${emp.apellido}`,
        rut: emp.rut,
        cargo: emp.cargo,
        fechaIngreso: emp.fecha_ingreso,
        estado: emp.estado as 'activo' | 'inactivo' | 'licencia',
        tipoContrato: emp.tipo_contrato,
        sueldoBase: emp.sueldo_base,
        afp: emp.afp ?? '',
        salud: emp.salud ?? '',
        email: emp.email ?? '',
        telefono: emp.telefono ?? '',
        direccion: emp.direccion ?? '',
        iniciales: `${emp.nombre[0]}${emp.apellido[0]}`.toUpperCase(),
        color: `hsl(${(emp.nombre.charCodeAt(0) * 137) % 360}, 60%, 45%)`,
        empleador: '',
      }));
    }
  } catch {
    // Supabase no disponible, seguir con BUK SDK
  }

  // Fallback: BUK SDK
  const sdk = getBukSDK();
  const response = await sdk.employees.listActive();
  return response.data.map(mapSdkEmployee);
}

export async function getEmployee(id: number) {
  if (useMock) {
    const emp = MOCK_EMPLOYEES.find(e => e.id === id);
    if (!emp) throw new Error(`Employee ${id} not found`);
    return mapBukEmployees([emp])[0];
  }

  const sdk = getBukSDK();
  const e = (await sdk.employees.get(id)) as any;
  const cj = e.current_job || {};
  const str = (v: any) => (typeof v === 'string' ? v : v?.name) || '';
  return {
    id: e.id,
    nombre: e.first_name || '',
    apellido: e.surname || e.last_name || '',
    apellidoMaterno: e.second_surname || '',
    nombreCompleto: e.full_name || `${e.first_name || ''} ${e.surname || ''}`.trim(),
    rut: e.rut || e.document_number || '',
    cargo: cj.role?.name || cj.position?.name || cj.area?.name || cj.name || 'Sin cargo',
    fechaIngreso: e.active_since || e.hire_date || cj.start_date || '',
    estado: (e.status === 'activo' || e.active === true || (!e.active_until && e.active_since)) ? 'activo' as const : 'inactivo' as const,
    tipoContrato: cj.contract_type || cj.type || e.contract_type || 'Indefinido',
    sueldoBase: Number(cj.base_wage ?? cj.liquid_wage ?? cj.salary ?? cj.base_salary ?? cj.assignable_salary ?? e.base_salary ?? 0) || 0,
    afp: str(e.pension_fund) || str(e.afp),
    salud: str(e.health_company) || str(e.health_plan) || 'Fonasa',
    email: e.email || e.personal_email || '',
    telefono: e.phone || e.office_phone || '',
    direccion: e.address || e.street || '',
    iniciales: `${(e.first_name || ' ')[0]}${(e.surname || ' ')[0]}`.toUpperCase(),
    color: `hsl(${((e.first_name || '').charCodeAt(0) * 137) % 360}, 60%, 45%)`,
    empleador: cj.company?.name || '',
    // Extras para importación
    sexo: e.gender || '',
    fechaNacimiento: e.birthday || '',
    estadoCivil: e.civil_status || '',
    nacionalidad: e.nationality || '',
    comuna: e.district || '',
    region: e.region || '',
    banco: str(e.bank),
    tipoCuenta: e.account_type || '',
    numeroCuenta: e.account_number || '',
    cargas: Array.isArray(e.family_responsabilities) ? e.family_responsabilities.length : 0,
  };
}

// ── Payroll ──

export async function getPayrollItems(employeeId?: number) {
  if (useMock) {
    const items = employeeId
      ? MOCK_PAYROLL_ITEMS.filter(i => i.employee_id === employeeId)
      : MOCK_PAYROLL_ITEMS;
    return mapBukPayrollItems(items);
  }

  // Intentar Supabase
  try {
    const supabase = await createClient();
    let query = supabase.from('payroll').select('*').order('periodo', { ascending: false });
    if (employeeId) {
      query = query.eq('employee_id', employeeId);
    }
    const { data, error } = await query;

    const rows = data as unknown as Payroll[] | null;
    if (!error && rows && rows.length > 0) {
      return rows.map(p => ({
        id: p.buk_id ?? 0,
        empleadoId: 0,
        periodo: p.periodo,
        sueldoBruto: p.total_haberes,
        sueldoBase: p.sueldo_base,
        horasExtra: p.monto_horas_extra,
        bonos: p.bonos,
        gratificacion: p.gratificacion,
        descSalud: p.desc_salud,
        descAfp: p.desc_afp,
        descCesantia: p.desc_cesantia,
        impuestoUnico: p.impuesto_unico,
        otrosDescuentos: p.otros_descuentos,
        totalHaberes: p.total_haberes,
        totalDescuentos: p.total_descuentos,
        liquido: p.sueldo_liquido,
        estado: p.estado,
        fechaPago: p.fecha_pago,
      }));
    }
  } catch {
    // Supabase no disponible
  }

  // Fallback: BUK SDK
  const sdk = getBukSDK();
  const processes = await sdk.payroll.listAllProcesses();
  const allItems = [];
  for (const process of processes) {
    const items = await sdk.payroll.listAllItems(
      process.id,
      employeeId ? { employee_id: employeeId } : undefined
    );
    allItems.push(...items);
  }
  const filtered = employeeId
    ? allItems.filter(i => i.employee_id === employeeId)
    : allItems;
  return filtered.map(item => ({
    id: item.id,
    empleadoId: item.employee_id,
    periodo: item.period,
    sueldoBruto: item.total_earnings,
    sueldoBase: item.base_salary,
    horasExtra: item.overtime_amount,
    bonos: item.bonuses,
    gratificacion: item.gratification,
    descSalud: item.health_amount,
    descAfp: item.afp_amount,
    descCesantia: item.unemployment_insurance,
    impuestoUnico: item.tax_amount,
    otrosDescuentos: item.other_deductions,
    totalHaberes: item.total_earnings,
    totalDescuentos: item.total_deductions,
    liquido: item.net_salary,
    estado: item.status === 'paid' ? 'Pagado' : 'Pendiente',
    fechaPago: item.payment_date || null,
  }));
}

// ── Absences ──

export async function getAbsences(employeeId?: number) {
  if (useMock) {
    const items = employeeId
      ? MOCK_ABSENCES.filter(a => a.employee_id === employeeId)
      : MOCK_ABSENCES;
    return mapBukAbsences(items);
  }

  // Intentar Supabase
  try {
    const supabase = await createClient();
    let query = supabase.from('absences').select('*').order('fecha_inicio', { ascending: false });
    if (employeeId) {
      query = query.eq('employee_id', employeeId);
    }
    const { data, error } = await query;

    const rows = data as unknown as Absence[] | null;
    if (!error && rows && rows.length > 0) {
      return rows.map(a => ({
        id: a.buk_id ?? 0,
        empleadoId: 0,
        tipo: a.tipo,
        inicio: a.fecha_inicio,
        fin: a.fecha_fin,
        dias: a.dias,
        estado: a.estado === 'aprobada' ? 'aprobada' as const
          : a.estado === 'rechazada' ? 'rechazada' as const
          : 'pendiente' as const,
        observaciones: a.observaciones ?? '',
      }));
    }
  } catch {
    // Supabase no disponible
  }

  // Fallback: BUK SDK
  const sdk = getBukSDK();
  const response = await sdk.absences.listAbsences(
    employeeId ? { employee_id: employeeId } : undefined
  );
  return response.data.map(a => ({
    id: a.id,
    empleadoId: a.employee_id,
    tipo: a.absence_subtype || a.absence_type,
    inicio: a.start_date,
    fin: a.end_date,
    dias: a.days,
    estado: a.status === 'approved' ? 'aprobada' as const
      : a.status === 'rejected' ? 'rechazada' as const
      : 'pendiente' as const,
    observaciones: a.observations || '',
  }));
}

export async function createAbsence(absenceData: Record<string, unknown>) {
  if (useMock) {
    return { success: true, id: Date.now() };
  }

  // Escribir en Supabase
  try {
    const supabase = await createClient();
    const insertData = {
      employee_id: absenceData.employee_id as string,
      tipo: absenceData.tipo as string,
      fecha_inicio: absenceData.fecha_inicio as string,
      fecha_fin: absenceData.fecha_fin as string,
      dias: absenceData.dias as number,
    };
    const { data: inserted, error } = await supabase
      .from('absences')
      .insert(insertData as never)
      .select()
      .single();

    if (!error && inserted) {
      const row = inserted as unknown as Absence;
      return { success: true, id: row.id };
    }
  } catch {
    // Fallback
  }

  return { success: false, error: 'Absence creation requires Supabase or specific SDK method' };
}

// ── Benefits ──

export async function getBenefits() {
  if (useMock) {
    return MOCK_BENEFITS;
  }

  // Intentar Supabase
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('benefits')
      .select('*')
      .eq('activo', true);

    const rows = data as unknown as Benefit[] | null;
    if (!error && rows && rows.length > 0) {
      return rows.map(b => ({
        id: 0,
        name: b.nombre,
        description: b.descripcion ?? '',
        amount: b.monto,
      }));
    }
  } catch {
    // Supabase no disponible
  }

  return [];
}


export async function getVacations(employeeId: number) {
  const token = process.env.BUK_API_TOKEN || '';
  const base = (process.env.BUK_API_BASE_URL || 'https://app.buk.cl/api/v1/chile').replace(//$/, '');
  try {
    const r = await fetch(`${base}/vacations?employee_id=${employeeId}`, { headers: { auth_token: token, Accept: 'application/json' } });
    if (!r.ok) return [];
    const j: any = await r.json();
    return (j?.data || []).map((v: any) => ({ inicio: v.start_date, fin: v.end_date, dias: v.working_days ?? v.calendar_days, estado: v.status, tipo: v.type }));
  } catch { return []; }
}
