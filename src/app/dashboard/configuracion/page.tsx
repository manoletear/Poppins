'use client';

export default function ConfiguracionPage() {
  return (
    <div className="space-y-5">
      <h1 className="text-xl font-bold text-gray-900">Configuración</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* BUK Connection */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 space-y-4">
          <div className="flex items-center gap-3">
            <span className="text-xl">🔗</span>
            <div>
              <div className="font-semibold text-gray-800">Conexión BUK</div>
              <div className="text-xs text-gray-400">Estado de la integración con BUK API</div>
            </div>
          </div>
          <div className="space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-gray-500">API Base URL</span>
              <code className="text-xs bg-gray-100 px-2 py-1 rounded">https://app.buk.cl/api/v1</code>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-500">Modo</span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">Mock Data</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-500">Endpoints</span>
              <span className="text-gray-700 font-medium">4 activos</span>
            </div>
          </div>
          <div className="text-xs text-gray-400 bg-gray-50 rounded-lg p-3">
            Para conectar con BUK real, configura <code className="bg-gray-200 px-1 rounded">BUK_API_TOKEN</code> en <code className="bg-gray-200 px-1 rounded">.env.local</code> y cambia <code className="bg-gray-200 px-1 rounded">USE_MOCK_DATA=false</code>
          </div>
        </div>

        {/* Company Info */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 space-y-4">
          <div className="flex items-center gap-3">
            <span className="text-xl">🏠</span>
            <div>
              <div className="font-semibold text-gray-800">Datos del Empleador</div>
              <div className="text-xs text-gray-400">Información del hogar empleador</div>
            </div>
          </div>
          <div className="space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-gray-500">Nombre</span>
              <span className="text-gray-700 font-medium">Rene Aravena</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-500">RUT Empleador</span>
              <span className="text-gray-700 font-medium">12.345.678-9</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-500">Plan</span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-[#F0197A]/10 text-[#F0197A]">Premium</span>
            </div>
          </div>
        </div>

        {/* Notifications */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 space-y-4">
          <div className="flex items-center gap-3">
            <span className="text-xl">🔔</span>
            <div>
              <div className="font-semibold text-gray-800">Notificaciones</div>
              <div className="text-xs text-gray-400">Alertas y recordatorios</div>
            </div>
          </div>
          <div className="space-y-3 text-sm">
            {[
              { label: 'Vencimiento de contratos', checked: true },
              { label: 'Solicitudes de vacaciones', checked: true },
              { label: 'Liquidaciones listas', checked: false },
              { label: 'Alertas de cumplimiento', checked: true },
            ].map((n, i) => (
              <label key={i} className="flex items-center justify-between cursor-pointer">
                <span className="text-gray-600">{n.label}</span>
                <div className={`w-9 h-5 rounded-full transition-colors ${n.checked ? 'bg-[#F0197A]' : 'bg-gray-200'} relative`}>
                  <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${n.checked ? 'left-[18px]' : 'left-0.5'}`} />
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* About */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#F0197A] rounded-[10px] flex items-center justify-center text-xl">☂️</div>
            <div>
              <div className="font-semibold text-gray-800">Poppins ERP Doméstico</div>
              <div className="text-xs text-gray-400">v0.2.0 · Fase 2</div>
            </div>
          </div>
          <p className="text-xs text-gray-400 leading-relaxed">
            Plataforma de gestión de colaboradoras domésticas con integración BUK API.
            Diseñado para simplificar la administración de nanas, cuidadoras y personal doméstico
            cumpliendo con la normativa laboral chilena.
          </p>
        </div>
      </div>
    </div>
  );
}
