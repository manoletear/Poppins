import Link from 'next/link';
import { Shield, Building2, CircleUser } from 'lucide-react';

const roles = [
  {
    title: 'Administrador',
    href: '/admin',
    icon: Shield,
    gradient: 'from-zinc-900 to-zinc-700',
    badge: 'Admin',
    description:
      'Acceso completo al sistema. Gestión de empleados, liquidaciones, PREVIRED, LRE, finiquitos e indicadores.',
  },
  {
    title: 'Empleador',
    href: '/empresa',
    icon: Building2,
    gradient: 'from-blue-600 to-blue-800',
    badge: 'Empresa',
    description:
      'Gestión de tu empresa. Colaboradores, contratos, liquidaciones, costos y cumplimiento legal.',
  },
  {
    title: 'Empleado',
    href: '/portal',
    icon: CircleUser,
    gradient: 'from-emerald-600 to-emerald-800',
    badge: 'Portal',
    description:
      'Tu portal personal. Mi ficha, liquidaciones, vacaciones, documentos y firma digital.',
  },
];

export default function Home() {
  return (
    <div className="min-h-screen bg-zinc-50 flex flex-col items-center justify-center px-4 py-16">
      <div className="text-center mb-10">
        <h1 className="text-4xl font-bold text-zinc-900">Poppins</h1>
        <p className="text-lg text-zinc-500 mt-2">ERP RRHH Chile 2026</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl w-full">
        {roles.map((role) => {
          const Icon = role.icon;
          return (
            <Link key={role.title} href={role.href}>
              <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm hover:shadow-lg transition-all hover:-translate-y-1 cursor-pointer h-full">
                <div
                  className={`bg-gradient-to-br ${role.gradient} h-12 w-12 rounded-xl flex items-center justify-center mb-4`}
                >
                  <Icon className="h-6 w-6 text-white" />
                </div>
                <span className="inline-flex rounded-full bg-zinc-100 px-2.5 py-0.5 text-[10px] font-semibold uppercase text-zinc-600">
                  {role.badge}
                </span>
                <h2 className="text-lg font-semibold text-zinc-900 mt-3">
                  {role.title}
                </h2>
                <p className="text-sm text-zinc-500 mt-2 leading-relaxed">
                  {role.description}
                </p>
              </div>
            </Link>
          );
        })}
      </div>

      <p className="text-xs text-zinc-400 mt-10">
        Selecciona tu perfil para continuar
      </p>
    </div>
  );
}
