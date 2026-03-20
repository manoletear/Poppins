'use client';

import { useState } from 'react';
import { Clock, Calendar, ChevronLeft, ChevronRight, AlertCircle } from 'lucide-react';

const marcajesHoy = [
  {
    nombre: 'María López',
    labor: 'Nana',
    entrada: '08:02',
    salida: null,
    horas: '4h 15m',
    estado: 'En turno',
    estadoColor: 'bg-emerald-50 text-emerald-700',
  },
  {
    nombre: 'Juan Pérez',
    labor: 'Jardinero',
    entrada: '08:30',
    salida: '13:05',
    horas: '4h 35m',
    estado: 'Completado',
    estadoColor: 'bg-zinc-100 text-zinc-700',
  },
  {
    nombre: 'Pedro Soto',
    labor: 'Piscinero',
    entrada: null,
    salida: null,
    horas: '-',
    estado: 'Sin marcar',
    estadoColor: 'bg-red-50 text-red-700',
  },
];

const resumenSemanal = [
  { nombre: 'María López', horas: 38.5, total: 45, porcentaje: 85 },
  { nombre: 'Juan Pérez', horas: 14, total: 15, porcentaje: 93 },
  { nombre: 'Pedro Soto', horas: 6, total: 8, porcentaje: 75 },
];

const ausencias = [
  {
    nombre: 'María López',
    dias: 1,
    detalle: 'Permiso médico, 18 Mar',
    estado: 'Aprobado',
    estadoColor: 'bg-emerald-50 text-emerald-700',
  },
  { nombre: 'Juan Pérez', dias: 0, detalle: null, estado: null, estadoColor: null },
  { nombre: 'Pedro Soto', dias: 0, detalle: null, estado: null, estadoColor: null },
];

export default function HorariosPage() {
  const [fecha] = useState('20 de Marzo, 2026');

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Control de Horarios</h1>
          <p className="text-sm text-zinc-500 mt-1">Marcaje digital de entrada y salida</p>
        </div>
        <div className="inline-flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-700">
          <Calendar className="h-4 w-4 text-zinc-400" />
          <button className="hover:text-zinc-900">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="font-medium">{fecha}</span>
          <button className="hover:text-zinc-900">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Marcajes table */}
      <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-100 bg-zinc-50">
                <th className="px-4 py-3 text-left font-medium text-zinc-500">Empleado</th>
                <th className="px-4 py-3 text-left font-medium text-zinc-500">Labor</th>
                <th className="px-4 py-3 text-left font-medium text-zinc-500">Entrada</th>
                <th className="px-4 py-3 text-left font-medium text-zinc-500">Salida</th>
                <th className="px-4 py-3 text-left font-medium text-zinc-500">Horas</th>
                <th className="px-4 py-3 text-left font-medium text-zinc-500">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {marcajesHoy.map((m) => (
                <tr key={m.nombre} className="hover:bg-zinc-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-zinc-900">{m.nombre}</td>
                  <td className="px-4 py-3 text-zinc-600">{m.labor}</td>
                  <td className="px-4 py-3 text-zinc-600">{m.entrada ?? '-'}</td>
                  <td className="px-4 py-3 text-zinc-600">{m.salida ?? '-'}</td>
                  <td className="px-4 py-3 text-zinc-600">{m.horas}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${m.estadoColor}`}
                    >
                      {m.estado}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Resumen Semanal */}
      <div>
        <h2 className="text-lg font-semibold text-zinc-900 mb-1">Resumen Semanal</h2>
        <p className="text-sm text-zinc-500 mb-4">16 - 20 Mar 2026</p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {resumenSemanal.map((r) => (
            <div
              key={r.nombre}
              className="rounded-xl border border-zinc-200 bg-white p-4"
            >
              <p className="text-sm font-medium text-zinc-900">{r.nombre}</p>
              <p className="text-xs text-zinc-500 mt-1">
                {r.horas} hrs de {r.total} hrs
              </p>
              <div className="mt-3 h-2 w-full rounded-full bg-zinc-100">
                <div
                  className="h-2 rounded-full bg-emerald-500 transition-all"
                  style={{ width: `${r.porcentaje}%` }}
                />
              </div>
              <p className="text-xs text-zinc-400 mt-1 text-right">{r.porcentaje}%</p>
            </div>
          ))}
        </div>
      </div>

      {/* Ausencias del Mes */}
      <div>
        <h2 className="text-lg font-semibold text-zinc-900 mb-4">Ausencias del Mes</h2>
        <div className="space-y-3">
          {ausencias.map((a) => (
            <div
              key={a.nombre}
              className="flex items-center justify-between rounded-lg border border-zinc-200 bg-white px-4 py-3"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-100">
                  <AlertCircle className="h-4 w-4 text-zinc-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-zinc-900">{a.nombre}</p>
                  <p className="text-xs text-zinc-500">
                    {a.dias === 0
                      ? '0 días'
                      : `${a.dias} día${a.dias > 1 ? 's' : ''} (${a.detalle})`}
                  </p>
                </div>
              </div>
              {a.estado && (
                <span
                  className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${a.estadoColor}`}
                >
                  {a.estado}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
