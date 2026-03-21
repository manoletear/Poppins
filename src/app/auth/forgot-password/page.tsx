'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Loader2, ArrowLeft } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const supabase = createClient();

      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      });

      if (resetError) {
        setError(resetError.message);
        setLoading(false);
        return;
      }

      setSuccess(true);
    } catch {
      setError('Ocurrió un error inesperado. Intenta nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="max-w-md w-full rounded-2xl border border-zinc-200 bg-white shadow-lg p-8">
        {/* Logo */}
        <div className="text-center">
          <h2 className="text-3xl font-bold text-zinc-900">Poppins</h2>
          <p className="text-sm text-zinc-500 mt-1">ERP RRHH Chile</p>
        </div>

        {/* Title */}
        <h1 className="text-xl font-bold text-zinc-900 mt-8">Recuperar Contraseña</h1>
        <p className="text-sm text-zinc-500 mt-1">
          Ingresa tu email y te enviaremos un enlace para restablecer tu contraseña.
        </p>

        {/* Error Banner */}
        {error && (
          <div className="mt-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Success Message */}
        {success ? (
          <div className="mt-6">
            <div className="rounded-lg bg-green-50 border border-green-200 px-4 py-4 text-center">
              <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-green-100 mb-3">
                <svg className="h-5 w-5 text-green-600" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
              </div>
              <p className="text-sm font-medium text-green-800">¡Email enviado!</p>
              <p className="text-sm text-green-700 mt-1">
                Revisa tu email para restablecer tu contraseña. Si no lo ves, revisa tu carpeta de spam.
              </p>
            </div>

            <Link
              href="/auth/login"
              className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-zinc-200 bg-white py-3 text-sm font-medium text-zinc-700 hover:bg-zinc-50 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Volver a Iniciar Sesión
            </Link>
          </div>
        ) : (
          <>
            {/* Form */}
            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-zinc-700 mb-1">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent"
                  placeholder="tu@email.com"
                  disabled={loading}
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-zinc-900 text-white rounded-lg py-3 text-sm font-medium hover:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  'Enviar enlace de recuperación'
                )}
              </button>
            </form>

            {/* Back to login */}
            <p className="mt-6 text-center">
              <Link
                href="/auth/login"
                className="inline-flex items-center gap-1 text-sm text-zinc-600 hover:text-zinc-900 underline-offset-4 hover:underline"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Volver a Iniciar Sesión
              </Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
