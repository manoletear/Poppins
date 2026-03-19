"use client";

import { useEffect, useState } from "react";
import { Calculator, Download, Loader2, FileSpreadsheet, FileText, Pencil } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getEmpleados, getIndicadores, getTramosImpuesto, getTramosAsignacionFamiliar, saveLiquidacion } from "@/lib/supabase-queries";
import { calcularLiquidacion } from "@/lib/payroll/engine";
import type { InputLiquidacion, ResultadoLiquidacion } from "@/lib/payroll/types";
import { construirRegistroPrevired, generarArchivoPrevired } from "@/lib/payroll/generators/previred";
import { construirRegistroLRE, generarArchivoLRE } from "@/lib/payroll/generators/lre";

interface VariablesMes {
  horas_extra_50: number;
  horas_extra_100: number;
  comisiones: number;
  bonos_imponibles: number;
  colacion: number;
  movilizacion: number;
  dias_trabajados: number;
}

const DEFAULTS_VARIABLES: VariablesMes = {
  horas_extra_50: 0,
  horas_extra_100: 0,
  comisiones: 0,
  bonos_imponibles: 0,
  colacion: 40000,
  movilizacion: 30000,
  dias_trabajados: 30,
};

function descargarArchivo(contenido: string, nombre: string) {
  const blob = new Blob([contenido], { type: "text/csv;charset=iso-8859-1" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nombre;
  a.click();
  URL.revokeObjectURL(url);
}

const CODIGOS_SALUD: Record<string, string> = {
  FONASA: "07", Banmédica: "10", Colmena: "16", Consalud: "14",
  "Cruz Blanca": "20", "Nueva Masvida": "27", "Vida Tres": "25", Esencial: "38",
};

export default function LiquidacionesPage() {
  const [empleados, setEmpleados] = useState<Record<string, unknown>[]>([]);
  const [indicadores, setIndicadores] = useState({ uf: 38000, utm: 66000, imm: 500000 });
  const [tramosImp, setTramosImp] = useState<InputLiquidacion["tramos_impuesto"]>([]);
  const [tramosAsig, setTramosAsig] = useState<InputLiquidacion["tramos_asignacion_familiar"]>([]);
  const [loading, setLoading] = useState(true);
  const [calculando, setCalculando] = useState(false);
  const [resultados, setResultados] = useState<{ emp: Record<string, unknown>; liq: ResultadoLiquidacion }[]>([]);
  const [seleccionado, setSeleccionado] = useState<number | null>(null);
  const [variablesPorEmpleado, setVariablesPorEmpleado] = useState<Record<string, VariablesMes>>({});

  const periodo = "2026-03";
  const fmt = (n: number) => `$${n.toLocaleString("es-CL")}`;

  useEffect(() => {
    Promise.all([getEmpleados(), getIndicadores(), getTramosImpuesto(), getTramosAsignacionFamiliar()])
      .then(([emps, ind, ti, ta]) => {
        setEmpleados(emps);
        setIndicadores(ind);
        setTramosImp(ti);
        setTramosAsig(ta);
        // Initialize default variables for each employee
        const defaults: Record<string, VariablesMes> = {};
        emps.forEach((emp) => {
          const id = String(emp.id);
          defaults[id] = { ...DEFAULTS_VARIABLES };
        });
        setVariablesPorEmpleado(defaults);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  function updateVariable(empId: string, field: keyof VariablesMes, value: number) {
    setVariablesPorEmpleado((prev) => ({
      ...prev,
      [empId]: { ...prev[empId], [field]: value },
    }));
  }

  function buildInput(emp: Record<string, unknown>): InputLiquidacion {
    const empId = String(emp.id);
    const vars = variablesPorEmpleado[empId] ?? DEFAULTS_VARIABLES;

    return {
      empleado: {
        rut: String(emp.rut),
        nombre: String(emp.primer_nombre),
        apellido_paterno: String(emp.apellido_paterno),
        apellido_materno: String(emp.apellido_materno ?? ""),
        fecha_nacimiento: new Date(String(emp.fecha_nacimiento ?? "1990-01-01")),
        sexo: String(emp.sexo ?? "M") as "M" | "F",
        fecha_ingreso: new Date(String(emp.fecha_inicio_contrato ?? "2020-01-01")),
        es_pensionado: Boolean(emp.es_pensionado),
        art22_excluido: Boolean(emp.art22_excluido),
      },
      contrato: {
        tipo: (String(emp.tipo_contrato) === "plazo_fijo" ? "plazo_fijo" :
              String(emp.tipo_contrato) === "obra_faena" ? "obra_faena" : "indefinido") as "indefinido" | "plazo_fijo" | "obra_faena",
        fecha_inicio: new Date(String(emp.fecha_inicio_contrato ?? "2020-01-01")),
        sueldo_base: Number(emp.sueldo_base ?? 0),
        tipo_gratificacion: String(emp.tipo_gratificacion) === "art_47" ? "art_47" : "art_50",
        tipo_jornada: String(emp.tipo_jornada ?? "completa") as "completa" | "parcial" | "art_22",
        horas_semanales: Number(emp.horas_semanales ?? 45),
      },
      afp: {
        codigo: String(emp.afp_codigo ?? ""),
        nombre: String(emp.afp_nombre ?? ""),
        tasa_trabajador: Number(emp.tasa_afp ?? 11) / 100,
      },
      salud: {
        tipo: String(emp.salud_tipo ?? "fonasa") as "fonasa" | "isapre",
        nombre: String(emp.salud_nombre ?? "FONASA"),
        plan_uf: emp.plan_salud_uf ? Number(emp.plan_salud_uf) : undefined,
      },
      cargas: {
        simples: Number(emp.cargas_simples ?? 0),
        maternales: Number(emp.cargas_maternales ?? 0),
        invalidez: Number(emp.cargas_invalidez ?? 0),
      },
      variables: {
        horas_extra_50: vars.horas_extra_50,
        horas_extra_100: vars.horas_extra_100,
        comisiones: vars.comisiones,
        colacion: vars.colacion,
        movilizacion: vars.movilizacion,
        viatico: 0,
        bonos_imponibles: vars.bonos_imponibles,
        bonos_no_imponibles: 0,
        dias_trabajados: vars.dias_trabajados,
        dias_licencia: 0,
        apv_monto: 0, apv_regimen: null,
        haberes_adicionales: [], descuentos_adicionales: [],
      },
      indicadores,
      empresa: { tasa_mutual: 0.0093, tasa_sis: 0.0153 },
      tramos_impuesto: tramosImp,
      tramos_asignacion_familiar: tramosAsig,
    };
  }

  const calcularTodas = async () => {
    setCalculando(true);
    try {
      const results = empleados
        .filter((e) => e.sueldo_base && Number(e.sueldo_base) > 0)
        .map((emp) => {
          const input = buildInput(emp);
          const liq = calcularLiquidacion(input, periodo);
          return { emp, liq };
        });
      setResultados(results);

      // Guardar en Supabase
      const empId = (emp: Record<string, unknown>) => String(emp.id);
      for (const { emp, liq } of results) {
        const vars = variablesPorEmpleado[empId(emp)] ?? DEFAULTS_VARIABLES;
        await saveLiquidacion({
          trabajador_id: emp.id,
          periodo,
          sueldo_base: liq.haberes.find((h) => h.nombre === "Sueldo Base")?.monto ?? 0,
          gratificacion_legal: liq.haberes.find((h) => h.nombre.includes("Gratificación"))?.monto ?? 0,
          total_haberes: liq.total_haberes,
          total_haberes_imponibles: liq.total_haberes_imponibles,
          total_haberes_no_imponibles: liq.total_haberes_no_imponibles,
          colacion: vars.colacion,
          movilizacion: vars.movilizacion,
          afp_trabajador: liq.afp_monto,
          salud_trabajador: liq.salud_monto_legal,
          salud_adicional: liq.salud_monto_adicional,
          afc_trabajador: liq.afc_trabajador,
          impuesto_unico: liq.impuesto_unico,
          total_descuentos: liq.total_descuentos,
          liquido_pagar: liq.liquido_a_pagar,
          afc_empleador: liq.costo_empleador.afc_empleador,
          sis_empleador: liq.costo_empleador.sis,
          mutual_empleador: liq.costo_empleador.mutual,
          costo_empresa: liq.costo_empleador.total,
          renta_imponible_afp: liq.renta_imponible_afp,
          renta_imponible_salud: liq.renta_imponible_salud,
          renta_imponible_afc: liq.renta_imponible_afc,
          base_tributable: liq.base_tributable,
          tramo_impuesto: liq.tramo_impuesto,
          asignacion_familiar: liq.asignacion_familiar,
          tramo_asignacion_familiar: liq.tramo_asignacion_familiar === "Sin cargas" ? null : liq.tramo_asignacion_familiar,
          dias_trabajados: liq.dias_trabajados,
          haberes_detalle: liq.haberes,
          descuentos_detalle: liq.descuentos,
          estado: "calculada",
          calculado_at: new Date().toISOString(),
        }).catch(() => {}); // Ignore duplicates
      }
    } finally {
      setCalculando(false);
    }
  };

  const exportarPrevired = () => {
    const registros = resultados.map(({ emp, liq }) =>
      construirRegistroPrevired(liq, {
        rut_empleador: "76.123.456-7",
        rut_trabajador: String(emp.rut),
        apellido_paterno: String(emp.apellido_paterno),
        apellido_materno: String(emp.apellido_materno ?? ""),
        nombres: `${emp.primer_nombre} ${emp.segundo_nombre ?? ""}`.trim(),
        sexo: String(emp.sexo ?? "M") as "M" | "F",
        fecha_nacimiento: String(emp.fecha_nacimiento ?? ""),
        codigo_afp: String(emp.afp_codigo ?? ""),
        codigo_salud: CODIGOS_SALUD[String(emp.salud_nombre)] ?? "07",
        codigo_mutual: "02",
        codigo_ccaf: "",
        tipo_contrato: String(emp.tipo_contrato) === "indefinido" ? "I" as const : "P" as const,
        es_pensionado: Boolean(emp.es_pensionado),
        tasa_sis: 0.0153,
        cotizacion_mutual: liq.costo_empleador.mutual,
        cotizacion_sis: liq.costo_empleador.sis,
        afc_empleador: liq.costo_empleador.afc_empleador,
      })
    );
    descargarArchivo(generarArchivoPrevired(registros), `previred_${periodo}.csv`);
  };

  const exportarLRE = () => {
    const registros = resultados.map(({ emp, liq }) =>
      construirRegistroLRE(liq, {
        rut_empleador: "76.123.456-7",
        razon_social: "Rene Alejandro Aravena Riffo",
        rut_trabajador: String(emp.rut),
        fecha_ingreso: String(emp.fecha_inicio_contrato ?? ""),
        tipo_contrato: String(emp.tipo_contrato ?? "indefinido"),
        cargo: String(emp.cargo ?? ""),
        centro_costo: String(emp.centro_costo ?? ""),
      })
    );
    descargarArchivo(
      generarArchivoLRE(registros, { rut_empleador: "76.123.456-7", razon_social: "Rene Alejandro Aravena Riffo", periodo: periodo.replace("-", "") }),
      `lre_${periodo}.csv`
    );
  };

  const sel = seleccionado !== null ? resultados[seleccionado] : null;
  const empleadosConSueldo = empleados.filter((e) => e.sueldo_base && Number(e.sueldo_base) > 0);

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-zinc-400" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-zinc-900">Liquidaciones - {periodo}</h2>
          <p className="text-sm text-zinc-500">UF: ${indicadores.uf.toLocaleString("es-CL")} | UTM: ${indicadores.utm.toLocaleString("es-CL")} | IMM: ${indicadores.imm.toLocaleString("es-CL")}</p>
        </div>
        <div className="flex items-center gap-2">
          {resultados.length > 0 && (<>
            <button onClick={exportarPrevired} className="inline-flex items-center gap-2 rounded-lg border border-zinc-200 px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50">
              <FileSpreadsheet className="h-4 w-4" />PREVIRED
            </button>
            <button onClick={exportarLRE} className="inline-flex items-center gap-2 rounded-lg border border-zinc-200 px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50">
              <FileText className="h-4 w-4" />LRE
            </button>
          </>)}
          <button onClick={calcularTodas} disabled={calculando}
            className="inline-flex items-center gap-2 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50">
            {calculando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Calculator className="h-4 w-4" />}
            Calcular Todas
          </button>
        </div>
      </div>

      {/* Editable variables table - always visible before/after calculation */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Pencil className="h-4 w-4" />
            Variables Mensuales por Empleado
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-200">
                  <th className="text-left py-2 pr-4 text-zinc-500 font-medium whitespace-nowrap">Nombre</th>
                  <th className="text-center py-2 px-1 text-zinc-500 font-medium whitespace-nowrap">Dias</th>
                  <th className="text-center py-2 px-1 text-zinc-500 font-medium whitespace-nowrap">HE 50%</th>
                  <th className="text-center py-2 px-1 text-zinc-500 font-medium whitespace-nowrap">HE 100%</th>
                  <th className="text-center py-2 px-1 text-zinc-500 font-medium whitespace-nowrap">Comisiones</th>
                  <th className="text-center py-2 px-1 text-zinc-500 font-medium whitespace-nowrap">Bonos</th>
                  <th className="text-center py-2 px-1 text-zinc-500 font-medium whitespace-nowrap">Colacion</th>
                  <th className="text-center py-2 px-1 text-zinc-500 font-medium whitespace-nowrap">Movilizacion</th>
                </tr>
              </thead>
              <tbody>
                {empleadosConSueldo.map((emp) => {
                  const id = String(emp.id);
                  const vars = variablesPorEmpleado[id] ?? DEFAULTS_VARIABLES;
                  return (
                    <tr key={id} className="border-t border-zinc-100 hover:bg-zinc-50">
                      <td className="py-2 pr-4 text-zinc-900 font-medium whitespace-nowrap">
                        {String(emp.primer_nombre)} {String(emp.apellido_paterno)}
                      </td>
                      <td className="py-1 px-1">
                        <input type="number" value={vars.dias_trabajados}
                          onChange={(e) => updateVariable(id, "dias_trabajados", Number(e.target.value))}
                          className="w-20 rounded border border-zinc-200 bg-white px-2 py-1 text-center text-sm text-zinc-900 focus:border-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-400" />
                      </td>
                      <td className="py-1 px-1">
                        <input type="number" value={vars.horas_extra_50}
                          onChange={(e) => updateVariable(id, "horas_extra_50", Number(e.target.value))}
                          className="w-20 rounded border border-zinc-200 bg-white px-2 py-1 text-center text-sm text-zinc-900 focus:border-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-400" />
                      </td>
                      <td className="py-1 px-1">
                        <input type="number" value={vars.horas_extra_100}
                          onChange={(e) => updateVariable(id, "horas_extra_100", Number(e.target.value))}
                          className="w-20 rounded border border-zinc-200 bg-white px-2 py-1 text-center text-sm text-zinc-900 focus:border-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-400" />
                      </td>
                      <td className="py-1 px-1">
                        <input type="number" value={vars.comisiones}
                          onChange={(e) => updateVariable(id, "comisiones", Number(e.target.value))}
                          className="w-20 rounded border border-zinc-200 bg-white px-2 py-1 text-center text-sm text-zinc-900 focus:border-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-400" />
                      </td>
                      <td className="py-1 px-1">
                        <input type="number" value={vars.bonos_imponibles}
                          onChange={(e) => updateVariable(id, "bonos_imponibles", Number(e.target.value))}
                          className="w-20 rounded border border-zinc-200 bg-white px-2 py-1 text-center text-sm text-zinc-900 focus:border-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-400" />
                      </td>
                      <td className="py-1 px-1">
                        <input type="number" value={vars.colacion}
                          onChange={(e) => updateVariable(id, "colacion", Number(e.target.value))}
                          className="w-20 rounded border border-zinc-200 bg-white px-2 py-1 text-center text-sm text-zinc-900 focus:border-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-400" />
                      </td>
                      <td className="py-1 px-1">
                        <input type="number" value={vars.movilizacion}
                          onChange={(e) => updateVariable(id, "movilizacion", Number(e.target.value))}
                          className="w-20 rounded border border-zinc-200 bg-white px-2 py-1 text-center text-sm text-zinc-900 focus:border-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-400" />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {resultados.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-zinc-400">
          Presiona &quot;Calcular Todas&quot; para generar las liquidaciones del periodo
        </CardContent></Card>
      ) : (
        <div className="grid grid-cols-3 gap-6">
          {/* Lista de liquidaciones */}
          <div className="col-span-1 space-y-2">
            <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3">
              <p className="text-xs text-zinc-500">Resumen del periodo</p>
              <p className="text-lg font-bold text-zinc-900">{fmt(resultados.reduce((s, r) => s + r.liq.liquido_a_pagar, 0))}</p>
              <p className="text-xs text-zinc-500">{resultados.length} liquidaciones | Costo empresa: {fmt(resultados.reduce((s, r) => s + r.liq.costo_empleador.total, 0))}</p>
            </div>

            {resultados.map((r, i) => (
              <button key={i} onClick={() => setSeleccionado(i)}
                className={`w-full text-left rounded-lg border p-3 transition-colors ${
                  seleccionado === i ? "border-zinc-900 bg-zinc-900 text-white" : "border-zinc-200 hover:bg-zinc-50"
                }`}>
                <p className={`text-sm font-medium ${seleccionado === i ? "text-white" : "text-zinc-900"}`}>
                  {r.liq.empleado_nombre}
                </p>
                <div className="flex justify-between mt-1">
                  <span className={`text-xs ${seleccionado === i ? "text-zinc-300" : "text-zinc-500"}`}>
                    {String(r.emp.cargo)}
                  </span>
                  <span className={`text-sm font-bold ${seleccionado === i ? "text-white" : "text-zinc-900"}`}>
                    {fmt(r.liq.liquido_a_pagar)}
                  </span>
                </div>
              </button>
            ))}
          </div>

          {/* Detalle de liquidacion seleccionada */}
          <div className="col-span-2">
            {sel ? (
              <div className="space-y-4">
                <Card>
                  <CardHeader><CardTitle className="text-base">Haberes - {sel.liq.empleado_nombre}</CardTitle></CardHeader>
                  <CardContent>
                    <table className="w-full text-sm">
                      <thead><tr>
                        <th className="text-left py-1.5 text-zinc-500 font-medium">Concepto</th>
                        <th className="text-center py-1.5 text-zinc-500 font-medium">Tipo</th>
                        <th className="text-right py-1.5 text-zinc-500 font-medium">Monto</th>
                      </tr></thead>
                      <tbody>
                        {sel.liq.haberes.map((h, i) => (
                          <tr key={i} className="border-t border-zinc-100">
                            <td className="py-2">{h.nombre}</td>
                            <td className="py-2 text-center">
                              <span className={`inline-flex rounded-full px-2 py-0.5 text-xs ${
                                h.imponible ? "bg-blue-50 text-blue-700" : "bg-zinc-100 text-zinc-600"
                              }`}>{h.imponible ? "IMP" : "N/I"}</span>
                            </td>
                            <td className="py-2 text-right font-medium">{fmt(h.monto)}</td>
                          </tr>
                        ))}
                        <tr className="border-t-2 border-zinc-300 font-bold">
                          <td className="py-2">Total Haberes</td>
                          <td></td>
                          <td className="py-2 text-right">{fmt(sel.liq.total_haberes)}</td>
                        </tr>
                      </tbody>
                    </table>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader><CardTitle className="text-base">Descuentos</CardTitle></CardHeader>
                  <CardContent>
                    <table className="w-full text-sm">
                      <thead><tr>
                        <th className="text-left py-1.5 text-zinc-500 font-medium">Concepto</th>
                        <th className="text-center py-1.5 text-zinc-500 font-medium">Tipo</th>
                        <th className="text-right py-1.5 text-zinc-500 font-medium">Monto</th>
                      </tr></thead>
                      <tbody>
                        {sel.liq.descuentos.map((d, i) => (
                          <tr key={i} className="border-t border-zinc-100">
                            <td className="py-2">{d.nombre}</td>
                            <td className="py-2 text-center">
                              <span className={`inline-flex rounded-full px-2 py-0.5 text-xs ${
                                d.tipo === "legal" ? "bg-red-50 text-red-700" : "bg-amber-50 text-amber-700"
                              }`}>{d.tipo === "legal" ? "LEG" : "VOL"}</span>
                            </td>
                            <td className="py-2 text-right font-medium text-red-600">-{fmt(d.monto)}</td>
                          </tr>
                        ))}
                        <tr className="border-t-2 border-zinc-300 font-bold">
                          <td className="py-2">Total Descuentos</td>
                          <td></td>
                          <td className="py-2 text-right text-red-600">-{fmt(sel.liq.total_descuentos)}</td>
                        </tr>
                      </tbody>
                    </table>
                  </CardContent>
                </Card>

                <div className="grid grid-cols-3 gap-4">
                  <Card className="border-emerald-200 bg-emerald-50">
                    <CardContent className="p-4 text-center">
                      <p className="text-xs text-emerald-600">Asig. Familiar ({sel.liq.total_cargas} cargas, Tramo {sel.liq.tramo_asignacion_familiar})</p>
                      <p className="text-xl font-bold text-emerald-700">+{fmt(sel.liq.asignacion_familiar)}</p>
                    </CardContent>
                  </Card>
                  <Card className="border-zinc-900 bg-zinc-900">
                    <CardContent className="p-4 text-center">
                      <p className="text-xs text-zinc-400">Liquido a Pagar</p>
                      <p className="text-xl font-bold text-white">{fmt(sel.liq.liquido_a_pagar)}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4 text-center">
                      <p className="text-xs text-zinc-500">Costo Empresa</p>
                      <p className="text-xl font-bold text-zinc-900">{fmt(sel.liq.costo_empleador.total)}</p>
                      <p className="text-xs text-zinc-400">SIS: {fmt(sel.liq.costo_empleador.sis)} | Mutual: {fmt(sel.liq.costo_empleador.mutual)} | AFC: {fmt(sel.liq.costo_empleador.afc_empleador)}</p>
                    </CardContent>
                  </Card>
                </div>

                <Card>
                  <CardHeader><CardTitle className="text-base">Bases de Calculo</CardTitle></CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-4 gap-4 text-sm">
                      <div><p className="text-zinc-500">Renta Imp. AFP</p><p className="font-bold">{fmt(sel.liq.renta_imponible_afp)}</p></div>
                      <div><p className="text-zinc-500">Renta Imp. Salud</p><p className="font-bold">{fmt(sel.liq.renta_imponible_salud)}</p></div>
                      <div><p className="text-zinc-500">Renta Imp. AFC</p><p className="font-bold">{fmt(sel.liq.renta_imponible_afc)}</p></div>
                      <div><p className="text-zinc-500">Base Tributable</p><p className="font-bold">{fmt(sel.liq.base_tributable)}</p><p className="text-xs text-zinc-400">Tramo {sel.liq.tramo_impuesto}</p></div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            ) : (
              <Card><CardContent className="py-20 text-center text-zinc-400">
                Selecciona un colaborador para ver el detalle
              </CardContent></Card>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
