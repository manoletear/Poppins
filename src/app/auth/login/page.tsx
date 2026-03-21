'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const supabase = createClient();

      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        setError(signInError.message);
        setLoading(false);
        return;
      }

      if (!data.user) {
        setError('No se pudo iniciar sesión. Intenta nuevamente.');
        setLoading(false);
        return;
      }

      // Fetch user profile to determine redirect
      const { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .select('rol')
        .eq('auth_user_id', data.user.id)
        .single();

      if (profileError || !profile) {
        // Default redirect if no profile found
        router.push('/dashboard');
        return;
      }

      switch (profile.rol) {
        case 'admin':
          router.push('/admin');
          break;
        case 'empleador':
          router.push('/empresa');
          break;
        case 'empleado':
          router.push('/portal');
          break;
        default:
          router.push('/dashboard');
      }
    } catch {
      setError('Ocurrió un error inesperado. Intenta nuevamente.');
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
        <h1 className="text-xl font-bold text-zinc-900 mt-8">Iniciar Sesión</h1>

        {/* Error Banner */}
        {error && (
          <div className="mt-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          {/* Email */}
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

          {/* Password */}
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-zinc-700 mb-1">
              Contraseña
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border border-zinc-300 px-3 py-2.5 pr-10 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent"
                placeholder="Tu contraseña"
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {/* Remember me & Forgot password */}
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="h-4 w-4 rounded border-zinc-300 text-zinc-900 focus:ring-zinc-900"
              />
              <span className="text-sm text-zinc-600">Recordarme</span>
            </label>
            <Link
              href="/auth/forgot-password"
              className="text-sm text-zinc-600 hover:text-zinc-900 underline-offset-4 hover:underline"
            >
              ¿Olvidaste tu contraseña?
            </Link>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-zinc-900 text-white rounded-lg py-3 text-sm font-medium hover:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Iniciando sesión...
              </>
            ) : (
              'Iniciar Sesión'
            )}
          </button>
        </form>

        {/* Footer */}
        <div className="mt-6 space-y-4">
          <p className="text-center text-sm text-zinc-600">
            ¿No tienes cuenta?{' '}
            <Link
              href="/auth/register"
              className="font-medium text-zinc-900 hover:underline underline-offset-4"
            >
              Regístrate
            </Link>
          </p>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-zinc-200" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-white px-2 text-zinc-400">o</span>
            </div>
          </div>

          <p className="text-center">
            <Link
              href="/"
              className="text-sm text-zinc-500 hover:text-zinc-700 underline-offset-4 hover:underline"
            >
              Volver al inicio
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
