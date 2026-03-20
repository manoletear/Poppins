'use client';

import { useState, useRef, useEffect } from 'react';
import {
  HeartPulse,
  Send,
  AlertTriangle,
  Bot,
  User,
  Thermometer,
  Brain,
  Bone,
  FileText,
  MapPin,
  Pill,
  Phone,
} from 'lucide-react';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

const INITIAL_MESSAGE: ChatMessage = {
  id: 'welcome',
  role: 'assistant',
  content:
    'Hola María, soy tu asistente de salud Poppins. ¿En qué puedo ayudarte? Puedo orientarte sobre síntomas, licencias médicas, o derivarte a atención profesional.',
  timestamp: new Date(),
};

interface QuickAction {
  label: string;
  icon: React.ElementType;
  color: string;
  bgColor: string;
}

const quickActions: QuickAction[] = [
  { label: 'Me siento mal', icon: Thermometer, color: 'text-red-600', bgColor: 'bg-red-50 hover:bg-red-100 border-red-200' },
  { label: 'Dolor de cabeza', icon: Brain, color: 'text-purple-600', bgColor: 'bg-purple-50 hover:bg-purple-100 border-purple-200' },
  { label: 'Dolor de espalda', icon: Bone, color: 'text-amber-600', bgColor: 'bg-amber-50 hover:bg-amber-100 border-amber-200' },
  { label: 'Consultar licencia médica', icon: FileText, color: 'text-blue-600', bgColor: 'bg-blue-50 hover:bg-blue-100 border-blue-200' },
  { label: 'Centros de salud cercanos', icon: MapPin, color: 'text-emerald-600', bgColor: 'bg-emerald-50 hover:bg-emerald-100 border-emerald-200' },
  { label: 'Mis medicamentos', icon: Pill, color: 'text-pink-600', bgColor: 'bg-pink-50 hover:bg-pink-100 border-pink-200' },
];

const mockResponses: Record<string, string> = {
  'Me siento mal':
    'Lamento que no te sientas bien. ¿Puedes describir tus síntomas? Por ejemplo: dolor, fiebre, mareos, náuseas. Esto me ayudará a orientarte mejor.',
  'Dolor de cabeza':
    'El dolor de cabeza puede tener varias causas. Te recomiendo:\n1. Hidratarte bien (al menos 2 litros de agua al día)\n2. Descansar en un lugar tranquilo\n3. Si persiste más de 48 horas, consulta con tu médico\n\n¿Necesitas que te ayude a solicitar una licencia médica?',
  'Dolor de espalda':
    'El dolor de espalda es común en trabajos domésticos. Recomendaciones:\n1. Evita cargar objetos pesados\n2. Mantén una postura correcta al limpiar\n3. Realiza estiramientos cada 2 horas\n4. Aplica calor local 15 min\n\nSi el dolor es intenso o persistente, solicita una hora médica.',
  'Consultar licencia médica':
    'Para obtener una licencia médica:\n1. Acude a tu centro de salud o médico particular\n2. El médico emitirá la licencia electrónica\n3. Se notificará automáticamente a tu empleador vía Poppins\n4. Tu sueldo será cubierto por FONASA/ISAPRE durante la licencia\n\n¿Quieres que solicite un permiso médico a tu empleador?',
  'Centros de salud cercanos':
    'Centros de salud en Las Condes:\n• CESFAM Carol Urzúa - Av. Las Condes 9500 - Tel: 2 2345 6789\n• Clínica Las Condes - Estoril 450 - Tel: 2 2210 4000\n• Hospital del Trabajador - Ramón Carnicer 185 - Tel: 600 620 2000\n\nRecuerda que como trabajadora de casa particular tienes derecho a FONASA.',
  'Mis medicamentos':
    'Para consultar tus medicamentos activos, necesito acceder a tu historial médico. Por ahora puedo orientarte:\n\n• Si tomas medicamentos recetados, recuerda tomarlos en los horarios indicados\n• No suspendas tratamientos sin consultar a tu médico\n• Puedes retirar medicamentos con receta en farmacias con convenio FONASA\n\n¿Necesitas recordatorios de medicamentos?',
};

const DEFAULT_RESPONSE =
  'Entiendo tu consulta. Te recomiendo que para una evaluación más precisa, consultes con un profesional de salud. ¿Quieres que te muestre los centros de salud cercanos o te ayude a solicitar una licencia médica?';

export default function AyudaMedicaPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([INITIAL_MESSAGE]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const sendMessage = (text: string) => {
    if (!text.trim() || isTyping) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: text.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsTyping(true);

    setTimeout(() => {
      const response = mockResponses[text.trim()] ?? DEFAULT_RESPONSE;
      const botMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, botMessage]);
      setIsTyping(false);
    }, 1500);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  return (
    <div className="mx-auto flex h-[calc(100vh-8rem)] max-w-3xl flex-col">
      {/* Header */}
      <div className="shrink-0 pb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100">
            <HeartPulse className="h-5 w-5 text-emerald-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-zinc-900">Ayuda Médica</h1>
            <p className="text-sm text-zinc-500">
              Asistente de salud con inteligencia artificial
            </p>
          </div>
        </div>

        {/* Warning banner */}
        <div className="mt-4 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3">
          <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
          <p className="text-sm text-amber-800">
            Este asistente no reemplaza la consulta médica profesional. En caso de emergencia,
            llame al <span className="font-bold">131</span>.
          </p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="shrink-0 pb-3">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <button
                key={action.label}
                onClick={() => sendMessage(action.label)}
                disabled={isTyping}
                className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-left text-xs font-medium transition-colors disabled:opacity-50 ${action.bgColor}`}
              >
                <Icon className={`h-4 w-4 shrink-0 ${action.color}`} />
                <span className="text-zinc-700">{action.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto rounded-xl border border-zinc-200 bg-zinc-50 p-4 space-y-4">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
          >
            <div
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                msg.role === 'assistant'
                  ? 'bg-emerald-100'
                  : 'bg-zinc-200'
              }`}
            >
              {msg.role === 'assistant' ? (
                <Bot className="h-4 w-4 text-emerald-600" />
              ) : (
                <User className="h-4 w-4 text-zinc-600" />
              )}
            </div>
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${
                msg.role === 'assistant'
                  ? 'bg-white border border-zinc-200 text-zinc-800'
                  : 'bg-emerald-600 text-white'
              }`}
            >
              <p className="text-sm whitespace-pre-line leading-relaxed">{msg.content}</p>
              <p
                className={`mt-1 text-[10px] ${
                  msg.role === 'assistant' ? 'text-zinc-400' : 'text-emerald-200'
                }`}
              >
                {msg.timestamp.toLocaleTimeString('es-CL', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
            </div>
          </div>
        ))}

        {/* Typing indicator */}
        {isTyping && (
          <div className="flex gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-100">
              <Bot className="h-4 w-4 text-emerald-600" />
            </div>
            <div className="rounded-2xl bg-white border border-zinc-200 px-4 py-3">
              <div className="flex gap-1">
                <span className="h-2 w-2 rounded-full bg-zinc-400 animate-bounce [animation-delay:0ms]" />
                <span className="h-2 w-2 rounded-full bg-zinc-400 animate-bounce [animation-delay:150ms]" />
                <span className="h-2 w-2 rounded-full bg-zinc-400 animate-bounce [animation-delay:300ms]" />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input bar */}
      <form onSubmit={handleSubmit} className="shrink-0 pt-3">
        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Escribe tu consulta de salud..."
            disabled={isTyping}
            className="flex-1 rounded-xl border border-zinc-300 bg-white px-4 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!input.trim() || isTyping}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white transition-colors hover:bg-emerald-700 disabled:opacity-50 disabled:hover:bg-emerald-600"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </form>

      {/* Emergency banner */}
      <div className="shrink-0 mt-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
        <div className="flex items-center gap-2">
          <Phone className="h-4 w-4 text-red-600 shrink-0" />
          <p className="text-xs font-semibold text-red-800">
            Emergencias: 131 (Ambulancia) · 132 (Bomberos) · 133 (Carabineros)
          </p>
        </div>
      </div>
    </div>
  );
}
