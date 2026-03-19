"use client";

import { useEffect, useState } from "react";
import { Save, Loader2, TrendingUp, RefreshCw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/lib/supabase";

interface Indicador {
  id: number;
  tipo: string;
  fecha: string;
  valor: number;
}

export default function IndicadoresPage() {
  const [indicadores, setIndicadores] = useState<Indicador[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [nuevoTipo, setNuevoTipo] = useState("UF");
  const [nuevaFecha, setNuevaFecha] = useState(new Date().toISOString().split("T")[0]);
  const [nuevoValor, setNuevoValor] = useState("");

  const cargar = async () => {
    const { data } = await supabase
      .from("indicadores_economicos")
      .select("*")
      .order("fecha", { ascending: false })
      .limit(30);
    setIndicadores((data as Indicador[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { cargar(); }, []);

  const guardar = async () => {
    if (!nuevoValor) return;
    setSaving(true);
    await supabase.from("indicadores_economicos").upsert(
      { tipo: nuevoTipo, fecha: nuevaFecha, valor: Number(nuevoValor) },
      { onConflict: "tipo,fecha" }
    );
    setNuevoValor("");
    await cargar();
    setSaving(false);
  };

  const fetchUF = async () => {
    setSaving(true);
    try {
      const res = await fetch("https://mindicador.cl/api/uf");
      const data = await res.json();
      if (data?.serie?.[0]) {
        const uf = data.serie[0];
        const fecha = new Date(uf.fecha).toISOString().split("T")[0];
        const valor = uf.valor;
        await supabase.from("indicadores_economicos").upsert(
          { tipo: "UF", fecha, valor },
          { onConflict: "tipo,fecha" }
        );
        await cargar();
      }
    } catch {
      alert("Error al obtener UF desde mindicador.cl");
    }
    setSaving(false);
  };

  const fmt = (v: number, tipo: string) => {
    if (tipo === "IMM" || tipo === "UTM" || tipo === "UTA") return `$${v.toLocaleString("es-CL")}`;
    return `$${v.toLocaleString("es-CL", { minimumFractionDigits: 2 })}`;
  };

  // Últimos valores por tipo
  const ultimo = (tipo: string) => indicadores.find((i) => i.tipo === tipo);

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-zinc-400" /></div>;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-zinc-900">Indicadores Económicos</h2>
        <p className="text-sm text-zinc-500">UF, UTM, IMM y otros valores para cálculo de liquidaciones</p>
      </div>

      {/* Indicadores actuales */}
      <div className="grid grid-cols-4 gap-4">
        {["UF", "UTM", "IMM", "DOLAR"].map((tipo) => {
          const ind = ultimo(tipo);
          return (
            <Card key={tipo}>
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-zinc-500">{tipo}</p>
                    <p className="text-2xl font-bold text-zinc-900">{ind ? fmt(Number(ind.valor), tipo) : "—"}</p>
                    <p className="text-xs text-zinc-400">{ind?.fecha ?? "Sin datos"}</p>
                  </div>
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                    <TrendingUp className="h-5 w-5" />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Agregar/Actualizar */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center justify-between">
            Agregar / Actualizar Indicador
            <button onClick={fetchUF} disabled={saving}
              className="inline-flex items-center gap-2 rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50">
              <RefreshCw className={`h-3 w-3 ${saving ? "animate-spin" : ""}`} />
              Obtener UF actual
            </button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-4">
            <div className="space-y-1">
              <label className="text-sm font-medium text-zinc-700">Tipo</label>
              <select value={nuevoTipo} onChange={(e) => setNuevoTipo(e.target.value)}
                className="rounded-md border border-zinc-200 px-3 py-2 text-sm">
                <option value="UF">UF</option>
                <option value="UTM">UTM</option>
                <option value="IMM">IMM</option>
                <option value="UTA">UTA</option>
                <option value="DOLAR">Dólar</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-zinc-700">Fecha</label>
              <input type="date" value={nuevaFecha} onChange={(e) => setNuevaFecha(e.target.value)}
                className="rounded-md border border-zinc-200 px-3 py-2 text-sm" />
            </div>
            <div className="space-y-1 flex-1">
              <label className="text-sm font-medium text-zinc-700">Valor</label>
              <input type="number" step="0.01" value={nuevoValor} onChange={(e) => setNuevoValor(e.target.value)}
                placeholder="38726.89" className="w-full rounded-md border border-zinc-200 px-3 py-2 text-sm" />
            </div>
            <button onClick={guardar} disabled={saving || !nuevoValor}
              className="inline-flex items-center gap-2 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Guardar
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Historial */}
      <Card>
        <CardHeader><CardTitle className="text-base">Historial</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-zinc-50">
                <tr>
                  <th className="px-4 py-2 text-left font-medium text-zinc-600">Tipo</th>
                  <th className="px-4 py-2 text-left font-medium text-zinc-600">Fecha</th>
                  <th className="px-4 py-2 text-right font-medium text-zinc-600">Valor</th>
                </tr>
              </thead>
              <tbody>
                {indicadores.map((i) => (
                  <tr key={i.id} className="border-t border-zinc-100">
                    <td className="px-4 py-2">
                      <span className="inline-flex rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">{i.tipo}</span>
                    </td>
                    <td className="px-4 py-2 text-zinc-600">{i.fecha}</td>
                    <td className="px-4 py-2 text-right font-medium">{fmt(Number(i.valor), i.tipo)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
