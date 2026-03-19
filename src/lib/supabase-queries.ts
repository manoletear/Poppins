import { supabase } from "./supabase";
import type { InputLiquidacion, TramoImpuesto, TramoAsignacionFamiliar } from "./payroll/types";

// ============================================================
// Queries centralizadas para Supabase
// ============================================================

/** Obtiene todos los empleados con AFP, salud y contrato activo */
export async function getEmpleados() {
  const { data, error } = await supabase
    .from("v_empleados_completo")
    .select("*");
  if (error) throw error;
  return data ?? [];
}

/** Obtiene un empleado por ID con todos sus datos */
export async function getEmpleadoById(id: string) {
  const { data, error } = await supabase
    .from("v_empleados_completo")
    .select("*")
    .eq("id", id)
    .single();
  if (error) throw error;
  return data;
}

/** Actualiza un trabajador */
export async function updateTrabajador(id: string, campos: Record<string, unknown>) {
  const { error } = await supabase
    .from("trabajadores")
    .update({ ...campos, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

/** Crea un nuevo trabajador */
export async function createTrabajador(datos: Record<string, unknown>) {
  const { data, error } = await supabase
    .from("trabajadores")
    .insert(datos)
    .select()
    .single();
  if (error) throw error;
  return data;
}

/** Crea un nuevo contrato */
export async function createContrato(datos: Record<string, unknown>) {
  const { data, error } = await supabase
    .from("contratos")
    .insert(datos)
    .select()
    .single();
  if (error) throw error;
  return data;
}

/** Obtiene las instituciones previsionales */
export async function getInstituciones() {
  const { data, error } = await supabase
    .from("instituciones_previsionales")
    .select("*")
    .eq("activo", true)
    .order("tipo")
    .order("nombre");
  if (error) throw error;
  return data ?? [];
}

/** Obtiene indicadores económicos del mes */
export async function getIndicadores() {
  const { data, error } = await supabase
    .from("indicadores_economicos")
    .select("*")
    .order("fecha", { ascending: false })
    .limit(10);
  if (error) throw error;

  const uf = data?.find((i: { tipo: string }) => i.tipo === "UF");
  const utm = data?.find((i: { tipo: string }) => i.tipo === "UTM");
  const imm = data?.find((i: { tipo: string }) => i.tipo === "IMM");

  return {
    uf: Number(uf?.valor ?? 38000),
    utm: Number(utm?.valor ?? 66000),
    imm: Number(imm?.valor ?? 500000),
  };
}

/** Obtiene tramos de impuesto vigentes */
export async function getTramosImpuesto(): Promise<TramoImpuesto[]> {
  const { data, error } = await supabase
    .from("tramos_impuesto")
    .select("*")
    .order("tramo");
  if (error) throw error;
  return (data ?? []).map((t: { desde_utm: string; hasta_utm: string; factor: string; rebaja_utm: string }) => ({
    desde_utm: Number(t.desde_utm),
    hasta_utm: Number(t.hasta_utm),
    factor: Number(t.factor),
    rebaja_utm: Number(t.rebaja_utm),
  }));
}

/** Obtiene tramos de asignación familiar vigentes */
export async function getTramosAsignacionFamiliar(): Promise<TramoAsignacionFamiliar[]> {
  const { data, error } = await supabase
    .from("tramos_asignacion_familiar")
    .select("*")
    .order("ingreso_desde");
  if (error) throw error;
  return (data ?? []).map((t: { tramo: string; ingreso_desde: string; ingreso_hasta: string; monto_por_carga: string }) => ({
    tramo: t.tramo as "A" | "B" | "C" | "D",
    ingreso_desde: Number(t.ingreso_desde),
    ingreso_hasta: Number(t.ingreso_hasta),
    monto_por_carga: Number(t.monto_por_carga),
  }));
}

/** Obtiene el dashboard ejecutivo */
export async function getDashboard() {
  const { data, error } = await supabase
    .from("v_dashboard_ejecutivo")
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

/** Obtiene todos los contratos con datos del trabajador */
export async function getContratos() {
  const { data, error } = await supabase
    .from("contratos")
    .select("*, trabajadores(nombre, apellido_paterno, rut)")
    .order("fecha_inicio", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

/** Guarda una liquidación calculada */
export async function saveLiquidacion(liquidacion: Record<string, unknown>) {
  const { data, error } = await supabase
    .from("liquidaciones")
    .insert(liquidacion)
    .select()
    .single();
  if (error) throw error;
  return data;
}

/** Obtiene liquidaciones de un período */
export async function getLiquidaciones(periodo?: string) {
  let query = supabase
    .from("liquidaciones")
    .select("*, trabajadores(nombre, apellido_paterno, rut)")
    .order("created_at", { ascending: false });

  if (periodo) {
    query = query.eq("periodo", periodo);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}
