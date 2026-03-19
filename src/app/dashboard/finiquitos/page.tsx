"use client";

import { useEffect, useState } from "react";
import { Calculator, Loader2, UserX } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getEmpleados } from "@/lib/supabase-queries";

const CAUSALES = [
  { code: "159-1", label: "Art. 159 N°1 - Mutuo acuerdo", indemniza: false },
  { code: "159-2", label: "Art. 159 N°2 - Renuncia del trabajador", indemniza: false },
  { code: "159-3", label: "Art. 159 N°3 - Muerte del trabajador", indemniza: false },
  { code: "159-4", label: "Art. 159 N°4 - Vencimiento del plazo", indemniza: false },
  { code: "159-5", label: "Art. 159 N°5 - Conclusión del trabajo", indemniza: false },
  { code: "159-6", label: "Art. 159 N°6 - Caso fortuito", indemniza: false },
  { code: "160-1", label: "Art. 160 N°1 - Conductas indebidas graves", indemniza: false },
  { code: "160-3", label: "Art. 160 N°3 - Inasistencia injustificada", indemniza: false },
  { code: "160-7", label: "Art. 160 N°7 - Incumplimiento grave", indemniza: false },
  { code: "161-1", label: "Art. 161 inc.1 - Necesidades de la empresa", indemniza: true },
  { code: "161-2", label: "Art. 161 inc.2 - Desahucio", indemniza: true },
];

export default function FiniquitosPage() {
  const [empleados, setEmpleados] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEmp, setSelectedEmp] = useState("");
  const [causal, setCausal] = useState("159-2");
  const [fechaTermino, setFechaTermino] = useState(new Date().toISOString().split("T")[0]);
  const [diasVacPendientes, setDiasVacPendientes] = useState("0");
  const [avioPrevio, setAvioPrevio] = useState(false);
  const [resultado, setResultado] = useState<Record<string, number> | null>(null);

  useEffect(() => {
    getEmpleados()
      .then(setEmpleados)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const emp = empleados.find((e) => String(e.id) === selectedEmp);
  const causalInfo = CAUSALES.find((c) => c.code === causal);
  const fmt = (n: number) => `$${n.toLocaleString("es-CL")}`;

  const calcular = () => {
    if (!emp) return;

    const sueldoBase = Number(emp.sueldo_base ?? 0);
    const fechaInicio = new Date(String(emp.fecha_inicio_contrato ?? ""));
    const fechaFin = new Date(fechaTermino);
    const valorDia = Math.round(sueldoBase / 30);

    // Antigüedad
    const diffMs = fechaFin.getTime() - fechaInicio.getTime();
    const anosServicio = diffMs / (365.25 * 24 * 60 * 60 * 1000);
    const anosCompletos = Math.floor(anosServicio);

    // Días trabajados mes en curso
    const diaDelMes = fechaFin.getDate();
    const remuneracionPendiente = valorDia * diaDelMes;

    // Gratificación proporcional (meses del año en curso)
    const mesActual = fechaFin.getMonth();
    const gratificacion = Math.round(sueldoBase * 0.25 * (mesActual + 1) / 12);
    const topeGrat = Math.round(500000 * 4.75 / 12 * (mesActual + 1));
    const gratificacionProp = Math.min(gratificacion, topeGrat);

    // Vacaciones pendientes
    const diasVac = Number(diasVacPendientes);
    const montoVacPendientes = diasVac * valorDia;

    // Vacaciones proporcionales (del período en curso)
    const mesesPeriodo = (fechaFin.getMonth() - fechaInicio.getMonth() + 12) % 12 || (anosServicio < 1 ? Math.round(anosServicio * 12) : 0);
    const diasVacProp = Math.round(15 * mesesPeriodo / 12 * 10) / 10;
    const montoVacProp = Math.round(diasVacProp * valorDia);

    // Indemnización (solo Art. 161)
    let indemAviso = 0;
    let indemAnos = 0;
    if (causalInfo?.indemniza) {
      if (!avioPrevio) {
        indemAviso = sueldoBase; // 1 mes
      }
      const mesesIndem = Math.min(anosCompletos, 11); // tope 11 años
      indemAnos = sueldoBase * mesesIndem;
    }

    const totalBruto = remuneracionPendiente + gratificacionProp + montoVacPendientes + montoVacProp + indemAviso + indemAnos;

    setResultado({
      sueldo_base: sueldoBase,
      anos_servicio: anosCompletos,
      dias_trabajados_mes: diaDelMes,
      remuneracion_pendiente: remuneracionPendiente,
      gratificacion_proporcional: gratificacionProp,
      dias_vacaciones_pendientes: diasVac,
      monto_vacaciones_pendientes: montoVacPendientes,
      dias_vacaciones_proporcionales: diasVacProp,
      monto_vacaciones_proporcionales: montoVacProp,
      indemnizacion_aviso_previo: indemAviso,
      meses_indemnizacion: Math.min(anosCompletos, 11),
      indemnizacion_anos_servicio: indemAnos,
      total_bruto: totalBruto,
    });
  };

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-zinc-400" /></div>;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-zinc-900">Simulador de Finiquito</h2>
        <p className="text-sm text-zinc-500">Calcula el finiquito según la causal de término</p>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Formulario */}
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><UserX className="h-4 w-4" />Datos del Finiquito</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1">
              <label className="text-sm font-medium text-zinc-700">Colaborador</label>
              <select value={selectedEmp} onChange={(e) => { setSelectedEmp(e.target.value); setResultado(null); }}
                className="w-full rounded-md border border-zinc-200 px-3 py-2 text-sm">
                <option value="">Seleccionar colaborador...</option>
                {empleados.map((e) => (
                  <option key={String(e.id)} value={String(e.id)}>
                    {String(e.primer_nombre)} {String(e.apellido_paterno)} - {String(e.rut)} ({String(e.cargo ?? "")})
                  </option>
                ))}
              </select>
            </div>

            {emp && (
              <div className="rounded-lg bg-zinc-50 p-3 text-sm space-y-1">
                <p><span className="text-zinc-500">Sueldo:</span> <span className="font-medium">{fmt(Number(emp.sueldo_base))}</span></p>
                <p><span className="text-zinc-500">Contrato:</span> <span className="font-medium">{String(emp.tipo_contrato)}</span> desde {String(emp.fecha_inicio_contrato)}</p>
                <p><span className="text-zinc-500">AFP:</span> {String(emp.afp_nombre)} | <span className="text-zinc-500">Salud:</span> {String(emp.salud_nombre)}</p>
              </div>
            )}

            <div className="space-y-1">
              <label className="text-sm font-medium text-zinc-700">Causal de Término</label>
              <select value={causal} onChange={(e) => { setCausal(e.target.value); setResultado(null); }}
                className="w-full rounded-md border border-zinc-200 px-3 py-2 text-sm">
                {CAUSALES.map((c) => (
                  <option key={c.code} value={c.code}>{c.label}</option>
                ))}
              </select>
              {causalInfo && (
                <p className={`text-xs mt-1 ${causalInfo.indemniza ? "text-amber-600" : "text-zinc-400"}`}>
                  {causalInfo.indemniza ? "Con derecho a indemnización por años de servicio" : "Sin indemnización"}
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-sm font-medium text-zinc-700">Fecha Término</label>
                <input type="date" value={fechaTermino} onChange={(e) => { setFechaTermino(e.target.value); setResultado(null); }}
                  className="w-full rounded-md border border-zinc-200 px-3 py-2 text-sm" />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-zinc-700">Días Vacaciones Pendientes</label>
                <input type="number" value={diasVacPendientes} onChange={(e) => { setDiasVacPendientes(e.target.value); setResultado(null); }}
                  className="w-full rounded-md border border-zinc-200 px-3 py-2 text-sm" />
              </div>
            </div>

            {causalInfo?.indemniza && (
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={avioPrevio} onChange={(e) => { setAvioPrevio(e.target.checked); setResultado(null); }}
                  className="rounded border-zinc-300" />
                Se dio aviso previo de 30 días (no paga indemnización sustitutiva)
              </label>
            )}

            <button onClick={calcular} disabled={!selectedEmp}
              className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50">
              <Calculator className="h-4 w-4" />
              Calcular Finiquito
            </button>
          </CardContent>
        </Card>

        {/* Resultado */}
        {resultado ? (
          <div className="space-y-4">
            <Card>
              <CardHeader><CardTitle className="text-base">Detalle del Finiquito</CardTitle></CardHeader>
              <CardContent>
                <table className="w-full text-sm">
                  <tbody>
                    <tr className="border-b border-zinc-100">
                      <td className="py-2.5 text-zinc-500">Antigüedad</td>
                      <td className="py-2.5 text-right font-medium">{resultado.anos_servicio} años</td>
                    </tr>
                    <tr className="border-b border-zinc-100">
                      <td className="py-2.5 text-zinc-500">Remuneración pendiente ({resultado.dias_trabajados_mes} días)</td>
                      <td className="py-2.5 text-right font-medium">{fmt(resultado.remuneracion_pendiente)}</td>
                    </tr>
                    <tr className="border-b border-zinc-100">
                      <td className="py-2.5 text-zinc-500">Gratificación proporcional</td>
                      <td className="py-2.5 text-right font-medium">{fmt(resultado.gratificacion_proporcional)}</td>
                    </tr>
                    <tr className="border-b border-zinc-100">
                      <td className="py-2.5 text-zinc-500">Vacaciones pendientes ({resultado.dias_vacaciones_pendientes} días)</td>
                      <td className="py-2.5 text-right font-medium">{fmt(resultado.monto_vacaciones_pendientes)}</td>
                    </tr>
                    <tr className="border-b border-zinc-100">
                      <td className="py-2.5 text-zinc-500">Vacaciones proporcionales ({resultado.dias_vacaciones_proporcionales} días)</td>
                      <td className="py-2.5 text-right font-medium">{fmt(resultado.monto_vacaciones_proporcionales)}</td>
                    </tr>
                    {resultado.indemnizacion_aviso_previo > 0 && (
                      <tr className="border-b border-zinc-100 bg-amber-50">
                        <td className="py-2.5 text-amber-700 px-2">Indemnización aviso previo (1 mes)</td>
                        <td className="py-2.5 text-right font-medium text-amber-700 px-2">{fmt(resultado.indemnizacion_aviso_previo)}</td>
                      </tr>
                    )}
                    {resultado.indemnizacion_anos_servicio > 0 && (
                      <tr className="border-b border-zinc-100 bg-amber-50">
                        <td className="py-2.5 text-amber-700 px-2">Indemnización años servicio ({resultado.meses_indemnizacion} meses, tope 11)</td>
                        <td className="py-2.5 text-right font-medium text-amber-700 px-2">{fmt(resultado.indemnizacion_anos_servicio)}</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </CardContent>
            </Card>

            <Card className="border-zinc-900 bg-zinc-900">
              <CardContent className="p-6 text-center">
                <p className="text-sm text-zinc-400">Total Finiquito Bruto</p>
                <p className="text-3xl font-bold text-white mt-1">{fmt(resultado.total_bruto)}</p>
                <p className="text-xs text-zinc-500 mt-2">Causal: {causalInfo?.label}</p>
              </CardContent>
            </Card>
          </div>
        ) : (
          <Card>
            <CardContent className="py-20 text-center text-zinc-400">
              Selecciona un colaborador y calcula el finiquito
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
