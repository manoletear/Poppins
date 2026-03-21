'use client';

import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { User } from '@supabase/supabase-js';

interface UserProfile {
  id: string;
  auth_user_id: string;
  email: string;
  nombre: string;
  apellido: string | null;
  rol: 'admin' | 'empleador' | 'empleado';
  empleador_id: string | null;
  trabajador_id: string | null;
  onboarding_completado: boolean;
  avatar_url: string | null;
}

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  error: string | null;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
  error: null,
  signOut: async () => {},
  refreshProfile: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const supabase = createClient();

  const loadProfile = useCallback(async (userId: string) => {
    try {
      const { data, error: profileError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('auth_user_id', userId)
        .single();

      if (profileError) {
        console.error('Error loading profile:', profileError.message);
        // Profile might not exist yet (Google OAuth first login, trigger delay)
        // Create a basic profile from auth user data
        const { data: { user: authUser } } = await supabase.auth.getUser();
        if (authUser) {
          setProfile({
            id: '',
            auth_user_id: userId,
            email: authUser.email || '',
            nombre: authUser.user_metadata?.full_name || authUser.user_metadata?.nombre || authUser.email?.split('@')[0] || 'Usuario',
            apellido: authUser.user_metadata?.apellido || null,
            rol: (authUser.user_metadata?.rol as 'admin' | 'empleador' | 'empleado') || 'empleador',
            empleador_id: null,
            trabajador_id: null,
            onboarding_completado: false,
            avatar_url: authUser.user_metadata?.avatar_url || null,
          });
        }
        return;
      }

      setProfile(data);
    } catch (e) {
      console.error('Profile load error:', e);
      setError('Error al cargar perfil');
    }
  }, [supabase]);

  const refreshProfile = useCallback(async () => {
    if (user) await loadProfile(user.id);
  }, [user, loadProfile]);

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      try {
        const { data: { user: currentUser } } = await supabase.auth.getUser();
        if (!mounted) return;

        setUser(currentUser);
        if (currentUser) {
          await loadProfile(currentUser.id);
        }
      } catch (e) {
        console.error('Auth init error:', e);
        if (mounted) setError('Error de autenticación');
      } finally {
        if (mounted) setLoading(false);
      }
    };

    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (!mounted) return;
        const currentUser = session?.user ?? null;
        setUser(currentUser);
        if (currentUser) {
          await loadProfile(currentUser.id);
        } else {
          setProfile(null);
        }
        setLoading(false);
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [supabase, loadProfile]);

  const signOut = useCallback(async () => {
    // Redirect immediately, don't wait for Supabase
    setUser(null);
    setProfile(null);
    window.location.href = '/auth/login';
    // Fire and forget
    supabase.auth.signOut().catch(() => {});
  }, [supabase]);

  return (
    <AuthContext.Provider value={{ user, profile, loading, error, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
