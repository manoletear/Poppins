'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

interface EmployeeFormData {
  first_name: string;
  last_name: string;
  rut: string;
  email: string;
  phone: string;
  hire_date: string;
  role: string;
  department: string;
  contract_type: 'Indefinido' | 'Plazo Fijo' | 'Por Obra';
  base_salary: number;
  bank: string;
  bank_account_type: 'Corriente' | 'Vista' | 'Ahorro';
  bank_account_number: string;
}

function validateRUT(rut: string): boolean {
  const cleaned = rut.replace(/[^0-9k]/gi, '');
  if (cleaned.length < 8) return false;

  const parts = cleaned.split('');
  const verifier = parts.pop()?.toLowerCase();
  const number = parts.join('');

  if (!/^\d+$/.test(number)) return false;

  let sum = 0;
  let multiplier = 2;
  for (let i = number.length - 1; i >= 0; i--) {
    sum += parseInt(number[i]) * multiplier;
    multiplier = multiplier === 7 ? 2 : multiplier + 1;
  }

  const remainder = 11 - (sum % 11);
  let expectedVerifier = remainder === 11 ? '0' : remainder === 10 ? 'k' : remainder.toString();

  return expectedVerifier === verifier;
}

function formatRUT(rut: string): string {
  const cleaned = rut.replace(/[^0-9k]/gi, '');
  if (cleaned.length < 2) return cleaned;

  const verifier = cleaned.slice(-1);
  const number = cleaned.slice(0, -1);

  let formatted = number.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${formatted}-${verifier}`;
}

export default function NuevoColaboradoraPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [formData, setFormData] = useState<EmployeeFormData>({
    first_name: '',
    last_name: '',
    rut: '',
    email: '',
    phone: '',
    hire_date: '',
    role: '',
    department: '',
    contract_type: 'Indefinido',
    base_salary: 0,
    bank: '',
    bank_account_type: 'Corriente',
    bank_account_number: '',
  });

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.first_name.trim()) newErrors.first_name = 'Nombre es requerido';
    if (!formData.last_name.trim()) newErrors.last_name = 'Apellido es requerido';

    if (!formData.rut.trim()) {
      newErrors.rut = 'RUT es requerido';
    } else if (!validateRUT(formData.rut)) {
      newErrors.rut = 'RUT inválido';
    }

    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Email inválido';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;

    if (name === 'rut') {
      const cleaned = value.replace(/[^0-9k]/gi, '');
      setFormData(prev => ({ ...prev, [name]: cleaned }));
      if (errors.rut) setErrors(prev => ({ ...prev, rut: '' }));
    } else if (name === 'base_salary') {
      setFormData(prev => ({ ...prev, [name]: parseInt(value) || 0 }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
      if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/buk/employees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Error al guardar colaboradora');
      }

      alert('Colaboradora creada exitosamente');
      router.push('/dashboard/colaboradoras');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <Link href="/dashboard/colaboradoras" className="p-1.5 hover:bg-gray-100 rounded-lg transition">
          <ArrowLeft size={20} className="text-gray-600" />
        </Link>
        <h1 className="text-xl font-bold text-gray-900">Nueva Colaboradora</h1>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Datos Personales */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Datos Personales</h2>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nombre *
              </label>
              <input
                type="text"
                name="first_name"
                value={formData.first_name}
                onChange={handleChange}
                placeholder="Ej: María"
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F0197A]/20 focus:border-[#F0197A] transition ${
                  errors.first_name ? 'border-red-300' : 'border-gray-300'
                }`}
              />
              {errors.first_name && <p className="text-red-600 text-xs mt-1">{errors.first_name}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Apellido *
              </label>
              <input
                type="text"
                name="last_name"
                value={formData.last_name}
                onChange={handleChange}
                placeholder="Ej: García"
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F0197A]/20 focus:border-[#F0197A] transition ${
                  errors.last_name ? 'border-red-300' : 'border-gray-300'
                }`}
              />
              {errors.last_name && <p className="text-red-600 text-xs mt-1">{errors.last_name}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                RUT *
              </label>
              <input
                type="text"
                name="rut"
                value={formData.rut ? formatRUT(formData.rut) : ''}
                onChange={handleChange}
                placeholder="Ej: 12345678-9"
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F0197A]/20 focus:border-[#F0197A] transition ${
                  errors.rut ? 'border-red-300' : 'border-gray-300'
                }`}
              />
              {errors.rut && <p className="text-red-600 text-xs mt-1">{errors.rut}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="Ej: maria@example.com"
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F0197A]/20 focus:border-[#F0197A] transition ${
                  errors.email ? 'border-red-300' : 'border-gray-300'
                }`}
              />
              {errors.email && <p className="text-red-600 text-xs mt-1">{errors.email}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Teléfono
              </label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                placeholder="Ej: +56912345678"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F0197A]/20 focus:border-[#F0197A] transition"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Fecha de Ingreso
              </label>
              <input
                type="date"
                name="hire_date"
                value={formData.hire_date}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F0197A]/20 focus:border-[#F0197A] transition"
              />
            </div>
          </div>
        </div>

        {/* Datos Laborales */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Datos Laborales</h2>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Cargo
              </label>
              <input
                type="text"
                name="role"
                value={formData.role}
                onChange={handleChange}
                placeholder="Ej: Asistente Administrativo"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F0197A]/20 focus:border-[#F0197A] transition"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Departamento
              </label>
              <input
                type="text"
                name="department"
                value={formData.department}
                onChange={handleChange}
                placeholder="Ej: Administración"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F0197A]/20 focus:border-[#F0197A] transition"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tipo de Contrato
              </label>
              <select
                name="contract_type"
                value={formData.contract_type}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F0197A]/20 focus:border-[#F0197A] transition"
              >
                <option value="Indefinido">Indefinido</option>
                <option value="Plazo Fijo">Plazo Fijo</option>
                <option value="Por Obra">Por Obra</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Sueldo Base
              </label>
              <input
                type="number"
                name="base_salary"
                value={formData.base_salary}
                onChange={handleChange}
                placeholder="Ej: 1500000"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F0197A]/20 focus:border-[#F0197A] transition"
              />
            </div>
          </div>
        </div>

        {/* Datos Bancarios */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Datos Bancarios</h2>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Banco
              </label>
              <input
                type="text"
                name="bank"
                value={formData.bank}
                onChange={handleChange}
                placeholder="Ej: BancoEstado"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F0197A]/20 focus:border-[#F0197A] transition"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tipo de Cuenta
              </label>
              <select
                name="bank_account_type"
                value={formData.bank_account_type}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F0197A]/20 focus:border-[#F0197A] transition"
              >
                <option value="Corriente">Corriente</option>
                <option value="Vista">Vista</option>
                <option value="Ahorro">Ahorro</option>
              </select>
            </div>

            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Número de Cuenta
              </label>
              <input
                type="text"
                name="bank_account_number"
                value={formData.bank_account_number}
                onChange={handleChange}
                placeholder="Ej: 1234567890"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F0197A]/20 focus:border-[#F0197A] transition"
              />
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3 pt-4">
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2.5 bg-[#F0197A] text-white text-sm font-semibold rounded-lg hover:bg-[#d4166c] transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Guardando...' : 'Guardar'}
          </button>
          <Link
            href="/dashboard/colaboradoras"
            className="px-6 py-2.5 bg-gray-100 text-gray-700 text-sm font-semibold rounded-lg hover:bg-gray-200 transition"
          >
            Cancelar
          </Link>
        </div>
      </form>
    </div>
  );
}
