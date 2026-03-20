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
import type { Employee, Payroll, Absence, Benefit } from '@/types/database';
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
  const emp = await sdk.employees.get(id);
  return {
    id: emp.id,
    nombre: emp.first_name || '',
    apellido: emp.last_name || '',
    nombreCompleto: emp.full_name || `${emp.first_name} ${emp.last_name}`,
    rut: emp.rut || '',
    cargo: emp.current_job?.role?.name || 'Sin cargo',
    fechaIngreso: emp.hire_date || emp.current_job?.start_date || '',
    estado: emp.active ? 'activo' as const : 'inactivo' as const,
    tipoContrato: emp.contract_type || 'Indefinido',
    sueldoBase: emp.base_salary || 0,
    afp: emp.afp?.name || '',
    salud: emp.health_plan?.name || 'Fonasa',
    email: emp.email || '',
    telefono: emp.phone || '',
    direccion: emp.address || '',
    iniciales: `${(emp.first_name || ' ')[0]}${(emp.last_name || ' ')[0]}`.toUpperCase(),
    color: `hsl(${((emp.first_name || '').charCodeAt(0) * 137) % 360}, 60%, 45%)`,
    empleador: emp.current_job?.company?.name || '',
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
