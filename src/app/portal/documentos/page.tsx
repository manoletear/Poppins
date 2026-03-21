'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { FileText, Receipt, Award, Download, Search, ChevronDown, CheckCircle, Clock, FolderOpen } from 'lucide-react';

// Matches actual `documentos_empleado` table columns
interface DocType {
  id: string;
  trabajador_id: string;
  tipo: string;
  nombre: string;
  archivo_url: string | null;
  firmado: boolean;
  fecha_firma: string | null;
  created_at: string;
  [key: string]: unknown;
}

const WORKER_ID = 'c711d829-4a6d-4496-a93b-221b81eb1258';

type FilterTab = 'todos' | 'contrato' | 'liquidacion' | 'certificado';

function getDocIcon(tipo: string) {
  switch (tipo.toLowerCase()) {
    case 'contrato': return <FileText size={20} className="text-blue-500" />;
    case 'liquidacion': return <Receipt size={20} className="text-emerald-500" />;
    case 'certificado': return <Award size={20} className="text-amber-500" />;
    default: return <FileText size={20} className="text-gray-400" />;
  }
}

function getTipoBadge(tipo: string) {
  const colors: Record<string, string> = {
    contrato: 'bg-blue-100 text-blue-700',
    liquidacion: 'bg-emerald-100 text-emerald-700',
    certificado: 'bg-amber-100 text-amber-700',
  };
  return colors[tipo.toLowerCase()] || 'bg-gray-100 text-gray-600';
}

export default function MisDocumentosPage() {
  const [documents, setDocuments] = useState<DocType[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<FilterTab>('todos');
  const [showCertDropdown, setShowCertDropdown] = useState(false);
  const [solicitudEnviada, setSolicitudEnviada] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    async function load() {
      const { data } = await supabase
        .from('documentos_empleado')
        .select('*')
        .eq('trabajador_id', WORKER_ID)
        .order('created_at', { ascending: false });
      setDocuments(data || []);
      setLoading(false);
    }
    load();
  }, []);

  const filters: { id: FilterTab; label: string }[] = [
    { id: 'todos', label: 'Todos' },
    { id: 'contrato', label: 'Contratos' },
    { id: 'liquidacion', label: 'Liquidaciones' },
    { id: 'certificado', label: 'Certificados' },
  ];

  const filtered = activeFilter === 'todos'
    ? documents
    : documents.filter(d => d.tipo.toLowerCase() === activeFilter);

  const handleSolicitarCertificado = (tipo: string) => {
    setSolicitudEnviada(tipo);
    setShowCertDropdown(false);
    setTimeout(() => setSolicitudEnviada(null), 3000);
  };

  const handleDescargar = (doc: DocType) => {
    if (doc.archivo_url) {
      window.open(doc.archivo_url, '_blank');
    }
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  return (
    <div className="space-y-6 p-4 lg:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Mis Documentos</h1>
          <p className="text-sm text-gray-500 mt-1">Contratos, certificados y liquidaciones</p>
        </div>

        {/* Solicitar Certificado */}
        <div className="relative">
          <button
            onClick={() => setShowCertDropdown(!showCertDropdown)}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white text-sm font-medium rounded-lg hover:bg-emerald-600 transition"
          >
            <Award size={16} />
            Solicitar Certificado
            <ChevronDown size={14} />
          </button>
          {showCertDropdown && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowCertDropdown(false)} />
              <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-lg border border-gray-100 z-50 overflow-hidden">
                {[
                  'Certificado de Antiguedad',
                  'Certificado de Renta',
                  'Certificado AFP',
                ].map(cert => (
                  <button
                    key={cert}
                    onClick={() => handleSolicitarCertificado(cert)}
                    className="w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition border-b border-gray-50 last:border-0"
                  >
                    {cert}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Solicitud confirmation */}
      {solicitudEnviada && (
        <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-3">
          <CheckCircle size={18} className="text-emerald-500 shrink-0" />
          <span className="text-sm text-emerald-800">
            Solicitud de <strong>{solicitudEnviada}</strong> enviada exitosamente. Sera notificado cuando este disponible.
          </span>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 w-fit">
        {filters.map(f => (
          <button
            key={f.id}
            onClick={() => setActiveFilter(f.id)}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition ${
              activeFilter === f.id
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-sm text-gray-400">Cargando documentos...</div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
          <FolderOpen size={48} className="text-gray-300 mx-auto mb-3" />
          <div className="font-semibold text-gray-500">No hay documentos disponibles</div>
          <p className="text-sm text-gray-400 mt-1">
            {activeFilter !== 'todos'
              ? `No se encontraron documentos de tipo "${activeFilter}".`
              : 'Aun no tiene documentos registrados.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(doc => (
            <div
              key={doc.id}
              className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition"
            >
              <div className="flex items-start gap-3">
                <div className="p-2 bg-gray-50 rounded-lg shrink-0">
                  {getDocIcon(doc.tipo)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-gray-900 text-sm truncate">{doc.nombre}</div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${getTipoBadge(doc.tipo)}`}>
                      {doc.tipo}
                    </span>
                    {doc.firmado ? (
                      <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-600">
                        <CheckCircle size={12} />
                        Firmado
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-[11px] font-semibold text-amber-600">
                        <Clock size={12} />
                        Pendiente firma
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-gray-400 mt-2">{formatDate(doc.created_at)}</div>
                </div>
              </div>
              <button
                onClick={() => handleDescargar(doc)}
                className="w-full mt-4 flex items-center justify-center gap-2 py-2 rounded-lg bg-gray-50 text-sm font-medium text-gray-600 hover:bg-gray-100 transition"
              >
                <Download size={14} />
                Descargar
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
