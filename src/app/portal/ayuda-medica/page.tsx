'use client';

import { useState, useRef, useEffect, useCallback, Fragment } from 'react';
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
  Phone,
  MessageSquarePlus,
  PanelLeftOpen,
  PanelLeftClose,
  ThumbsUp,
  ThumbsDown,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface ConversationSummary {
  id: string;
  titulo: string;
  ultimo_mensaje: string;
  timestamp: string;
}

interface QuickAction {
  label: string;
  icon: React.ElementType;
  color: string;
  bgColor: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const WELCOME_MESSAGE: ChatMessage = {
  id: 'welcome',
  role: 'assistant',
  content:
    'Hola María, soy Poppins Salud, tu asistente médico. ¿En qué puedo ayudarte hoy?',
  timestamp: new Date(),
};

const quickActions: QuickAction[] = [
  {
    label: 'Me siento mal',
    icon: Thermometer,
    color: 'text-red-600',
    bgColor: 'bg-red-50 hover:bg-red-100 border-red-200',
  },
  {
    label: 'Dolor de cabeza',
    icon: Brain,
    color: 'text-purple-600',
    bgColor: 'bg-purple-50 hover:bg-purple-100 border-purple-200',
  },
  {
    label: 'Dolor de espalda',
    icon: Bone,
    color: 'text-orange-600',
    bgColor: 'bg-orange-50 hover:bg-orange-100 border-orange-200',
  },
  {
    label: 'Licencia médica',
    icon: FileText,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50 hover:bg-blue-100 border-blue-200',
  },
  {
    label: 'Centros de salud',
    icon: MapPin,
    color: 'text-green-600',
    bgColor: 'bg-green-50 hover:bg-green-100 border-green-200',
  },
  {
    label: 'Emergencia',
    icon: Phone,
    color: 'text-red-600',
    bgColor: 'bg-red-50 hover:bg-red-100 border-red-200',
  },
];

// ---------------------------------------------------------------------------
// Markdown-like renderer
// ---------------------------------------------------------------------------

function renderFormattedContent(raw: string) {
  const lines = raw.split('\n');
  const elements: React.ReactNode[] = [];
  let listBuffer: { type: 'ul' | 'ol'; items: React.ReactNode[] } | null = null;

  const flushList = () => {
    if (!listBuffer) return;
    if (listBuffer.type === 'ul') {
      elements.push(
        <ul key={`ul-${elements.length}`} className="my-1 list-disc pl-5 space-y-0.5">
          {listBuffer.items.map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ul>,
      );
    } else {
      elements.push(
        <ol key={`ol-${elements.length}`} className="my-1 list-decimal pl-5 space-y-0.5">
          {listBuffer.items.map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ol>,
      );
    }
    listBuffer = null;
  };

  const inlineFormat = (text: string): React.ReactNode => {
    // Bold: **text**
    const parts = text.split(/(\*\*[^*]+\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={i}>{part.slice(2, -2)}</strong>;
      }
      return <Fragment key={i}>{part}</Fragment>;
    });
  };

  const wrapSpecialLine = (
    line: string,
    key: number,
    content: React.ReactNode,
  ): React.ReactNode => {
    if (line.includes('\u{1F6A8}')) {
      return (
        <p key={key} className="my-1 rounded-lg bg-red-50 px-2 py-1 text-red-800">
          {content}
        </p>
      );
    }
    if (line.includes('\u26A0\uFE0F')) {
      return (
        <p key={key} className="my-1 rounded-lg bg-amber-50 px-2 py-1 text-amber-800">
          {content}
        </p>
      );
    }
    if (line.includes('\u2695\uFE0F')) {
      return (
        <p key={key} className="my-1 italic text-blue-700">
          {content}
        </p>
      );
    }
    return null;
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Blank line
    if (trimmed === '') {
      flushList();
      elements.push(<div key={`br-${i}`} className="h-1" />);
      continue;
    }

    // Bullet point (• or -)
    const bulletMatch = trimmed.match(/^[•\-]\s+(.*)/);
    if (bulletMatch) {
      if (!listBuffer || listBuffer.type !== 'ul') {
        flushList();
        listBuffer = { type: 'ul', items: [] };
      }
      listBuffer.items.push(inlineFormat(bulletMatch[1]));
      continue;
    }

    // Numbered list
    const numMatch = trimmed.match(/^(\d+)\.\s+(.*)/);
    if (numMatch) {
      if (!listBuffer || listBuffer.type !== 'ol') {
        flushList();
        listBuffer = { type: 'ol', items: [] };
      }
      listBuffer.items.push(inlineFormat(numMatch[2]));
      continue;
    }

    // Not a list item — flush any pending list
    flushList();

    const formatted = inlineFormat(trimmed);
    const special = wrapSpecialLine(trimmed, i, formatted);
    if (special) {
      elements.push(special);
    } else {
      elements.push(
        <p key={i} className="my-0.5">
          {formatted}
        </p>,
      );
    }
  }

  flushList();

  return <div className="text-sm leading-relaxed">{elements}</div>;
}

// ---------------------------------------------------------------------------
// Typing indicator
// ---------------------------------------------------------------------------

function TypingIndicator() {
  return (
    <div className="flex gap-3">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-100">
        <Bot className="h-4 w-4 text-emerald-600" />
      </div>
      <div className="rounded-2xl rounded-bl-sm border border-zinc-200 bg-zinc-100 px-4 py-3">
        <div className="flex gap-1.5">
          <span className="h-2 w-2 rounded-full bg-zinc-400 animate-bounce [animation-delay:0ms]" />
          <span className="h-2 w-2 rounded-full bg-zinc-400 animate-bounce [animation-delay:150ms]" />
          <span className="h-2 w-2 rounded-full bg-zinc-400 animate-bounce [animation-delay:300ms]" />
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main page component
// ---------------------------------------------------------------------------

export default function AyudaMedicaPage() {
  // State
  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME_MESSAGE]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [feedbackGiven, setFeedbackGiven] = useState<Record<string, 'up' | 'down'>>({});

  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // ------- Helpers -------

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping, scrollToBottom]);

  // ------- Load conversation list on mount -------

  const loadConversations = useCallback(async () => {
    try {
      const res = await fetch('/api/chat/medical');
      if (res.ok) {
        const data = await res.json();
        setConversations(data.conversations ?? data ?? []);
      }
    } catch {
      // silently ignore – sidebar will just be empty
    }
  }, []);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  // ------- Load a specific conversation -------

  const loadConversation = async (convId: string) => {
    try {
      const res = await fetch(`/api/chat/medical?conversationId=${convId}`);
      if (res.ok) {
        const data = await res.json();
        const loaded: ChatMessage[] = (data.messages ?? []).map(
          (m: { id?: string; role: string; content: string; timestamp?: string }) => ({
            id: m.id ?? crypto.randomUUID(),
            role: m.role as 'user' | 'assistant',
            content: m.content,
            timestamp: m.timestamp ? new Date(m.timestamp) : new Date(),
          }),
        );
        setMessages(loaded.length > 0 ? loaded : [WELCOME_MESSAGE]);
        setConversationId(convId);
        setShowHistory(false);
      }
    } catch {
      // ignore
    }
  };

  // ------- Start new conversation -------

  const startNewConversation = () => {
    setMessages([{ ...WELCOME_MESSAGE, timestamp: new Date() }]);
    setConversationId(null);
    setFeedbackGiven({});
    setShowHistory(false);
    inputRef.current?.focus();
  };

  // ------- Send message -------

  const sendMessage = async (text: string) => {
    if (!text.trim() || isTyping) return;

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: text.trim(),
      timestamp: new Date(),
    };

    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInput('');
    setIsTyping(true);

    try {
      const response = await fetch('/api/chat/medical', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage.content,
          conversationId,
          history: updatedMessages.map((m) => ({ role: m.role, content: m.content })),
        }),
      });

      const data = await response.json();

      if (data.conversationId) {
        setConversationId(data.conversationId);
      }

      const assistantMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: data.response ?? 'Lo siento, hubo un error al procesar tu consulta.',
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);

      // Refresh sidebar
      loadConversations();
    } catch {
      const errorMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content:
          'Lo siento, no pude conectarme al servidor. Por favor intenta de nuevo en unos momentos.',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  const handleFeedback = (messageId: string, type: 'up' | 'down') => {
    setFeedbackGiven((prev) => ({ ...prev, [messageId]: type }));
    // Future: POST feedback to /api/chat/medical
  };

  // Only the welcome message present?
  const isConversationEmpty =
    messages.length <= 1 && messages[0]?.id === 'welcome';

  // ------- Render -------

  return (
    <div className="flex h-[calc(100vh-8rem)]">
      {/* ----------------------------------------------------------------- */}
      {/* Conversation history sidebar                                      */}
      {/* ----------------------------------------------------------------- */}

      {/* Backdrop for mobile */}
      {showHistory && (
        <div
          className="fixed inset-0 z-20 bg-black/30 lg:hidden"
          onClick={() => setShowHistory(false)}
        />
      )}

      <aside
        className={`
          fixed inset-y-0 left-0 z-30 w-72 border-r border-zinc-200 bg-white
          flex flex-col transition-transform duration-200
          lg:static lg:translate-x-0 lg:z-auto
          ${showHistory ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        {/* Sidebar header */}
        <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-3">
          <h2 className="text-sm font-semibold text-zinc-700">Historial</h2>
          <button
            onClick={startNewConversation}
            className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700 transition-colors"
          >
            <MessageSquarePlus className="h-3.5 w-3.5" />
            Nueva Consulta
          </button>
        </div>

        {/* Conversation list */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {conversations.length === 0 && (
            <p className="px-3 py-6 text-center text-xs text-zinc-400">
              Sin conversaciones previas
            </p>
          )}
          {conversations.map((conv) => (
            <button
              key={conv.id}
              onClick={() => loadConversation(conv.id)}
              className={`w-full rounded-lg px-3 py-2.5 text-left transition-colors ${
                conversationId === conv.id
                  ? 'bg-emerald-50 border border-emerald-200'
                  : 'hover:bg-zinc-50 border border-transparent'
              }`}
            >
              <p className="truncate text-sm font-medium text-zinc-800">
                {conv.titulo}
              </p>
              <p className="mt-0.5 truncate text-xs text-zinc-400">
                {conv.ultimo_mensaje}
              </p>
              <p className="mt-0.5 text-[10px] text-zinc-300">
                {conv.timestamp
                  ? new Date(conv.timestamp).toLocaleDateString('es-CL', {
                      day: '2-digit',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                    })
                  : ''}
              </p>
            </button>
          ))}
        </div>
      </aside>

      {/* ----------------------------------------------------------------- */}
      {/* Main chat area                                                    */}
      {/* ----------------------------------------------------------------- */}
      <div className="flex flex-1 flex-col min-w-0">
        {/* Header with warning */}
        <div className="shrink-0 border-b border-zinc-200 bg-white px-4 py-3">
          <div className="flex items-center gap-3">
            {/* Mobile sidebar toggle */}
            <button
              onClick={() => setShowHistory((v) => !v)}
              className="rounded-lg p-1.5 text-zinc-500 hover:bg-zinc-100 lg:hidden"
            >
              {showHistory ? (
                <PanelLeftClose className="h-5 w-5" />
              ) : (
                <PanelLeftOpen className="h-5 w-5" />
              )}
            </button>

            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-100">
              <HeartPulse className="h-5 w-5 text-emerald-600" />
            </div>
            <div className="min-w-0">
              <h1 className="text-lg font-bold text-zinc-900">Ayuda Médica</h1>
              <p className="text-xs text-zinc-500">
                Asistente de salud con inteligencia artificial
              </p>
            </div>
          </div>

          {/* Warning banner */}
          <div className="mt-3 flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5">
            <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
            <p className="text-xs text-amber-800">
              Este asistente no reemplaza la consulta médica profesional. En caso
              de emergencia, llame al{' '}
              <span className="font-bold">131</span>.
            </p>
          </div>
        </div>

        {/* Messages area */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 bg-white">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {/* Assistant avatar */}
              {msg.role === 'assistant' && (
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-100">
                  <Bot className="h-4 w-4 text-emerald-600" />
                </div>
              )}

              <div className="max-w-[75%] flex flex-col">
                <div
                  className={`rounded-2xl px-4 py-2.5 ${
                    msg.role === 'user'
                      ? 'bg-emerald-600 text-white rounded-br-sm'
                      : 'bg-zinc-100 text-zinc-900 rounded-bl-sm'
                  }`}
                >
                  {msg.role === 'assistant'
                    ? renderFormattedContent(msg.content)
                    : <p className="text-sm whitespace-pre-line">{msg.content}</p>}
                </div>

                {/* Timestamp */}
                <span
                  className={`mt-1 text-[10px] text-zinc-400 ${
                    msg.role === 'user' ? 'text-right' : 'text-left'
                  }`}
                >
                  {msg.timestamp.toLocaleTimeString('es-CL', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>

                {/* Feedback buttons for assistant messages */}
                {msg.role === 'assistant' && msg.id !== 'welcome' && (
                  <div className="mt-1 flex gap-1">
                    <button
                      onClick={() => handleFeedback(msg.id, 'up')}
                      className={`rounded p-1 transition-colors ${
                        feedbackGiven[msg.id] === 'up'
                          ? 'text-emerald-600 bg-emerald-50'
                          : 'text-zinc-300 hover:text-zinc-500 hover:bg-zinc-50'
                      }`}
                      aria-label="Me fue útil"
                    >
                      <ThumbsUp className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => handleFeedback(msg.id, 'down')}
                      className={`rounded p-1 transition-colors ${
                        feedbackGiven[msg.id] === 'down'
                          ? 'text-red-500 bg-red-50'
                          : 'text-zinc-300 hover:text-zinc-500 hover:bg-zinc-50'
                      }`}
                      aria-label="No me fue útil"
                    >
                      <ThumbsDown className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}
              </div>

              {/* User avatar */}
              {msg.role === 'user' && (
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-600">
                  <User className="h-4 w-4 text-white" />
                </div>
              )}
            </div>
          ))}

          {/* Typing indicator */}
          {isTyping && <TypingIndicator />}

          <div ref={messagesEndRef} />
        </div>

        {/* Quick action buttons (shown when conversation is empty) */}
        {isConversationEmpty && !isTyping && (
          <div className="shrink-0 border-t border-zinc-100 bg-white px-4 py-3">
            <p className="mb-2 text-xs font-medium text-zinc-500">
              Consultas rápidas
            </p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {quickActions.map((action) => {
                const Icon = action.icon;
                return (
                  <button
                    key={action.label}
                    onClick={() => sendMessage(action.label)}
                    disabled={isTyping}
                    className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 text-left text-xs font-medium transition-colors disabled:opacity-50 ${action.bgColor}`}
                  >
                    <Icon className={`h-4 w-4 shrink-0 ${action.color}`} />
                    <span className="text-zinc-700">{action.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Input bar */}
        <div className="shrink-0 border-t border-zinc-200 bg-white px-4 py-3">
          <form onSubmit={handleSubmit} className="flex gap-2">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Escribe tu consulta médica..."
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
          </form>
        </div>

        {/* Emergency banner */}
        <div className="shrink-0 bg-red-50 border-t border-red-200 px-4 py-2.5">
          <div className="flex items-center justify-center gap-2 flex-wrap">
            <Phone className="h-3.5 w-3.5 text-red-600 shrink-0" />
            <p className="text-[11px] font-semibold text-red-800 text-center">
              Emergencias: 131 (Ambulancia) · 132 (Bomberos) · 133 (Carabineros) · Salud Responde: 600 360 7777
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
