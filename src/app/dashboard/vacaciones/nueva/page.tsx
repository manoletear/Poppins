'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useEmployees } from '@/hooks/useBuk';
import { ArrowLeft } from 'lucide-react';

interface VacationFormData {
  employee_id: number | '';
  start_date: string;
  end_date: string;
  vacation_type: 'Legal' | 'Progresivas' | 'Adicionales';
  observations: string;
}

function calculateDays(startDate: string, endDate: string): number {
  if (!startDate || !endDate) return 0;

  const start = new Date(startDate);
  const end = new Date(endDate);

  if (end < start) return 0;

  const diffTime = Math.abs(end.getTime() - start.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

  return diffDays;
}

export default function NuevaVacacionPage() {
  const router = useRouter();
  const { data: employees, loading: empLoading } = useEmployees();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [formData, setFormData] = useState<VacationFormData>({
    employee_id: '',
    start_date: '',
    end_date: '',
    vacation_type: 'Legal',
    observations: '',
  });

  const days = calculateDays(formData.start_date, formData.end_date);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.employee_id) newErrors.employee_id = 'Colaboradora es requerida';
    if (!formData.start_date) newErrors.start_date = 'Fecha de inicio es requerida';
    if (!formData.end_date) newErrors.end_date = 'Fecha de término es requerida';

    if (formData.start_date && formData.end_date) {
      const start = new Date(formData.start_date);
      const end = new Date(formData.end_date);
      if (end < start) {
        newErrors.end_date = 'Fecha de término debe ser posterior a la de inicio';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;

    if (name === 'employee_id') {
      setFormData(prev => ({ ...prev, [name]: value ? parseInt(value) : '' }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }

    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setLoading(true);
    setError('');

    try {
      const payload = {
        employee_id: formData.employee_id,
        start_date: formData.start_date,
        end_date: formData.end_date,
        vacation_type: formData.vacation_type,
        observations: formData.observations,
        days,
      };

      const response = await fetch('/api/buk/vacations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Error al crear solicitud de vacaciones');
      }

      alert('Solicitud de vacaciones creada exitosamente');
      router.push('/dashboard/vacaciones');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <Link href="/dashboard/vacaciones" className="p-1.5 hover:bg-gray-100 rounded-lg transition">
          <ArrowLeft size={20} className="text-gray-600" />
        </Link>
        <h1 className="text-xl font-bold text-gray-900">Nueva Solicitud de Vacaciones</h1>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-4">
          {/* Empleada */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Colaboradora *
            </label>
            {empLoading ? (
              <div className="text-sm text-gray-400">Cargando colaboradoras...</div>
            ) : (
              <select
                name="employee_id"
                value={formData.employee_id}
                onChange={handleChange}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F0197A]/20 focus:border-[#F0197A] transition ${
                  errors.employee_id ? 'border-red-300' : 'border-gray-300'
                }`}
              >
                <option value="">Seleccionar colaboradora...</option>
                {employees.map(emp => (
                  <option key={emp.id} value={emp.id}>
                    {emp.nombreCompleto}
                  </option>
                ))}
              </select>
            )}
            {errors.employee_id && <p className="text-red-600 text-xs mt-1">{errors.employee_id}</p>}
          </div>

          {/* Tipo de Vacaciones */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tipo de Vacaciones
            </label>
            <select
              name="vacation_type"
              value={formData.vacation_type}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F0197A]/20 focus:border-[#F0197A] transition"
            >
              <option value="Legal">Legal</option>
              <option value="Progresivas">Progresivas</option>
              <option value="Adicionales">Adicionales</option>
            </select>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Fecha de Inicio *
              </label>
              <input
                type="date"
                name="start_date"
                value={formData.start_date}
                onChange={handleChange}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F0197A]/20 focus:border-[#F0197A] transition ${
                  errors.start_date ? 'border-red-300' : 'border-gray-300'
                }`}
              />
              {errors.start_date && <p className="text-red-600 text-xs mt-1">{errors.start_date}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Fecha de Término *
              </label>
              <input
                type="date"
                name="end_date"
                value={formData.end_date}
                onChange={handleChange}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F0197A]/20 focus:border-[#F0197A] transition ${
                  errors.end_date ? 'border-red-300' : 'border-gray-300'
                }`}
              />
              {errors.end_date && <p className="text-red-600 text-xs mt-1">{errors.end_date}</p>}
            </div>
          </div>

          {/* Days Display */}
          {days > 0 && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-700 font-medium">
                Días solicitados: <span className="font-bold">{days}</span>
              </p>
            </div>
          )}

          {/* Observaciones */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Observaciones
            </label>
            <textarea
              name="observations"
              value={formData.observations}
              onChange={handleChange}
              placeholder="Agregar notas adicionales (opcional)"
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F0197A]/20 focus:border-[#F0197A] transition resize-none"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3 pt-4">
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2.5 bg-[#F0197A] text-white text-sm font-semibold rounded-lg hover:bg-[#d4166c] transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Creando...' : 'Crear Solicitud'}
          </button>
          <Link
            href="/dashboard/vacaciones"
            className="px-6 py-2.5 bg-gray-100 text-gray-700 text-sm font-semibold rounded-lg hover:bg-gray-200 transition"
          >
            Cancelar
          </Link>
        </div>
      </form>
    </div>
  );
}
