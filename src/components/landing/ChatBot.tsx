"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, X, Send, Bot, User, Loader2 } from "lucide-react";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

// Convert markdown links [text](url) to <a> tags
function renderMarkdownLinks(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(
      /\[([^\]]+)\]\(([^)]+)\)/g,
      '<a href="$2" class="underline font-semibold hover:opacity-80" target="_self">$1</a>'
    );
}

// Quick-reply suggestions shown at start
const QUICK_REPLIES = [
  "Quiero saber los precios",
  "Como funciona Poppins?",
  "Necesito ayuda con mi cuenta",
  "Quiero hablar con alguien",
];

export function ChatBot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [hasGreeted, setHasGreeted] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Show greeting when chat opens for the first time
  useEffect(() => {
    if (isOpen && !hasGreeted) {
      setHasGreeted(true);
      setMessages([
        {
          id: "greeting",
          role: "assistant",
          content:
            "Hola! Soy el asistente de Poppins. Puedo ayudarte con precios, funcionalidades, o cualquier duda sobre nuestra plataforma. En que te puedo ayudar?",
          timestamp: new Date(),
        },
      ]);
    }
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [isOpen, hasGreeted]);

  const sendMessage = async (text: string) => {
    if (!text.trim() || isLoading) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: "user",
      content: text.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

    try {
      const history = messages
        .filter((m) => m.id !== "greeting" || m.role === "assistant")
        .map((m) => ({ role: m.role, content: m.content }));

      const res = await fetch("/api/chat/landing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text.trim(),
          sessionId,
          history,
        }),
      });

      const data = await res.json();

      if (data.sessionId) setSessionId(data.sessionId);

      const assistantMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: data.response || "Lo siento, hubo un error. Intenta de nuevo.",
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: "Error de conexion. Intenta de nuevo en un momento.",
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  return (
    <>
      {/* Floating button */}
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => setIsOpen(true)}
            className="fixed bottom-6 right-6 z-50 w-16 h-16 bg-poppins-pink text-white rounded-full shadow-2xl flex items-center justify-center hover:bg-poppins-pink/90 transition-colors"
            aria-label="Abrir chat"
          >
            <MessageCircle className="w-7 h-7" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Chat window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-6 right-6 z-50 w-[380px] max-w-[calc(100vw-2rem)] h-[520px] max-h-[calc(100vh-3rem)] bg-white rounded-3xl shadow-2xl border border-gray-100 flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-poppins-navy to-poppins-pink px-5 py-4 flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-white/20 rounded-full flex items-center justify-center">
                  <Bot className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-white font-bold text-sm">Poppins Chat</p>
                  <p className="text-white/70 text-xs">Responde al instante</p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="text-white/70 hover:text-white transition-colors"
                aria-label="Cerrar chat"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex gap-2 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  {msg.role === "assistant" && (
                    <div className="w-7 h-7 rounded-full bg-poppins-navy/10 flex items-center justify-center flex-shrink-0 mt-1">
                      <Bot className="w-4 h-4 text-poppins-navy" />
                    </div>
                  )}
                  <div
                    className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                      msg.role === "user"
                        ? "bg-poppins-pink text-white rounded-br-md"
                        : "bg-gray-100 text-poppins-navy rounded-bl-md"
                    }`}
                    dangerouslySetInnerHTML={{ __html: renderMarkdownLinks(msg.content) }}
                  />
                  {msg.role === "user" && (
                    <div className="w-7 h-7 rounded-full bg-poppins-pink/10 flex items-center justify-center flex-shrink-0 mt-1">
                      <User className="w-4 h-4 text-poppins-pink" />
                    </div>
                  )}
                </div>
              ))}

              {isLoading && (
                <div className="flex gap-2 justify-start">
                  <div className="w-7 h-7 rounded-full bg-poppins-navy/10 flex items-center justify-center flex-shrink-0">
                    <Bot className="w-4 h-4 text-poppins-navy" />
                  </div>
                  <div className="bg-gray-100 px-4 py-3 rounded-2xl rounded-bl-md">
                    <Loader2 className="w-4 h-4 animate-spin text-poppins-navy/50" />
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Quick replies (only if no user messages yet) */}
            {messages.length <= 1 && !isLoading && (
              <div className="px-4 pb-2 flex flex-wrap gap-1.5">
                {QUICK_REPLIES.map((text) => (
                  <button
                    key={text}
                    onClick={() => sendMessage(text)}
                    className="text-xs px-3 py-1.5 rounded-full border border-poppins-pink/30 text-poppins-pink hover:bg-poppins-pink hover:text-white transition-colors"
                  >
                    {text}
                  </button>
                ))}
              </div>
            )}

            {/* Input */}
            <div className="border-t border-gray-100 px-4 py-3 flex gap-2 flex-shrink-0">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Escribe tu mensaje..."
                className="flex-1 bg-gray-50 rounded-full px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-poppins-pink/30 text-poppins-navy placeholder:text-gray-400"
                disabled={isLoading}
              />
              <button
                onClick={() => sendMessage(input)}
                disabled={!input.trim() || isLoading}
                className="w-10 h-10 bg-poppins-pink text-white rounded-full flex items-center justify-center hover:bg-poppins-pink/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                aria-label="Enviar mensaje"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
