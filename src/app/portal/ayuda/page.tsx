'use client';

import { useState } from 'react';
import {
  HelpCircle,
  Search,
  ChevronDown,
  ChevronUp,
  Briefcase,
  DollarSign,
  Scale,
  Smartphone,
  Mail,
  Phone,
  MessageSquare,
} from 'lucide-react';

interface FAQ {
  question: string;
  answer: string;
}

interface FAQCategory {
  title: string;
  icon: React.ElementType;
  color: string;
  bgColor: string;
  faqs: FAQ[];
}

const faqCategories: FAQCategory[] = [
  {
    title: 'Sobre mi trabajo',
    icon: Briefcase,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    faqs: [
      {
        question: '¿Cuál es mi horario de trabajo?',
        answer:
          'Tu jornada es de Lunes a Viernes, 08:00 a 17:00 (45 hrs semanales). Según tu contrato #PA-2024-001.',
      },
      {
        question: '¿Cómo solicito vacaciones?',
        answer:
          'Ve a Solicitudes → Nueva Solicitud → Vacaciones. Tu empleador recibirá la solicitud y podrá aprobarla.',
      },
      {
        question: '¿Qué hago si me enfermo?',
        answer:
          '1. Avisa a tu empleador via la app\n2. Acude al médico\n3. La licencia médica se procesará automáticamente',
      },
    ],
  },
  {
    title: 'Sobre mi sueldo',
    icon: DollarSign,
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-50',
    faqs: [
      {
        question: '¿Cuándo me pagan?',
        answer:
          'Tu sueldo se paga el último día hábil de cada mes. Puedes ver tus liquidaciones en Mis Liquidaciones.',
      },
      {
        question: '¿Cómo se calcula mi sueldo?',
        answer:
          'Sueldo Base + Gratificación + Bonos - AFP - Salud - Cesantía - Impuesto = Sueldo Líquido',
      },
      {
        question: '¿Qué es AFP y Salud?',
        answer:
          'AFP: Tu ahorro para la jubilación (11.44% de tu sueldo). Salud: Tu cobertura médica via FONASA o ISAPRE.',
      },
    ],
  },
  {
    title: 'Sobre mis derechos',
    icon: Scale,
    color: 'text-violet-600',
    bgColor: 'bg-violet-50',
    faqs: [
      {
        question: '¿Cuántos días de vacaciones tengo?',
        answer:
          '15 días hábiles por año trabajado. Después de 10 años puedes optar a vacaciones progresivas.',
      },
      {
        question: '¿Me pueden despedir sin aviso?',
        answer:
          'No. Tu empleador debe darte 30 días de aviso o pagar una indemnización sustitutiva.',
      },
      {
        question: '¿Tengo derecho a aguinaldo?',
        answer:
          'Sí, en septiembre y diciembre, según lo que establezca tu contrato o la ley.',
      },
    ],
  },
  {
    title: 'Sobre Poppins',
    icon: Smartphone,
    color: 'text-pink-600',
    bgColor: 'bg-pink-50',
    faqs: [
      {
        question: '¿Cómo uso el marcaje horario?',
        answer:
          "Al llegar presiona 'Marcar Entrada'. Al salir presiona 'Marcar Salida'. Esto registra tu asistencia.",
      },
      {
        question: '¿Para qué es la lista de compras?',
        answer:
          'Tu empleador puede crear listas de compras que tú puedes ver, agregar items y marcar como comprados.',
      },
    ],
  },
];

export default function AyudaPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [showContactForm, setShowContactForm] = useState(false);

  const toggleItem = (key: string) => {
    setExpandedItems((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const filteredCategories = faqCategories
    .map((category) => ({
      ...category,
      faqs: category.faqs.filter(
        (faq) =>
          !searchQuery ||
          faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
          faq.answer.toLowerCase().includes(searchQuery.toLowerCase())
      ),
    }))
    .filter((category) => category.faqs.length > 0);

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">Dudas y Ayuda</h1>
        <p className="mt-1 text-sm text-zinc-500">Preguntas frecuentes y soporte</p>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Buscar en las preguntas frecuentes..."
          className="w-full rounded-xl border border-zinc-300 bg-white py-2.5 pl-10 pr-4 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
        />
      </div>

      {/* FAQ Accordion */}
      {filteredCategories.length > 0 ? (
        <div className="space-y-6">
          {filteredCategories.map((category) => {
            const Icon = category.icon;
            return (
              <section key={category.title}>
                <div className="flex items-center gap-2 mb-3">
                  <div
                    className={`flex h-7 w-7 items-center justify-center rounded-lg ${category.bgColor}`}
                  >
                    <Icon className={`h-4 w-4 ${category.color}`} />
                  </div>
                  <h2 className="text-sm font-semibold text-zinc-900">{category.title}</h2>
                </div>

                <div className="space-y-2">
                  {category.faqs.map((faq) => {
                    const key = `${category.title}-${faq.question}`;
                    const isExpanded = expandedItems.has(key);

                    return (
                      <div
                        key={key}
                        className="rounded-xl border border-zinc-200 bg-white overflow-hidden transition-shadow hover:shadow-sm"
                      >
                        <button
                          onClick={() => toggleItem(key)}
                          className="flex w-full items-center justify-between gap-3 p-4 text-left"
                        >
                          <p className="text-sm font-medium text-zinc-900">{faq.question}</p>
                          {isExpanded ? (
                            <ChevronUp className="h-4 w-4 text-zinc-400 shrink-0" />
                          ) : (
                            <ChevronDown className="h-4 w-4 text-zinc-400 shrink-0" />
                          )}
                        </button>

                        {isExpanded && (
                          <div className="border-t border-zinc-100 bg-zinc-50 px-4 py-3">
                            <p className="text-sm text-zinc-700 whitespace-pre-line leading-relaxed">
                              {faq.answer}
                            </p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-zinc-300 bg-zinc-50 p-8 text-center">
          <Search className="mx-auto h-8 w-8 text-zinc-300" />
          <p className="mt-3 text-sm text-zinc-500">
            No se encontraron preguntas que coincidan con &quot;{searchQuery}&quot;
          </p>
        </div>
      )}

      {/* Contact Section */}
      <section className="rounded-xl border border-zinc-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-zinc-900">¿No encuentras lo que buscas?</h2>
        <p className="mt-1 text-sm text-zinc-500">
          Contáctanos y te ayudaremos lo antes posible.
        </p>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="flex items-center gap-3 rounded-lg border border-zinc-200 p-3">
            <Mail className="h-5 w-5 text-zinc-400" />
            <div>
              <p className="text-xs text-zinc-500">Email</p>
              <p className="text-sm font-medium text-zinc-900">soporte@poppins.cl</p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-lg border border-zinc-200 p-3">
            <Phone className="h-5 w-5 text-zinc-400" />
            <div>
              <p className="text-xs text-zinc-500">Teléfono</p>
              <p className="text-sm font-medium text-zinc-900">600 XXX XXXX</p>
            </div>
          </div>
        </div>

        <button
          onClick={() => setShowContactForm(!showContactForm)}
          className="mt-4 flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-emerald-700"
        >
          <MessageSquare className="h-4 w-4" />
          Contactar Soporte
        </button>

        {showContactForm && (
          <div className="mt-4 space-y-3 rounded-xl border border-zinc-200 bg-zinc-50 p-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-700">Asunto</label>
              <input
                type="text"
                placeholder="¿En qué podemos ayudarte?"
                className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-700">Mensaje</label>
              <textarea
                rows={4}
                placeholder="Describe tu duda o problema..."
                className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 resize-none"
              />
            </div>
            <button className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-700">
              Enviar Mensaje
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
